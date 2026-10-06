const pool = require('./db');
const crypto = require('crypto');

async function seed() {
  const userId = '00000000-0000-0000-0000-000000000001';
  
  try {
    // 1. Insert User
    await pool.query(`
      INSERT INTO users (id, phone, full_name, user_type, status, email)
      VALUES ($1, '+919999999999', 'Shabbir Garbadawala', 'SELLER', 'ACTIVE', 'shabbir.real@example.com')
      ON CONFLICT (id) DO NOTHING;
    `, [userId]);

    // 2. Insert Seller Profile
    await pool.query(`
      INSERT INTO seller_profiles (user_id, legal_name, kyc_status, entity_type, pan)
      VALUES ($1, 'Shabbir Enterprises LLC', 'APPROVED', 'Sole Proprietorship', 'ABCDE1234F')
      ON CONFLICT DO NOTHING;
    `, [userId]);

    const profileRes = await pool.query('SELECT id FROM seller_profiles WHERE user_id = $1', [userId]);
    const profileId = profileRes.rows[0].id;

    // 3. Insert Store
    const storeId = '00000000-0000-0000-0000-000000000001';
    await pool.query(`
      INSERT INTO stores (id, seller_id, store_name, category, phone, city, state, pincode, address_line, is_online, rating)
      VALUES ($1, $2, 'ADAB Flagship Store (Real)', 'Grocery', '+919999999999', 'Surat', 'Gujarat', '395007', 'Vesu Main Road', true, 4.8)
      ON CONFLICT (id) DO NOTHING;
    `, [storeId, profileId]);

    console.log("Seed complete. Added actual real test data.");
  } catch (err) {
    console.error("Seed failed:", err);
  } finally {
    pool.end();
  }
}
seed();
