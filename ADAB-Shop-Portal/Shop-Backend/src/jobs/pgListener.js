const { Pool } = require('pg');
const pool = require('../../db');
const notificationService = require('../services/notification');

async function startListening() {
  try {
    // We need a dedicated client for LISTEN since it stays open indefinitely
    const client = await pool.connect();
    
    // Start listening on the channels
    await client.query('LISTEN listing_status_change');
    await client.query('LISTEN order_status_change');
    await client.query('LISTEN kyc_status_change');
    await client.query('LISTEN payout_status_change');
    console.log('📡 Connected to PostgreSQL LISTEN/NOTIFY channels: listing, order, kyc, payout');

    // Handle notifications directly from the DB
    client.on('notification', async (msg) => {
      try {
        const payload = JSON.parse(msg.payload);
        const sellerId = payload.seller_id;
        
        let title = '';
        let message = '';
        let type = 'GENERAL';

        // Helper to find what changed
        const getChanges = (oldData, newData) => {
          if (!oldData || !newData) return [];
          const ignoredColumns = ['updated_at', 'created_at', 'id'];
          const changes = [];
          for (const key of Object.keys(newData)) {
            if (ignoredColumns.includes(key)) continue;
            // Handle null/undefined vs empty string gracefully
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
          }
        } 
        else if (msg.channel === 'payout_status_change') {
          type = 'FINANCE';
          const changes = getChanges(payload.old_data, payload.new_data);
          if (changes.length > 0) {
            title = `Payout Updated`;
            const changeTexts = changes.map(c => `${c.column.replace(/_/g, ' ')} changed to ${c.to}`).join(', ');
            message = `Your payout of ₹${payload.new_data.net_payout_amount} was updated: ${changeTexts}.`;
          }
        }

        // Send the dynamically generated notification if there are changes
        if (title && message) {
          await notificationService.createNotification(sellerId, title, message, type);
        }

      } catch (err) {
        console.error(`Error processing DB notification for channel ${msg.channel}:`, err);
      }
    });

  } catch (err) {
    console.error('Error setting up pgListener:', err);
  }
}

startListening();
