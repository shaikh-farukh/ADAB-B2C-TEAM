import pool from '../Config/database.js';

async function migrate() {
  console.log("🚀 Starting KYB & Tokens Migration...");

  try {
    // 1. Add refresh_token and google_id to manage_b_to_b_userdetail
    console.log("Adding columns to manage_b_to_b_userdetail...");
    await pool.query(`
      ALTER TABLE manage_b_to_b_userdetail
      ADD COLUMN IF NOT EXISTS refresh_token TEXT,
      ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
    `);
    console.log("✅ Columns added.");

    // 2. Create manage_b2b_kyb_requests table
    console.log("Creating manage_b2b_kyb_requests table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS manage_b2b_kyb_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES manage_b_to_b_userdetail(id) ON DELETE CASCADE,
        company_name VARCHAR(255) NOT NULL,
        registration_number VARCHAR(100),
        tax_id VARCHAR(100),
        document_url TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        rejection_reason TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP,
        reviewed_by INTEGER
      );
    `);
    console.log("✅ Table created.");

    console.log("🎉 Migration completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();
