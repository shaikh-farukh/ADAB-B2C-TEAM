import pool from '../Config/database.js';

async function migrate() {
  console.log("🚀 Starting Payment Mode Migration...");

  try {
    console.log("Adding payment_mode column to manage_b_to_b_orders...");
    await pool.query(`
      ALTER TABLE manage_b_to_b_orders
      ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50) DEFAULT 'CASH';
    `);
    console.log("✅ payment_mode column added to manage_b_to_b_orders.");

  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    pool.end();
  }
}

migrate();
