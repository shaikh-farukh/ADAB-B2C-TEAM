const { Pool } = require('pg');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const dotenv = require('dotenv');
dotenv.config();

const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`;

const pool = new Pool({
  connectionString,
  ssl: process.env.DB_SSL_MODE === 'disable' ? false : {
    rejectUnauthorized: false,
    servername: process.env.DB_HOST
  },
  max: 4,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 25000
});

pool.connect(async (err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to Shop Portal database:', err.message);
  } else {
    console.log('✅ Shop Portal database connected successfully');
    try {
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
      `);
    } catch (tableErr) {
      console.error('⚠️ Warning ensuring seller_onboarding_steps table:', tableErr.message);
    } finally {
      release();
    }
  }
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error on Shop Portal client:', err);
});

module.exports = pool;
