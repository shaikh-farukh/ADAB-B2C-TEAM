const path = require('path');
const dotenv = require('dotenv');

// Load environment variables reliably from backend directory, falling back to root
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const { Pool } = require('pg');
const net = require('net');

// Fixes the slow IPv6 fallback when connecting to a far-away database
if (net.setDefaultAutoSelectFamilyAttemptTimeout) {
  net.setDefaultAutoSelectFamilyAttemptTimeout(1000);
}

// Determine production-safe SSL settings with certificate verification
function getSslConfiguration() {
  const mode = (process.env.DB_SSL_MODE || '').toLowerCase().trim();
  const dbSsl = (process.env.DB_SSL || '').toLowerCase().trim();
  const rejectUnauthorizedEnv = process.env.DB_SSL_REJECT_UNAUTHORIZED;

  // Explicitly disabled
  if (mode === 'disable' || mode === 'false' || dbSsl === 'false' || dbSsl === 'disable') {
    return false;
  }

  // Insecure mode override (local testing / self-signed proxy only)
  if (mode === 'no-verify' || rejectUnauthorizedEnv === 'false') {
    return { rejectUnauthorized: false };
  }

  // Production-safe default: enable SSL with certificate verification
  const sslConfig = {
    rejectUnauthorized: true,
  };

  if (process.env.DB_CA_CERT) {
    sslConfig.ca = process.env.DB_CA_CERT;
  }

  return sslConfig;
}

const ssl = getSslConfiguration();

// Settings shared by both setups
const baseConfig = {
  max: Number(process.env.DB_MAX_CONNECTIONS) || 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  keepAlive: true,
};

const poolConfig = process.env.DATABASE_URL
  ? {
      ...baseConfig,
      connectionString: process.env.DATABASE_URL,
      ...(ssl !== undefined ? { ssl } : {})
    }
  : {
      ...baseConfig,
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT) || 5432,
      ssl,
    };

const pool = new Pool(poolConfig);

// Test the connection at startup
pool.query('SELECT 1')
  .then(() => console.log('✅ Customer Portal database connected successfully'))
  .catch((err) => console.error('❌ Error connecting to Customer Portal database:', err.message || err));

pool.on('error', (err) => {
  console.error('❌ Unexpected database error on Customer Portal client:', err);
});

module.exports = pool;
