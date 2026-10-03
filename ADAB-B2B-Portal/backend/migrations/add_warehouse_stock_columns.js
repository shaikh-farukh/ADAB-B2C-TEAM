import pool from '../Config/database.js';

const migrationSql = `
ALTER TABLE manage_manufacturer_products
  ADD COLUMN IF NOT EXISTS warehouse_stock JSONB DEFAULT '{"north_hub": 0, "south_hub": 0, "central_hub": 0}'::jsonb,
  ADD COLUMN IF NOT EXISTS north_hub INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS south_hub INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS central_hub INTEGER DEFAULT 0;

-- Set initial values for products where warehouse total is 0 but stock_quantity > 0
UPDATE manage_manufacturer_products
SET
  central_hub = stock_quantity,
  warehouse_stock = jsonb_build_object('north_hub', 0, 'south_hub', 0, 'central_hub', stock_quantity)
WHERE (north_hub + south_hub + central_hub) = 0 AND stock_quantity > 0;
`;

export const runMigration = async () => {
  try {
    console.log('Running Warehouse Stock column migration on manage_manufacturer_products...');
    await pool.query(migrationSql);
    console.log('✅ Warehouse stock columns verified/added successfully.');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
};

// If run directly
if (process.argv[1]?.endsWith('add_warehouse_stock_columns.js')) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default runMigration;
