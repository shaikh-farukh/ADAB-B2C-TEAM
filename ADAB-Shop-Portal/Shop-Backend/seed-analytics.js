const pool = require('./db');
async function run() {
  const storeId = '00000000-0000-0000-0000-000000000001';
  for (let i = 0; i < 7; i++) {
    const orders = Math.floor(Math.random() * 5) + 1; // 1 to 5 orders per day
    for (let j = 0; j < orders; j++) {
      await pool.query(
        `INSERT INTO seller_orders (store_id, subtotal, status, created_at) 
         VALUES ($1, $2, $3, NOW() - INTERVAL '${i} days')`,
        [storeId, Math.floor(Math.random() * 5000) + 1000, 'COMPLETED']
      );
    }
  }
  console.log('Seeded analytics orders');
}
run().catch(console.error).finally(()=>pool.end());
