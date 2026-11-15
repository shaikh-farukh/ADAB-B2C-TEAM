const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL_MODE === 'disable' ? false : {
        rejectUnauthorized: false
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
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
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    };

const pool = new Pool(poolConfig);

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
