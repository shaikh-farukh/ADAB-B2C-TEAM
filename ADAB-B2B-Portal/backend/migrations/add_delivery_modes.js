import pool from '../Config/database.js';

async function migrate() {
  console.log("🚀 Starting Delivery Modes Migration...");

  try {
    // 1. Create manage_b_to_b_delivery_configs table
    console.log("Creating manage_b_to_b_delivery_configs table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS manage_b_to_b_delivery_configs (
        id SERIAL PRIMARY KEY,
        shop_id INTEGER NOT NULL,
        mode VARCHAR(50) NOT NULL, -- IN_HOUSE, THIRD_PARTY, DISTRIBUTOR
        base_charge DECIMAL(10, 2) DEFAULT 0.00,
        per_km_charge DECIMAL(10, 2) DEFAULT 0.00,
        min_free_delivery_order_value DECIMAL(10, 2),
        max_delivery_radius_km DECIMAL(10, 2),
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ manage_b_to_b_delivery_configs created.");

    // 2. Add columns to manage_b_to_b_orders
    console.log("Adding delivery columns to manage_b_to_b_orders...");
    await pool.query(`
      ALTER TABLE manage_b_to_b_orders
      ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS delivery_charge DECIMAL(10, 2) DEFAULT 0.00;
    `);
    console.log("✅ Delivery columns added to manage_b_to_b_orders.");

  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    pool.end();
  }
}

migrate();
