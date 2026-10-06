import pool from '../Config/database.js';

const addModifiedAtColumns = async () => {
  try {
    console.log('🚀 Starting migration to add missing modified_at columns...');

    // 1. Add modified_at to manage_manufacturer_products
    console.log('Adding modified_at to manage_manufacturer_products...');
    await pool.query(`
      ALTER TABLE manage_manufacturer_products
      ADD COLUMN IF NOT EXISTS modified_at TIMESTAMP;
    `);
    console.log('✅ Added to manage_manufacturer_products.');

    // 2. Add modified_at to manage_b_to_b_orders
    console.log('Adding modified_at to manage_b_to_b_orders...');
    await pool.query(`
      ALTER TABLE manage_b_to_b_orders
      ADD COLUMN IF NOT EXISTS modified_at TIMESTAMP;
    `);
    console.log('✅ Added to manage_b_to_b_orders.');

    console.log('🎉 Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

addModifiedAtColumns();
