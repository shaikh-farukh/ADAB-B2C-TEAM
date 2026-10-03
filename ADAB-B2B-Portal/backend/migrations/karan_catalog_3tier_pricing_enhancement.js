import pool from '../Config/database.js';
import logger from '../utils/logger.js';

export const up = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    logger.info('Starting Karan Chauhan Catalog & 3-Tier Pricing Enhancement Migration...');

    // 1. Ensure all 3-Tier pricing, packaging unit, currency, and compliance columns exist
    await client.query(`
      ALTER TABLE manage_manufacturer_products 
      ADD COLUMN IF NOT EXISTS manufacturer_price NUMERIC(12, 2),
      ADD COLUMN IF NOT EXISTS distributor_price NUMERIC(12, 2),
      ADD COLUMN IF NOT EXISTS retail_price NUMERIC(12, 2),
      ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'Piece',
      ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT '₹',
      ADD COLUMN IF NOT EXISTS export_hs_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5, 2),
      ADD COLUMN IF NOT EXISTS international_selling BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS international_price NUMERIC(12, 2);
    `);

    // 2. Populate legacy data fallbacks: manufacturer_price <= distributor_price <= retail_price
    await client.query(`
      UPDATE manage_manufacturer_products
      SET 
        retail_price = COALESCE(retail_price, price, 0.00),
        distributor_price = COALESCE(distributor_price, ROUND(COALESCE(retail_price, price, 0.00) * 0.85, 2)),
        manufacturer_price = COALESCE(manufacturer_price, ROUND(COALESCE(retail_price, price, 0.00) * 0.70, 2)),
        unit = COALESCE(unit, 'Piece'),
        currency = COALESCE(currency, '₹')
      WHERE retail_price IS NULL OR distributor_price IS NULL OR manufacturer_price IS NULL OR currency IS NULL;
    `);

    await client.query('COMMIT');
    logger.info('✅ Karan Catalog & 3-Tier Pricing Enhancement Migration completed successfully.');
    console.log('✅ Migration karan_catalog_3tier_pricing_enhancement.js executed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('❌ Karan Catalog Migration failed:', error);
    console.error('❌ Migration karan_catalog_3tier_pricing_enhancement.js failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

up().then(() => process.exit(0)).catch(() => process.exit(1));
