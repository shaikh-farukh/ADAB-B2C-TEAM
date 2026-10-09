const pool = require('./db');
async function run() {
  const sellerUserId = '00000000-0000-0000-0000-000000000001';
  const users = await pool.query('SELECT id FROM users WHERE id != $1 LIMIT 1', [sellerUserId]);
  
  if (users.rows.length) {
    const customerId = users.rows[0].id;
    
    // Create thread
    const t = await pool.query('INSERT INTO message_threads (participant_a, participant_b, subject) VALUES ($1, $2, \'Support\') RETURNING id', [sellerUserId, customerId]);
    const tId = t.rows[0].id;
    
    // Customer asks question
    await pool.query('INSERT INTO messages (thread_id, sender_id, body, is_read, created_at) VALUES ($1, $2, $3, false, NOW() - interval \'5 min\')', [tId, customerId, 'Hello, I need help with my order!']);
    
    console.log('Seeded thread for mock user: ', tId);
  } else {
    console.log('Could not find user');
  }
}
run().catch(console.error).finally(()=>pool.end());
