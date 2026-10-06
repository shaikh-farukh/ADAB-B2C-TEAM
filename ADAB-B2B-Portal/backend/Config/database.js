import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.log(`ℹ️ Info: Missing some database environment variables (${missingEnvVars.join(', ')}). Using fallback default configuration.`);
}

const host = process.env.DB_HOST ;
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const database = process.env.DB_NAME ;
const port = Number(process.env.DB_PORT );
const sslmode = process.env.DB_SSL_MODE || (process.env.DB_HOST ? "disable" : "require");

const ssl = sslmode === 'disable' ? false : {
  rejectUnauthorized: false,
};

const pool = new Pool({
  host,
  user,
  password,
  database,
  port,
  ssl,
  max: 20,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 30000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to database:', err.stack);
  } else {
    console.log('✅ Database connected successfully');
    release();
  }
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

export default pool;