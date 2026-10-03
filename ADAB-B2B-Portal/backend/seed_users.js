import 'dotenv/config';
import pool from './Config/database.js';
import bcrypt from 'bcrypt';

async function seedUsers() {
  const client = await pool.connect();
  try {
    const password = 'Adab@Enterprise2026!';
    const passHash = await bcrypt.hash(password, 10);

    // Ensure types exist
    await client.query(`INSERT INTO manage_b_to_b_user_type (typename, active) VALUES ('Manufacturer', true) ON CONFLICT DO NOTHING`);
    await client.query(`INSERT INTO manage_b_to_b_user_type (typename, active) VALUES ('Distributor', true) ON CONFLICT DO NOTHING`);
    await client.query(`INSERT INTO manage_b_to_b_user_type (typename, active) VALUES ('Shop', true) ON CONFLICT DO NOTHING`);

    const mRes = await client.query("SELECT id FROM manage_b_to_b_user_type WHERE LOWER(typename) = 'manufacturer' LIMIT 1");
    const dRes = await client.query("SELECT id FROM manage_b_to_b_user_type WHERE LOWER(typename) = 'distributor' LIMIT 1");
    const sRes = await client.query("SELECT id FROM manage_b_to_b_user_type WHERE LOWER(typename) = 'shop' LIMIT 1");

    const mTypeId = mRes.rows[0].id;
    const dTypeId = dRes.rows[0].id;
    const sTypeId = sRes.rows[0].id;

    // Manufacturer
    const mEmail = 'manufacturer@adab.com';
    let checkM = await client.query("SELECT id FROM manage_b_to_b_userdetail WHERE email = $1", [mEmail]);
    if (checkM.rows.length === 0) {
      await client.query(`
        INSERT INTO manage_b_to_b_userdetail (
          company_name, email, mobile, owner_name, password, business_type_id, active, created_at, kyc_status
        ) VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, 'approved')
      `, ['Adab Manufacturer', mEmail, '8888888888', 'Manu Owner', passHash, mTypeId]);
      console.log(`Created Manufacturer: ${mEmail}`);
    }

    // Distributor
    const dEmail = 'distributor@adab.com';
    let checkD = await client.query("SELECT id FROM manage_b_to_b_userdetail WHERE email = $1", [dEmail]);
    if (checkD.rows.length === 0) {
      await client.query(`
        INSERT INTO manage_b_to_b_userdetail (
          company_name, email, mobile, owner_name, password, business_type_id, active, created_at, kyc_status
        ) VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, 'approved')
      `, ['Adab Distributor', dEmail, '7777777777', 'Disti Owner', passHash, dTypeId]);
      console.log(`Created Distributor: ${dEmail}`);
    }
    
    // Shop
    const sEmail = 'shop@adab.com';
    let checkS = await client.query("SELECT id FROM manage_b_to_b_userdetail WHERE email = $1", [sEmail]);
    if (checkS.rows.length === 0) {
      await client.query(`
        INSERT INTO manage_b_to_b_userdetail (
          company_name, email, mobile, owner_name, password, business_type_id, active, created_at, kyc_status
        ) VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, 'approved')
      `, ['Adab Shop', sEmail, '6666666666', 'Shop Owner', passHash, sTypeId]);
      console.log(`Created Shop: ${sEmail}`);
    }

  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    process.exit(0);
  }
}
seedUsers();
