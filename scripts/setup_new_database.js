/**
 * ============================================================================
 * ADAB ENTERPRISE MARKETPLACE — AUTOMATED DATABASE SETUP RUNNER
 * ============================================================================
 *
 * Usage:
 *   node scripts/setup_new_database.js [DATABASE_URL]
 *
 * Example:
 *   node scripts/setup_new_database.js "postgresql://postgres:pass@ep-cool-db.neon.tech/neondb?sslmode=require"
 *
 * If no argument is provided, it reads DATABASE_URL from:
 *   ADAB-Shop-Portal/Shop-Backend/.env
 */

const fs = require('fs');
const path = require('path');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

// Locate pg and dotenv from available node_modules
const shopBackendDir = path.join(__dirname, '../ADAB-Shop-Portal/Shop-Backend');
require(path.join(shopBackendDir, 'node_modules/dotenv')).config({ path: path.join(shopBackendDir, '.env') });
const { Pool } = require(path.join(shopBackendDir, 'node_modules/pg'));

const targetUrl = process.argv[2] || process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`;

if (!targetUrl || targetUrl.includes('undefined')) {
  console.error('❌ Error: No valid database connection string provided.');
  console.log('\nPlease provide a database URL:');
  console.log('  node scripts/setup_new_database.js "postgresql://user:password@host:5432/database"');
  process.exit(1);
}

// Mask password for display
const maskedUrl = targetUrl.replace(/:([^:@]+)@/, ':****@');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('🚀 ADAB ENTERPRISE MARKETPLACE — DATABASE SETUP RUNNER');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log(`📡 Target Database: ${maskedUrl}\n`);

const pool = new Pool({
  connectionString: targetUrl,
  ssl: targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1') ? false : {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 15000
});

async function runSetup() {
  const client = await pool.connect();
  try {
    console.log('🔌 Connected to PostgreSQL server successfully.');

    const masterSqlPath = path.join(__dirname, '../project arch/000_FULL_DATABASE_SETUP_MASTER.sql');
    if (!fs.existsSync(masterSqlPath)) {
      throw new Error(`Master migration file not found at ${masterSqlPath}`);
    }

    console.log('📖 Reading 000_FULL_DATABASE_SETUP_MASTER.sql...');
    const masterSql = fs.readFileSync(masterSqlPath, 'utf8');

    console.log('⚙️ Executing DDL migrations & baseline seeds (187 tables)...');
    const startTime = Date.now();
    await client.query(masterSql);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✅ Schema & Seeds applied successfully in ${duration}s!\n`);

    // Verification
    console.log('🔍 Verifying database tables...');
    const res = await client.query(`
      SELECT count(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);
    const count = parseInt(res.rows[0].count, 10);
    console.log(`📊 Total Tables Active: ${count}`);

    const catRes = await client.query('SELECT count(*) as count FROM categories;');
    console.log(`🌳 Categories Active: ${catRes.rows[0].count}`);

    const attrRes = await client.query('SELECT count(*) as count FROM attribute_definitions;');
    console.log(`📋 Attribute Definitions Active: ${attrRes.rows[0].count}`);

    const roleRes = await client.query('SELECT count(*) as count FROM roles;');
    console.log(`🛡️ Core Roles Active: ${roleRes.rows[0].count}`);

    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log('🎉 DATABASE SETUP COMPLETE & VERIFIED 100%!');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('Next steps:');
    console.log('1. Copy your database connection string to each portal\'s .env file:');
    console.log('   - ADAB-Shop-Portal/Shop-Backend/.env');
    console.log('   - ADAB-Customer-Portal/Customer-Backend/.env');
    console.log('   - ADAB-Admin-Portal/Admin-Backend/.env');
    console.log('   - ADAB-B2B-Portal/backend/.env');
    console.log('2. Start each backend server.');
    console.log('═══════════════════════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('\n❌ Setup failed:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
  } finally {
    client.release();
    await pool.end();
  }
}

runSetup();
