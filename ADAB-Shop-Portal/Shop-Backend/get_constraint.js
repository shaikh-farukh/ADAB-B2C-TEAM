const pool = require('./db');

async function getPromoConstraint() {
  try {
    const res = await pool.query(`
      SELECT pg_get_constraintdef(c.oid) AS constraint_def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'promotions';
    `);
    console.log("Promotions constraints:", res.rows);
  } finally {
    pool.end();
  }
}
getPromoConstraint();
