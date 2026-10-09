const { Pool } = require('pg');
const dotenv = require('dotenv');
const dns = require('dns');
// Patch dns.lookup to ONLY return IPv4. 
// Render DB is in Oregon (350ms ping), which is higher than Node's 250ms IPv6 fallback timeout.
const originalLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
  if (typeof options === 'function') { callback = options; options = { family: 4 }; }
  else if (typeof options === 'object') { options.family = 4; }
  else { options = { family: 4 }; }
  return originalLookup(hostname, options, callback);
};
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'dpg-davljkid0e5s738fkddg-a.oregon-postgres.render.com',
  user: process.env.DB_USER || 'adab_b2c_team_user',
  password: process.env.DB_PASSWORD || 'XBl5rzgqY22fI75kE1zjHUNdMhrzLyen',
  database: process.env.DB_NAME || 'adab_b2c_team',
  port: Number(process.env.DB_PORT) || 5432,
  ssl: process.env.DB_SSL_MODE === 'disable' ? false : {
    rejectUnauthorized: false
  },
  family: 4, // Force IPv4 to bypass internalConnectMultiple Node.js bugs
  max: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000
});

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
