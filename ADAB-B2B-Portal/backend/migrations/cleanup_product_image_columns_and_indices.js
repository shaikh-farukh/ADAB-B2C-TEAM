import pool from '../Config/database.js';
import logger from '../utils/logger.js';

export const up = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    logger.info('Running migration cleanup_product_image_columns_and_indices...');

    // Drop redundant legacy image columns if they exist
    await client.query(`
      ALTER TABLE manage_manufacturer_products 
      DROP COLUMN IF EXISTS image_url,
      DROP COLUMN IF EXISTS image;
    `);

    // Ensure category_id, subcategory_id, and sku columns exist
    await client.query(`
      ALTER TABLE manage_manufacturer_products 
      ADD COLUMN IF NOT EXISTS category_id INTEGER,
      ADD COLUMN IF NOT EXISTS subcategory_id INTEGER,
      ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
    `);

    // Add indexes for efficient queries on category_id, subcategory_id, and sku
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mmp_category_id ON manage_manufacturer_products(category_id);
      CREATE INDEX IF NOT EXISTS idx_mmp_subcategory_id ON manage_manufacturer_products(subcategory_id);
      CREATE INDEX IF NOT EXISTS idx_mmp_sku ON manage_manufacturer_products(sku);
    `);

    await client.query('COMMIT');
    logger.info('✅ Migration cleanup_product_image_columns_and_indices completed successfully.');
    console.log('✅ Migration cleanup_product_image_columns_and_indices.js executed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('❌ Migration cleanup_product_image_columns_and_indices.js failed:', error);
    console.error('❌ Migration cleanup_product_image_columns_and_indices.js failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

up().then(() => process.exit(0)).catch(() => process.exit(1));
