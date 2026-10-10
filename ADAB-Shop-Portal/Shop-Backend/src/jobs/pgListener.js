const { Pool } = require('pg');
const pool = require('../../db');
const socketConfig = require('../config/socket');

/**
 * PostgreSQL Event Listener
 * 
 * Listens for NOTIFY events from the database triggers.
 * Crucially, listens to `new_notification` to bridge DB inserts to Socket.IO.
 */
async function startListening() {
  let client;
  try {
    // We need a dedicated client for LISTEN since it stays open indefinitely
    client = await pool.connect();
    
    client.on('error', (err) => {
      console.error('📡 [pgListener] Database connection error:', err.message);
      // Release client safely
      try { client.release(true); } catch (e) {}
      // Attempt reconnect after 5 seconds
      setTimeout(startListening, 5000);
    });

    // Start listening on the channels
    await client.query('LISTEN new_notification');
    await client.query('LISTEN listing_status_change');
    await client.query('LISTEN order_status_change');
    await client.query('LISTEN kyc_status_change');
    await client.query('LISTEN payout_status_change');
    console.log('📡 Connected to PostgreSQL LISTEN/NOTIFY channels: new_notification, listing, order, kyc, payout');

    // Handle notifications directly from the DB
    client.on('notification', async (msg) => {
      try {
        const payload = JSON.parse(msg.payload);

        // ==========================================
        // 1. Core Notification Delivery
        // ==========================================
        if (msg.channel === 'new_notification') {
          // This is the single source of truth for Socket.IO pushes.
          // It fires whenever ANY service inserts into the notifications table.
          const notification = payload; // The full row from DB
          
          try {
            const io = socketConfig.getIO();
            // Emit only to the specific seller's room
            io.to(notification.user_id).emit('notification', notification);
            console.log(`[Socket] Delivered notification to user ${notification.user_id}`);
          } catch (err) {
            // socket.io might not be initialized yet during startup
            console.warn('[Socket] Could not deliver notification:', err.message);
          }
          return; // Done
        }

        // ==========================================
        // 2. Legacy Domain Event Handlers
        // ==========================================
        let storeId = payload.new_data?.store_id || payload.old_data?.store_id;
        let sellerId = payload.new_data?.seller_id || payload.old_data?.seller_id;
        
        // If we only have storeId (e.g. from seller_orders), resolve the userId dynamically
        if (!sellerId && storeId) {
          const notificationProducer = require('../services/notificationProducer');
          sellerId = await notificationProducer.resolveUserIdFromStore(storeId);
        }
        
        if (!sellerId) return;

        let title = '';
        let message = '';
        let type = 'GENERAL';

        const getChanges = (oldData, newData) => {
          if (!oldData || !newData) return [];
          const ignoredColumns = ['updated_at', 'created_at', 'id'];
          const changes = [];
          for (const key of Object.keys(newData)) {
            if (ignoredColumns.includes(key)) continue;
            const oldVal = oldData[key] ?? '';
            const newVal = newData[key] ?? '';
            if (oldVal !== newVal) {
              changes.push({ column: key, from: oldVal, to: newVal });
            }
          }
          return changes;
        };

        if (msg.channel === 'listing_status_change') {
          const changes = getChanges(payload.old_data, payload.new_data);
          if (changes.length > 0) {
            title = 'Listing Updated';
            const changeTexts = changes.map(c => `${c.column.replace(/_/g, ' ')} changed to ${c.to}`).join(', ');
            message = `Your product "${payload.new_data.title || 'Listing'}" was updated: ${changeTexts}.`;
            type = 'GENERAL';
          }
        } 
        else if (msg.channel === 'order_status_change') {
          type = 'ORDER_STATUS';
          if (payload.event === 'INSERT') {
            title = 'New Order Received!';
            message = `You received a new order. Current status: ${payload.new_data.status}.`;
          } else {
            const changes = getChanges(payload.old_data, payload.new_data);
            if (changes.length > 0) {
              title = 'Order Updated';
              const changeTexts = changes.map(c => `${c.column.replace(/_/g, ' ')} changed to ${c.to}`).join(', ');
              message = `Order #${payload.new_data.id} was updated: ${changeTexts}.`;
            }
          }
        } 
        else if (msg.channel === 'kyc_status_change') {
          const changes = getChanges(payload.old_data, payload.new_data);
          if (changes.length > 0) {
            title = `Profile Updated`;
            const changeTexts = changes.map(c => `${c.column.replace(/_/g, ' ')} changed to ${c.to}`).join(', ');
            message = `Your profile was updated: ${changeTexts}.`;
            type = 'KYC_UPDATE';
          }
        } 
        else if (msg.channel === 'payout_status_change') {
          type = 'GENERAL';
          const changes = getChanges(payload.old_data, payload.new_data);
          if (changes.length > 0) {
            title = `Payout Updated`;
            const changeTexts = changes.map(c => `${c.column.replace(/_/g, ' ')} changed to ${c.to}`).join(', ');
            message = `Your payout of ₹${payload.new_data.net_payout_amount} was updated: ${changeTexts}.`;
          }
        }

        // Emit via canonical producer to ensure duplicate suppression and consistent formatting
        if (title && message) {
          const notificationProducer = require('../services/notificationProducer');
          await notificationProducer.notify(sellerId, title, message, type);
        }

      } catch (err) {
        console.error(`Error processing DB notification for channel ${msg.channel}:`, err);
      }
    });

  } catch (err) {
    console.error('📡 [pgListener] Error setting up pgListener:', err.message);
    // Attempt reconnect after 5 seconds
    setTimeout(startListening, 5000);
  }
}

startListening();
