import pool from '../Config/database.js';

const enhancePayments = async () => {
  try {
    console.log('🚀 Starting migration to add payment_method column...');

    await pool.query(`
      ALTER TABLE manage_b_to_b_orders 
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'CASH';
    `);
    console.log('✅ Added payment_method to manage_b_to_b_orders.');

    console.log('🎉 Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

enhancePayments();
