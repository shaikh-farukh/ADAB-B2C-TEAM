const { Pool } = require('pg');
const dns = require('dns');
const dotenv = require('dotenv');
dotenv.config();

const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER || 'adab_b2c_team_user'}:${process.env.DB_PASSWORD || 'XBl5rzgqY22fI75kE1zjHUNdMhrzLyen'}@${process.env.DB_HOST || 'dpg-davljkid0e5s738fkddg-a.oregon-postgres.render.com'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'adab_b2c_team'}`;

const pool = new Pool({
  connectionString,
  ssl: process.env.DB_SSL_MODE === 'disable' ? false : {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error on Shop Portal client:', err);
});

module.exports = pool;
