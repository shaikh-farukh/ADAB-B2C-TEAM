import pool from '../Config/database.js';
import logger from '../utils/logger.js';

export const up = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    logger.info('Starting Track A 3-Tier Pricing, Unit, and Compliance columns migration...');

    // 1. Add manufacturer_price, distributor_price, retail_price, unit, and compliance columns if missing
    await client.query(`
      ALTER TABLE manage_manufacturer_products 
      ADD COLUMN IF NOT EXISTS manufacturer_price NUMERIC(12, 2),
      ADD COLUMN IF NOT EXISTS distributor_price NUMERIC(12, 2),
      ADD COLUMN IF NOT EXISTS retail_price NUMERIC(12, 2),
      ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'Piece',
      ADD COLUMN IF NOT EXISTS export_hs_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5, 2),
      ADD COLUMN IF NOT EXISTS international_selling BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS international_price NUMERIC(12, 2);
    `);

    // 2. Populate legacy data defaults:
    await client.query(`
      UPDATE manage_manufacturer_products
      SET 
        retail_price = COALESCE(retail_price, price),
        distributor_price = COALESCE(distributor_price, ROUND(price * 0.85, 2)),
        manufacturer_price = COALESCE(manufacturer_price, ROUND(price * 0.70, 2)),
        unit = COALESCE(unit, 'Piece')
      WHERE retail_price IS NULL OR distributor_price IS NULL OR manufacturer_price IS NULL;
    `);

    await client.query('COMMIT');
    logger.info('Track A 3-Tier Pricing, Unit & Compliance migration completed successfully.');
    console.log('✅ Track A migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Track A migration failed:', error);
    console.error('❌ Track A migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

up().then(() => process.exit(0)).catch(() => process.exit(1));
