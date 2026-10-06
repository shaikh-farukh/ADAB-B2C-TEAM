import pool from '../Config/database.js';

const migrationSql = `
CREATE TABLE IF NOT EXISTS manage_b_to_b_audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    user_role VARCHAR(50),
    action VARCHAR(255) NOT NULL,
    resource VARCHAR(255),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE manage_b_to_b_audit_logs
    ADD COLUMN IF NOT EXISTS user_role VARCHAR(50),
    ADD COLUMN IF NOT EXISTS resource VARCHAR(255),
    ADD COLUMN IF NOT EXISTS resource_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS details JSONB;

CREATE INDEX IF NOT EXISTS idx_audit_user_id ON manage_b_to_b_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON manage_b_to_b_audit_logs(resource, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON manage_b_to_b_audit_logs(created_at);
`;

export const runMigration = async () => {
  try {
    console.log('Running migration: Create manage_b_to_b_audit_logs table...');
    await pool.query(migrationSql);
    console.log('✅ Audit logs table created successfully.');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
};

// If run directly
if (process.argv[1]?.endsWith('create_audit_logs.js')) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default runMigration;
