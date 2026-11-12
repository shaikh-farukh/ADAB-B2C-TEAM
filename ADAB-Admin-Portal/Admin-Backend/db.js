const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const connectionString = process.env.DATABASE_URL || 
  (process.env.DB_HOST ? `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}` : null);

if (!connectionString) {
  console.error('❌ FATAL: Database credentials missing. Please set DATABASE_URL in .env');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.DB_SSL_MODE === 'disable' ? false : { rejectUnauthorized: false },
  max: 10,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 25000
});

if (process.env.NODE_ENV !== 'test') {
  pool.connect((err, client, release) => {
    if (err) {
      console.error('❌ Error connecting to database:', err.message);
    } else {
      console.log('✅ Database connected successfully');
      release();
    }
  });
}

pool.on('error', (err) => {
  console.error('❌ Unexpected database error on pool client:', err.message);
});

async function closePool() {
  try {
    await pool.end();
  } catch (_) {}
}

module.exports = pool;
module.exports.closePool = closePool;
