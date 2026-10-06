import pool from '../Config/database.js';

const addInternationalFields = async () => {
  try {
    console.log('🚀 Starting migration to add international profile fields...');

    await pool.query(`
      ALTER TABLE manage_b_to_b_userdetail 
      ADD COLUMN IF NOT EXISTS vat_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS export_hs_code VARCHAR(100),
      ADD COLUMN IF NOT EXISTS preferred_currency VARCHAR(10) DEFAULT 'INR',
      ADD COLUMN IF NOT EXISTS market_scope VARCHAR(50) DEFAULT 'DOMESTIC';
    `);
    console.log('✅ Added international fields to manage_b_to_b_userdetail.');

    console.log('🎉 Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

addInternationalFields();
