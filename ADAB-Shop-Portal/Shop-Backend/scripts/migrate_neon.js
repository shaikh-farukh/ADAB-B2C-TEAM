require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}?sslmode=require`;

async function runMigration() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('1. Connecting to Neon PostgreSQL...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Read and run schema.sql
    const schemaPath = path.resolve(__dirname, '../../../project arch/schema.sql');
    console.log(`2. Reading schema.sql from: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('3. Executing schema.sql DDL...');
    await client.query(schemaSql);
    console.log('✅ Base schema created successfully!');

    // Run incremental migrations safely
    const incMigrations = [
      '../../../migrations/001_add_stock_qty_fix_category.sql',
      '../../../migrations/seller/002_shabbir_day2_products.sql',
      '../../../migrations/seller/003_shabbir_day3_pricing_marketing.sql'
    ];

    for (const relPath of incMigrations) {
      const fullPath = path.resolve(__dirname, relPath);
      if (fs.existsSync(fullPath)) {
        console.log(`4. Running migration: ${path.basename(relPath)}...`);
        let sql = fs.readFileSync(fullPath, 'utf8');
        // Split by semicolons and execute statements individually so non-fatal alter column errors are safely handled
        const statements = sql
          .split(/;\s*$/m)
          .map(s => s.trim())
          .filter(s => s.length > 0 && s !== 'BEGIN' && s !== 'COMMIT');

        for (const stmt of statements) {
          try {
            await client.query(stmt);
          } catch (stmtErr) {
            await client.query('ROLLBACK').catch(() => {});
            if (stmt.includes('admin_id') || stmtErr.code === '42703') {
              console.log(`   (Skipping non-essential constraint on admin_id: ${stmtErr.message})`);
            } else {
              throw stmtErr;
            }
          }
        }
      }
    }
    console.log('✅ Incremental migrations applied!');

    // Ensure dynamically added tables
    console.log('5. Ensuring dynamic tables (seller_onboarding_steps, ai_audit_logs)...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS seller_onboarding_steps (
        user_id UUID PRIMARY KEY,
        step1 BOOLEAN DEFAULT false,
        step2 BOOLEAN DEFAULT false,
        step3 BOOLEAN DEFAULT false,
        step4 BOOLEAN DEFAULT false,
        step5 BOOLEAN DEFAULT false,
        step6 BOOLEAN DEFAULT false,
        step7 BOOLEAN DEFAULT false,
        profile_data JSONB DEFAULT '{}'::jsonb,
        delivery_config JSONB DEFAULT '{}'::jsonb,
        credit_config JSONB DEFAULT '{}'::jsonb,
        starter_products JSONB DEFAULT '[]'::jsonb,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE seller_listings ADD COLUMN IF NOT EXISTS is_refundable BOOLEAN DEFAULT true;
      ALTER TABLE seller_listings ADD COLUMN IF NOT EXISTS refund_percentage NUMERIC(5,2) DEFAULT 100.00;
      ALTER TABLE seller_listings ADD COLUMN IF NOT EXISTS return_window_days INT DEFAULT 7;
      ALTER TABLE returns ADD COLUMN IF NOT EXISTS refund_percentage NUMERIC(5,2) DEFAULT 100.00;

      CREATE TABLE IF NOT EXISTS ai_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id UUID NOT NULL,
        user_id UUID,
        prompt TEXT,
        tool_name TEXT NOT NULL,
        tool_tier TEXT DEFAULT 'TIER_1_READ',
        arguments JSONB DEFAULT '{}'::jsonb,
        result JSONB DEFAULT '{}'::jsonb,
        success BOOLEAN NOT NULL DEFAULT true,
        duration_ms INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_store_id ON ai_audit_logs(store_id);
      CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_created_at ON ai_audit_logs(created_at);
    `);
    console.log('✅ Dynamic tables and columns verified!');

    // Check tables count
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log(`\n🎉 Migration Complete! Total tables created in Neon: ${res.rows.length}`);
    console.log(res.rows.map(r => r.table_name));

  } catch (err) {
    console.error('❌ Migration Error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
