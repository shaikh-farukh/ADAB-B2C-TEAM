const pool = require('./db');
const { io } = require('socket.io-client');
require('dotenv').config();

async function runTest() {
  console.log('--- Starting Notification End-to-End Test ---');

  const userId = '00000000-0000-0000-0000-000000000001';
  
  // 1. Connect socket
  const socket = io('http://localhost:5003', {
    reconnectionDelayMax: 10000,
    auth: {
      userId: userId,
      storeId: userId // Mock storeId
    }
  });

  socket.on('connect', () => {
    console.log('✅ Client connected successfully');
  });

  socket.on('connect_error', (err) => {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  });

  socket.on('authenticated', (data) => {
    console.log('✅ Client authenticated:', data);
    
    // Once authenticated, insert a notification directly into DB
    insertTestNotification();
  });

  socket.on('notification', (msg) => {
    console.log('✅ Received Live Notification via Socket.IO:', msg.title);
    if (msg.title === 'Test DB Trigger Notification') {
      console.log('🎉 E2E TEST PASSED!');
      socket.disconnect();
      pool.end();
      process.exit(0);
    }
  });

  async function insertTestNotification() {
    try {
      console.log('Inserting notification into database...');
      const res = await pool.query(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES ($1, 'Test DB Trigger Notification', 'This should arrive via Socket.IO', 'GENERAL')
        RETURNING id
      `, [userId]);
      console.log('✅ Inserted notification with ID:', res.rows[0].id);
      
      // We'll wait 5 seconds max for it to arrive
      setTimeout(() => {
        console.error('❌ Timeout: Did not receive notification via socket');
        socket.disconnect();
        pool.end();
        process.exit(1);
      }, 5000);
    } catch (err) {
      console.error('Failed to insert notification:', err.message);
      process.exit(1);
    }
  }
}

runTest();
