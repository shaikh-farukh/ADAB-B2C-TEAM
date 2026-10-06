import pool from '../Config/database.js';
import logger from '../utils/logger.js';

export const up = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    logger.info('Starting Ensure Distributor Access Migration...');

    // Auto-grant connected/active access relationship between existing default manufacturers and distributors
    await client.query(`
      INSERT INTO manage_b_to_b_request_access (
        manufacturer_id,
        email_distributer,
        manufacture_request,
        distributer_request,
        request_type,
        status,
        active
      )
      SELECT 
        m.id AS manufacturer_id,
        d.email AS email_distributer,
        1 AS manufacture_request,
        1 AS distributer_request,
        'CONNECTION' AS request_type,
        'APPROVED' AS status,
        true AS active
      FROM manage_b_to_b_userdetail m
      CROSS JOIN manage_b_to_b_userdetail d
      WHERE m.business_type_id = 1 
        AND d.business_type_id = 2
        AND m.deleted_at IS NULL 
        AND d.deleted_at IS NULL
      ON CONFLICT DO NOTHING;
    `);

    await client.query('COMMIT');
    logger.info('✅ Ensure Distributor Access Migration completed successfully.');
    console.log('✅ Migration ensure_distributor_access.js executed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('❌ Ensure Distributor Access Migration failed:', error);
    console.error('❌ Migration ensure_distributor_access.js failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

up().then(() => process.exit(0)).catch(() => process.exit(1));
