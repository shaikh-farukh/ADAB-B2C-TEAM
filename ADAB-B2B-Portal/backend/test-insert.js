import pool from './Config/database.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

async function test() {
  try {
    const res = await pool.query("SELECT * FROM manage_b_to_b_user_type LIMIT 1");
    console.log('Types:', res.rows);
    
    // Attempt an insert
    const insertQuery = `
      INSERT INTO manage_b_to_b_userdetail (
        company_name, business_type_id, email, mobile, 
        owner_name, password, active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const randomPass = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPass, 12);

    const inserted = await pool.query(insertQuery, ['Test Co', res.rows[0].id, 'test' + Date.now() + '@google.com', '', 'Test Owner', hashedPassword]);
    console.log('Inserted:', inserted.rows[0].id);
    process.exit(0);
  } catch (err) {
    console.error('INSERT ERROR:', err);
    process.exit(1);
  }
}
test();
