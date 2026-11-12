const pool = require('../db');

async function migrate() {
  const res = await pool.query(`
    UPDATE seller_listings 
    SET approval_status = 'APPROVED' 
    WHERE approval_status = 'PUBLISHED' 
    RETURNING id, title, approval_status;
  `);
  console.log(`✅ Migrated ${res.rows.length} listings from PUBLISHED to APPROVED:`);
  res.rows.forEach(r => console.log(`   - [${r.approval_status}] ${r.title} (${r.id})`));
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

