const pool = require('../db');
const { hashPassword } = require('../src/utils/jwt');

async function createAdmin() {
  const plainPassword = 'Admin@Adab2026';
  const hash = hashPassword(plainPassword);

  const query = `
    INSERT INTO users (
      full_name, email, phone, password_hash, user_type, status, is_phone_verified, is_email_verified
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8
    ) RETURNING id, full_name, email, phone, user_type, status, created_at;
  `;

  const values = [
    'Rajesh Sharma',
    'rajesh.sharma@adab.com',
    '+919819900100',
    hash,
    'ADMIN',
    'ACTIVE',
    true,
    true
  ];

  const res = await pool.query(query, values);
  console.log('ADMIN_CREATED_SUCCESS:', JSON.stringify(res.rows[0]));
}

createAdmin()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('FAILED:', e.message);
    process.exit(1);
  });

