import pool from '../Config/database.js';

async function migrate() {
  console.log("🚀 Starting Connections Table Migration...");

  try {
    console.log("Creating manage_b_to_b_connections table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS manage_b_to_b_connections (
        id SERIAL PRIMARY KEY,
        requester_id INTEGER NOT NULL REFERENCES manage_b_to_b_userdetail(id) ON DELETE CASCADE,
        target_shop_id INTEGER NOT NULL REFERENCES manage_b_to_b_userdetail(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'PENDING',
        notes TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(requester_id, target_shop_id)
      );
    `);
    console.log("✅ Table manage_b_to_b_connections created.");

    console.log("🎉 Migration completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();
