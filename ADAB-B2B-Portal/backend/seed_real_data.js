import 'dotenv/config';
import pool from './Config/database.js';

async function seedRealData() {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting to seed real-time data for testing...');

    // 1. Ensure State and City exist for Location functionality
    let stateRes = await client.query("INSERT INTO state (state_name, active) VALUES ('Maharashtra', true) ON CONFLICT DO NOTHING RETURNING id");
    if (stateRes.rows.length === 0) {
      stateRes = await client.query("SELECT id FROM state WHERE state_name = 'Maharashtra'");
    }
    const stateId = stateRes.rows[0].id;

    let cityRes = await client.query("INSERT INTO city (state_id, city_name, active) VALUES ($1, 'Mumbai', true) ON CONFLICT DO NOTHING RETURNING id", [stateId]);
    if (cityRes.rows.length === 0) {
      cityRes = await client.query("SELECT id FROM city WHERE city_name = 'Mumbai'");
    }
    const cityId = cityRes.rows[0].id;

    // 2. Setup Category and Subcategory
    let catRes = await client.query("INSERT INTO manage_b_to_b_categories (category_name, active) VALUES ('Electronics', true) ON CONFLICT DO NOTHING RETURNING id");
    if (catRes.rows.length === 0) {
      catRes = await client.query("SELECT id FROM manage_b_to_b_categories WHERE category_name = 'Electronics'");
    }
    const catId = catRes.rows[0].id;

    let subCatRes = await client.query("INSERT INTO manage_b_to_b_subcategories (category_id, subcategory_name, active) VALUES ($1, 'Smartphones', true) ON CONFLICT DO NOTHING RETURNING id", [catId]);
    if (subCatRes.rows.length === 0) {
      subCatRes = await client.query("SELECT id FROM manage_b_to_b_subcategories WHERE subcategory_name = 'Smartphones'");
    }
    const subCatId = subCatRes.rows[0].id;

    // 3. Get existing Manufacturer and Distributor IDs
    const mRes = await client.query("SELECT id FROM manage_b_to_b_userdetail WHERE email = 'manufacturer@adab.com'");
    const dRes = await client.query("SELECT id FROM manage_b_to_b_userdetail WHERE email = 'distributor@adab.com'");
    const sRes = await client.query("SELECT id FROM manage_b_to_b_userdetail WHERE email = 'shop@adab.com'");

    if (mRes.rows.length === 0 || dRes.rows.length === 0 || sRes.rows.length === 0) {
      console.error('Users not found! Please run seed_users.js first.');
      process.exit(1);
    }

    const mId = mRes.rows[0].id;
    const dId = dRes.rows[0].id;
    const sId = sRes.rows[0].id;

    // Update their locations so market coverage works
    await client.query(`
      UPDATE manage_b_to_b_userdetail 
      SET latitude = 19.0760, longitude = 72.8777, fk_state = $1, fk_city = $2, serviceable_pincodes = ARRAY['400001', '400002']
      WHERE id IN ($3, $4, $5)
    `, [stateId, cityId, mId, dId, sId]);

    // 4. (Removed) Connection request logic is left empty so the user can test the connection flow manually from the UI.

    // 5. Create Real Products for Manufacturer
    const products = [
      {
        name: 'Adab Premium Smartphone X1',
        sku: 'ADAB-SP-X1',
        desc: 'A premium smartphone with 6.7 inch AMOLED display, 12GB RAM, and 256GB storage.',
        price: 45000.00,
        mrp: 60000.00,
        moq: 10,
        stock: 500,
        tier: JSON.stringify({ Bronze: 48000, Silver: 46500, Gold: 45000, Platinum: 44000 }),
        image: 'https://images.unsplash.com/photo-1598327105666-5b89351cb31c?auto=format&fit=crop&q=80&w=600'
      },
      {
        name: 'Adab Wireless Earbuds Pro',
        sku: 'ADAB-WE-PRO',
        desc: 'Noise-canceling true wireless earbuds with 24-hour battery life.',
        price: 2500.00,
        mrp: 4999.00,
        moq: 50,
        stock: 1200,
        tier: JSON.stringify({ Bronze: 2800, Silver: 2650, Gold: 2500, Platinum: 2400 }),
        image: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&q=80&w=600'
      },
      {
        name: 'Adab Smart Watch Series 5',
        sku: 'ADAB-SW-S5',
        desc: 'Advanced fitness tracking, ECG, and always-on display smartwatch.',
        price: 8500.00,
        mrp: 12000.00,
        moq: 20,
        stock: 300,
        tier: JSON.stringify({ Bronze: 9000, Silver: 8750, Gold: 8500, Platinum: 8200 }),
        image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&q=80&w=600'
      }
    ];

    // Clear existing products for this manufacturer just in case
    await client.query("DELETE FROM manage_manufacturer_products WHERE manufacturer_id = $1", [mId]);

    for (const p of products) {
      await client.query(`
        INSERT INTO manage_manufacturer_products (
          manufacturer_id, category_id, subcategory_id, category, sub_category, 
          product_name, sku, description, unit, price, mrp, moq, 
          total_stock, stock_quantity, product_image, tier_pricing, active, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pcs', $9, $10, $11, $12, $12, $13, $14, true, 'active')
      `, [mId, catId, subCatId, 'Electronics', 'Smartphones', p.name, p.sku, p.desc, p.price, p.mrp, p.moq, p.stock, p.image, p.tier]);
    }

    console.log('✅ Added 3 Premium Real-Time Products with Tier Pricing and Images!');
    console.log('✅ Created Approved Connection between Manufacturer and Distributor (Tier: Gold)!');
    console.log('✅ Updated Locations and Market Coverage Data for accurate territory discovery!');

  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    process.exit(0);
  }
}

seedRealData();
