import pool from '../Config/database.js';

const migrationSql = `
ALTER TABLE manage_b_to_b_orders
  ADD COLUMN IF NOT EXISTS modified_by INTEGER;
`;

export const runMigration = async () => {
  try {
    console.log('Running migration: Add modified_by to manage_b_to_b_orders...');
    await pool.query(migrationSql);
    console.log('✅ modified_by column verified/added successfully.');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
};

// If run directly
if (process.argv[1]?.endsWith('add_modified_by.js')) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default runMigration;
