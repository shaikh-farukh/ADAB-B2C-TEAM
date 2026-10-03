import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import pool from './Config/database.js';

async function addMissingColumns() {
  try {
    const query = `
      ALTER TABLE manage_b_to_b_orders
      ADD COLUMN IF NOT EXISTS transporter_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS dispatch_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMP;
    `;
    await pool.query(query);
    console.log("Missing columns added successfully.");
  } catch (error) {
    console.error('Error adding columns:', error);
  } finally {
    pool.end();
  }
}

addMissingColumns();
