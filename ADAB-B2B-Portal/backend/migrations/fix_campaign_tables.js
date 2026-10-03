import pool from '../Config/database.js';

const migrationSql = `
ALTER TABLE campaign_notifications
  ADD COLUMN IF NOT EXISTS campaign_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS target_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sent_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS targeting_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS target_ids JSONB,
  ADD COLUMN IF NOT EXISTS notification_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS target_audience VARCHAR(50),
  ADD COLUMN IF NOT EXISTS read_count INT DEFAULT 0;

ALTER TABLE campaign_deliveries
  RENAME COLUMN campaign_notification_id TO campaign_id;

ALTER TABLE campaign_deliveries
  RENAME COLUMN user_id TO shop_id;
`;

export const runMigration = async () => {
  try {
    console.log('Running migration: Fix campaign tables...');
    
    // Add columns
    await pool.query(`
      ALTER TABLE campaign_notifications
        ADD COLUMN IF NOT EXISTS campaign_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS target_count INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS sent_count INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS targeting_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS target_ids JSONB,
        ADD COLUMN IF NOT EXISTS notification_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS target_audience VARCHAR(50),
        ADD COLUMN IF NOT EXISTS read_count INT DEFAULT 0;
    `);

    // Rename campaign_notification_id -> campaign_id
    try {
      await pool.query(`ALTER TABLE campaign_deliveries RENAME COLUMN campaign_notification_id TO campaign_id;`);
    } catch (err) {
      if (!err.message.includes('does not exist')) throw err;
    }

    // Rename user_id -> shop_id
    try {
      await pool.query(`ALTER TABLE campaign_deliveries RENAME COLUMN user_id TO shop_id;`);
    } catch (err) {
      if (!err.message.includes('does not exist')) throw err;
    }

    console.log('✅ Campaign tables fixed successfully.');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
};

// If run directly
if (process.argv[1]?.endsWith('fix_campaign_tables.js')) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default runMigration;
