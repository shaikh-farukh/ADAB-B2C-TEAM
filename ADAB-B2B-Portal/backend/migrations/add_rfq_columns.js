import pool from '../Config/database.js';

const migrationSql = `
ALTER TABLE manage_b_to_b_request_access
  ADD COLUMN IF NOT EXISTS request_type VARCHAR(50) DEFAULT 'CONNECTION',
  ADD COLUMN IF NOT EXISTS distributor_id INTEGER,
  ADD COLUMN IF NOT EXISTS product_id INTEGER,
  ADD COLUMN IF NOT EXISTS product_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS target_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS counter_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS negotiation_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING';
`;

export const runMigration = async () => {
  try {
    console.log('Running RFQ column migration on manage_b_to_b_request_access...');
    await pool.query(migrationSql);
    console.log('✅ RFQ columns verified/added successfully.');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
};

// If run directly
if (process.argv[1]?.endsWith('add_rfq_columns.js')) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default runMigration;
