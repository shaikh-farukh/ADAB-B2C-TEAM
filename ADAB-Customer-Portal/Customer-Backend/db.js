const path = require('path');
const dotenv = require('dotenv');
const dns = require('dns');
const net = require('net');
const { Pool } = require('pg');

// Robust fallback DNS resolver (Cloudflare 1.1.1.1 & Google 8.8.8.8)
// Guarantees fast, reliable resolution of remote cloud databases (Neon DB) even when local Wi-Fi router DNS returns REFUSED or EAI_AGAIN
const fallbackResolver = new dns.Resolver();
fallbackResolver.setServers(['1.1.1.1', '1.0.0.1', '8.8.8.8', '8.8.4.4']);

const originalLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
  if (typeof options === 'function') { callback = options; options = { family: 4 }; }
  else if (typeof options === 'object') { options = { ...options, family: 4 }; }
  else { options = { family: 4 }; }

  originalLookup(hostname, options, (err, address, family) => {
    if (!err && address) {
      return callback(null, address, family);
    }
    // If local DNS resolver fails or times out (EAI_AGAIN / REFUSED)
    if (hostname && (hostname.includes('neon.tech') || err?.code === 'EAI_AGAIN' || err?.code === 'ENOTFOUND')) {
      fallbackResolver.resolve4(hostname, (fallbackErr, addresses) => {
        if (!fallbackErr && addresses && addresses.length > 0) {
          if (options && options.all) {
            return callback(null, addresses.map(a => ({ address: a, family: 4 })));
          }
          return callback(null, addresses[0], 4);
        }
        return callback(err || fallbackErr, address, family);
      });
    } else {
      return callback(err, address, family);
    }
  });
};

// Load environment variables reliably from backend directory, falling back to root
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

// Fixes slow IPv6 fallback when connecting to remote database
if (net.setDefaultAutoSelectFamilyAttemptTimeout) {
  net.setDefaultAutoSelectFamilyAttemptTimeout(1000);
}

// Determine SSL settings
function getSslConfiguration() {
  const mode = (process.env.DB_SSL_MODE || '').toLowerCase().trim();
  const dbSsl = (process.env.DB_SSL || '').toLowerCase().trim();
  const rejectUnauthorizedEnv = process.env.DB_SSL_REJECT_UNAUTHORIZED;

  if (mode === 'disable' || mode === 'false' || dbSsl === 'false' || dbSsl === 'disable') {
    return false;
  }

  // Neon DB pooler requires rejectUnauthorized: false unless a CA cert is supplied
  if (mode === 'no-verify' || rejectUnauthorizedEnv === 'false' || !process.env.DB_CA_CERT) {
    return { rejectUnauthorized: false };
  }

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
  family: 4,
  max: Number(process.env.DB_MAX_CONNECTIONS) || 10,
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
      host: process.env.DB_HOST || 'ep-restless-hat-azawryc7-pooler.c-3.ap-southeast-1.aws.neon.tech',
      user: process.env.DB_USER || 'neondb_owner',
      password: process.env.DB_PASSWORD || 'npg_YHgOFwUDz54R',
      database: process.env.DB_NAME || 'neondb',
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
