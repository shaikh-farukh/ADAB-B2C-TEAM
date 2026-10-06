import pool from '../Config/database.js';

const migrationSql = `
ALTER TABLE manage_b_to_b_orders
  ADD COLUMN IF NOT EXISTS status_notes TEXT;
`;

export const runMigration = async () => {
  try {
    console.log('Running migration: Add status_notes to manage_b_to_b_orders...');
    await pool.query(migrationSql);
    console.log('✅ status_notes column verified/added successfully.');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
};

// If run directly
if (process.argv[1]?.endsWith('add_status_notes_to_orders.js')) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default runMigration;
