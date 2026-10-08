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
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to Shop Portal database:', err.message);
  } else {
    console.log('✅ Shop Portal database connected successfully');
    release();
  }
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error on Shop Portal client:', err);
});

module.exports = pool;
