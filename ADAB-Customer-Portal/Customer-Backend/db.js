const { Pool } = require('pg');
const dotenv = require('dotenv');
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
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to Customer Portal database:', err.message);
  } else {
    console.log('✅ Customer Portal database connected successfully');
    release();
  }
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error on Customer Portal client:', err);
});

module.exports = pool;
