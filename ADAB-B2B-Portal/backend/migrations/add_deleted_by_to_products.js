import pool from '../Config/database.js';
import logger from '../utils/logger.js';

export const up = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    logger.info('Adding deleted_by column to manage_manufacturer_products if missing...');

    await client.query(`
      ALTER TABLE manage_manufacturer_products 
      ADD COLUMN IF NOT EXISTS deleted_by INTEGER;
    `);

    await client.query('COMMIT');
    logger.info('✅ Column deleted_by added successfully.');
    console.log('✅ Migration add_deleted_by_to_products.js executed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('❌ Migration add_deleted_by_to_products.js failed:', error);
    console.error('❌ Migration add_deleted_by_to_products.js failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

up().then(() => process.exit(0)).catch(() => process.exit(1));
