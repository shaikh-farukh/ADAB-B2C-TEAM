const { Pool } = require('pg');
const dotenv = require('dotenv');
const dns = require('dns');

// Patch dns.lookup to ONLY return IPv4. 
// Avoids Node dual-stack IPv6 fallback timeout issues on Windows.
const originalLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
  if (typeof options === 'function') { callback = options; options = { family: 4 }; }
  else if (typeof options === 'object') { options.family = 4; }
  else { options = { family: 4 }; }
  return originalLookup(hostname, options, callback);
};
dotenv.config();

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL_MODE === 'disable' ? false : {
        rejectUnauthorized: false
      },
      family: 4,
      max: Number(process.env.DB_MAX_CONNECTIONS) || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000
    }
  : {
      host: process.env.DB_HOST || 'ep-restless-hat-azawryc7-pooler.c-3.ap-southeast-1.aws.neon.tech',
      user: process.env.DB_USER || 'neondb_owner',
      password: process.env.DB_PASSWORD || 'npg_YHgOFwUDz54R',
      database: process.env.DB_NAME || 'neondb',
      port: Number(process.env.DB_PORT) || 5432,
      ssl: process.env.DB_SSL_MODE === 'disable' ? false : {
        rejectUnauthorized: false
      },
      family: 4,
      max: Number(process.env.DB_MAX_CONNECTIONS) || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000
    };

const pool = new Pool(poolConfig);

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to Customer Portal database:', err.message || err);
  } else {
    console.log('✅ Customer Portal database connected successfully');
    release();
  }
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error on Customer Portal client:', err);
});

module.exports = pool;
