const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Client } = require('pg');
const crypto = require('crypto');

const DATABASE_URL = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}?sslmode=require`;

function hashPassword(password) {
  const salt = 'adab_pin_salt_v1';
  return crypto.scryptSync(String(password), salt, 32).toString('hex');
}

async function seedNeon() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('1. Connecting to Neon PostgreSQL...');
    await client.connect();
    console.log('✅ Connected successfully!');

    console.log('\n2. Seeding Categories (IDs 1-10)...');
    const categories = [
      { id: 1, slug: 'fruits-vegetables', name: 'Fruits & Vegetables' },
      { id: 2, slug: 'dairy-eggs', name: 'Dairy & Eggs' },
      { id: 3, slug: 'pantry-staples', name: 'Pantry Staples' },
      { id: 4, slug: 'snacks-packaged-foods', name: 'Snacks & Packaged Foods' },
      { id: 5, slug: 'beverages', name: 'Beverages' },
      { id: 6, slug: 'personal-care', name: 'Personal Care' },
      { id: 7, slug: 'household-cleaning', name: 'Household & Cleaning' },
      { id: 8, slug: 'baby-care', name: 'Baby Care' },
      { id: 9, slug: 'meat-seafood', name: 'Meat & Seafood' },
      { id: 10, slug: 'spices-edible-oils', name: 'Spices & Edible Oils' }
    ];

    for (const c of categories) {
      await client.query(`
        INSERT INTO categories (id, slug, name, is_active)
        VALUES ($1, $2, $3, true)
        ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name, is_active = true
      `, [c.id, c.slug, c.name]);
    }
    // Update serial sequence so future category inserts work
    await client.query(`SELECT setval(pg_get_serial_sequence('categories', 'id'), 10, true)`);
    console.log('✅ 10 Categories seeded.');

    console.log('\n3. Seeding Bank Partners...');
    const banks = [
      {
        name: 'HDFC Bank (SME Loans)',
        code: 'HDFC_SME',
        interest_rate_pct: 1.25,
        max_credit_limit: 1000000,
        tenure_options: [14, 30, 60, 90],
        eligibility_criteria: JSON.stringify({ min_months_active: 3, min_turnover: 200000 })
      },
      {
        name: 'Bajaj Finserv MSME Credit',
        code: 'BAJAJ_MSME',
        interest_rate_pct: 1.40,
        max_credit_limit: 500000,
        tenure_options: [14, 30, 45],
        eligibility_criteria: JSON.stringify({ min_months_active: 2, min_turnover: 150000 })
      },
      {
        name: 'SBI MSME Working Capital',
        code: 'SBI_MSME',
        interest_rate_pct: 1.10,
        max_credit_limit: 1500000,
        tenure_options: [30, 60, 90],
        eligibility_criteria: JSON.stringify({ min_months_active: 6, min_turnover: 300000 })
      },
      {
        name: 'ICICI Merchant PayLater',
        code: 'ICICI_MPL',
        interest_rate_pct: 1.20,
        max_credit_limit: 750000,
        tenure_options: [14, 28, 42],
        eligibility_criteria: JSON.stringify({ min_months_active: 3, min_turnover: 180000 })
      }
    ];

    for (const b of banks) {
      await client.query(`
        INSERT INTO bank_partners (name, code, interest_rate_pct, max_credit_limit, tenure_options, eligibility_criteria, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, true)
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          interest_rate_pct = EXCLUDED.interest_rate_pct,
          max_credit_limit = EXCLUDED.max_credit_limit
      `, [b.name, b.code, b.interest_rate_pct, b.max_credit_limit, b.tenure_options, b.eligibility_criteria]);
    }
    console.log('✅ Bank partners seeded.');

    console.log('\n4. Seeding 38 FMCG Master Catalog Items...');
    const fmcgProducts = [
      // Pantry Staples (Cat 3)
      { name: 'Aashirvaad Superior MP Shudh Chakki Atta 10kg', brand: 'Aashirvaad', barcode: '8901030381018', category_id: 3, mrp: 485.00, unit: 'bag', img: '/product_images/basmati rice.jpeg' },
      { name: 'Daawat Rozana Gold Basmati Rice 5kg', brand: 'Daawat', barcode: '8901537000511', category_id: 3, mrp: 410.00, unit: 'bag', img: '/product_images/basmati rice.jpeg' },
      { name: 'Tata Salt Vacuum Evaporated Iodised Salt 1kg', brand: 'Tata', barcode: '8901030010017', category_id: 3, mrp: 28.00, unit: 'packet', img: '/product_images/salt.jpeg' },
      { name: 'Fortune Sunlite Refined Sunflower Oil 1L Pouch', brand: 'Fortune', barcode: '8906007280014', category_id: 3, mrp: 145.00, unit: 'pouch', img: '/product_images/sunflower oil.jpeg' },
      { name: 'Fortune Pure Besan Fine Gram Flour 1kg', brand: 'Fortune', barcode: '8906007281028', category_id: 3, mrp: 98.00, unit: 'packet', img: '/product_images/besan.jpeg' },
      { name: 'Madhur Pure & Hygienic Crystal Sugar 5kg', brand: 'Madhur', barcode: '8906014640108', category_id: 3, mrp: 260.00, unit: 'bag', img: '/product_images/sugar.jpeg' },
      { name: 'Rajdhani Unpolished Toor Dal 1kg', brand: 'Rajdhani', barcode: '8906011120016', category_id: 3, mrp: 175.00, unit: 'packet', img: '/product_images/moong dal.jpeg' },
      { name: 'Tata Sampann High Protein Chana Dal 1kg', brand: 'Tata Sampann', barcode: '8901030720015', category_id: 3, mrp: 120.00, unit: 'packet', img: '/product_images/moong dal.jpeg' },

      // Dairy & Eggs (Cat 2)
      { name: 'Amul Pasteurised Butter 500g', brand: 'Amul', barcode: '8901262010057', category_id: 2, mrp: 275.00, unit: 'pack', img: '/product_images/butter.jpeg' },
      { name: 'Amul Pure Ghee 1L Tin', brand: 'Amul', barcode: '8901262020018', category_id: 2, mrp: 610.00, unit: 'tin', img: '/product_images/ghee.jpeg' },
      { name: 'Britannia Processed Cheese Slices 200g (10 Slices)', brand: 'Britannia', barcode: '8901063141122', category_id: 2, mrp: 155.00, unit: 'pack', img: '/product_images/cheese.jpeg' },
      { name: 'Gowardhan Fresh Malai Paneer 200g Block', brand: 'Gowardhan', barcode: '8906001020012', category_id: 2, mrp: 95.00, unit: 'pack', img: '/product_images/paneer.jpeg' },
      { name: 'Mother Dairy Full Cream Cow Milk 1L Polypack', brand: 'Mother Dairy', barcode: '8901648001018', category_id: 2, mrp: 68.00, unit: 'pouch', img: '/product_images/milk.jpeg' },

      // Snacks & Packaged Foods (Cat 4)
      { name: 'Maggi 2-Minute Masala Instant Noodles 280g (4-Pack)', brand: 'Maggi', barcode: '8901058852333', category_id: 4, mrp: 56.00, unit: 'pack', img: '/product_images/maggi.jpeg' },
      { name: 'Parle-G Original Gluco Biscuits 800g Family Pack', brand: 'Parle', barcode: '8901719101018', category_id: 4, mrp: 75.00, unit: 'pack', img: '/product_images/parleg.jpeg' },
      { name: 'Britannia Good Day Cashew Cookies 600g Value Pack', brand: 'Britannia', barcode: '8901063012118', category_id: 4, mrp: 130.00, unit: 'pack', img: '/product_images/goodday.jpeg' },
      { name: 'Haldiram Nagpur Aloo Bhujia Namkeen 400g', brand: "Haldiram's", barcode: '8904004400118', category_id: 4, mrp: 115.00, unit: 'packet', img: '/product_images/haldiram.jpeg' },
      { name: 'Lay India Magic Masala Potato Chips 115g Party Pack', brand: "Lay's", barcode: '8901491101014', category_id: 4, mrp: 50.00, unit: 'packet', img: '/product_images/balaji chips.jpeg' },
      { name: 'Kurkure Masala Munch Crispy Corn Puffs 90g', brand: 'Kurkure', barcode: '8901491001017', category_id: 4, mrp: 20.00, unit: 'packet', img: '/product_images/soya sticks.jpeg' },
      { name: 'Sunfeast Dark Fantasy Choco Fills Cookies 300g', brand: 'Sunfeast', barcode: '8901725131018', category_id: 4, mrp: 160.00, unit: 'pack', img: '/product_images/cookies.jpeg' },
      { name: 'Knorr Classic Mixed Vegetable Thick Soup 43g', brand: 'Knorr', barcode: '8901030331013', category_id: 4, mrp: 40.00, unit: 'sachet', img: '/product_images/soup.jpeg' },

      // Beverages (Cat 5)
      { name: 'Tata Tea Premium Desh Ki Chai 1kg Leaf Tea', brand: 'Tata Tea', barcode: '8901030001015', category_id: 5, mrp: 490.00, unit: 'packet', img: '/product_images/tea.jpeg' },
      { name: 'Brooke Bond Red Label Strong Tea 500g', brand: 'Brooke Bond', barcode: '8901030022010', category_id: 5, mrp: 280.00, unit: 'packet', img: '/product_images/tea.jpeg' },
      { name: 'Nescafe Classic 100% Pure Instant Coffee Jar 100g', brand: 'Nescafe', barcode: '8901058861014', category_id: 5, mrp: 340.00, unit: 'jar', img: '/product_images/coffee.jpeg' },
      { name: 'Real Fruit Power Mixed Fruit Juice 1L Tetra Pak', brand: 'Real', barcode: '8901207011018', category_id: 5, mrp: 130.00, unit: 'tetra', img: '/product_images/juice.jpeg' },
      { name: 'Cadbury Bournvita Chocolate Health Drink 500g Jar', brand: 'Cadbury', barcode: '8901233011019', category_id: 5, mrp: 245.00, unit: 'jar', img: '/product_images/bournvita.jpeg' },

      // Personal Care (Cat 6)
      { name: 'Dettol Original Bathing Soap Bar 125g (Buy 3 Get 1 Free)', brand: 'Dettol', barcode: '8901396111018', category_id: 6, mrp: 196.00, unit: 'multipack', img: '/product_images/soap.jpeg' },
      { name: 'Colgate Strong Teeth Calcium Dental Cream Toothpaste 300g (2x150g)', brand: 'Colgate', barcode: '8901314011017', category_id: 6, mrp: 185.00, unit: 'saverpack', img: '/product_images/toothpaste.jpeg' },
      { name: 'Head & Shoulders Smooth & Silky Anti-Dandruff Shampoo 340ml', brand: 'Head & Shoulders', barcode: '8901030611016', category_id: 6, mrp: 360.00, unit: 'bottle', img: '/product_images/shampoo.jpeg' },
      { name: 'Lifebuoy Total Germ Protection Liquid Handwash Refill 750ml', brand: 'Lifebuoy', barcode: '8901030111011', category_id: 6, mrp: 119.00, unit: 'pouch', img: '/product_images/handwash.jpeg' },
      { name: 'Parachute 100% Pure Coconut Hair Oil 500ml Bottle', brand: 'Parachute', barcode: '8901088011018', category_id: 6, mrp: 180.00, unit: 'bottle', img: '/product_images/oil.jpeg' },

      // Household & Cleaning (Cat 7)
      { name: 'Surf Excel Easy Wash Detergent Powder 1kg', brand: 'Surf Excel', barcode: '8901030131019', category_id: 7, mrp: 142.00, unit: 'packet', img: '/product_images/detergent.jpeg' },
      { name: 'Vim Lemon Dishwash Anti-Smell Liquid Gel Bottle 750ml', brand: 'Vim', barcode: '8901030141018', category_id: 7, mrp: 165.00, unit: 'bottle', img: '/product_images/dishwash.jpeg' },
      { name: 'Harpic Power Plus 10x Max Disinfectant Toilet Cleaner 1L', brand: 'Harpic', barcode: '8901396311012', category_id: 7, mrp: 215.00, unit: 'bottle', img: '/product_images/cleaner.jpeg' },
      { name: 'Lizol Disinfectant Floor Cleaner Liquid Citrus 1L', brand: 'Lizol', barcode: '8901396321011', category_id: 7, mrp: 220.00, unit: 'bottle', img: '/product_images/cleaner.jpeg' },
      { name: 'Colin Glass and Multi-Surface Cleaner Trigger Spray 500ml', brand: 'Colin', barcode: '8901396331010', category_id: 7, mrp: 110.00, unit: 'bottle', img: '/product_images/cleaner.jpeg' },

      // Spices & Edible Oils (Cat 10)
      { name: 'Fortune Kachi Ghani Pure Mustard Oil 1L Pouch', brand: 'Fortune', barcode: '8906007282032', category_id: 10, mrp: 165.00, unit: 'pouch', img: '/product_images/oil.jpeg' },
      { name: 'Everest Super Garam Masala 100g Carton', brand: 'Everest', barcode: '8901786101018', category_id: 10, mrp: 92.00, unit: 'carton', img: '/product_images/masala.jpeg' },
      { name: 'MDH Deggi Mirch Natural Kashmiri Red Chilli Powder 100g', brand: 'MDH', barcode: '8902167011015', category_id: 10, mrp: 86.00, unit: 'carton', img: '/product_images/masala.jpeg' },
      { name: 'Saffola Gold Pro Healthy Heart Blended Edible Oil 5L Jar', brand: 'Saffola', barcode: '8901088022014', category_id: 10, mrp: 890.00, unit: 'jar', img: '/product_images/oil.jpeg' },
      { name: 'Catch Coriander Powder Dhaniya Powder 200g Box', brand: 'Catch', barcode: '8901192101015', category_id: 10, mrp: 62.00, unit: 'box', img: '/product_images/masala.jpeg' }
    ];

    const masterCatalogMap = new Map();
    for (const p of fmcgProducts) {
      const res = await client.query(`
        INSERT INTO master_catalog_items (product_name, brand_name, barcode, category_id, printed_mrp, standard_unit, default_image_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (barcode) DO UPDATE SET
          product_name = EXCLUDED.product_name,
          brand_name = EXCLUDED.brand_name,
          category_id = EXCLUDED.category_id,
          printed_mrp = EXCLUDED.printed_mrp,
          standard_unit = EXCLUDED.standard_unit,
          default_image_url = EXCLUDED.default_image_url
        RETURNING id, product_name, barcode
      `, [p.name, p.brand, p.barcode, p.category_id, p.mrp, p.unit, p.img]);
      if (res.rows[0]) {
        masterCatalogMap.set(p.barcode, res.rows[0].id);
      }
    }
    console.log(`✅ Master Catalog seeded with ${fmcgProducts.length} FMCG items.`);

    console.log('\n5. Seeding Primary Seller Account (Mayank Shah / mayank enterprise)...');
    const MAYANK_USER_ID = '9d0cc2db-06af-427a-b04b-632f1bcdc217';
    const MAYANK_PROFILE_ID = 'a0000000-0000-0000-0000-000000000001';
    const MAYANK_STORE_ID = '626fd4e1-ef8b-480a-bc70-d61534da1800';
    const pinHash = hashPassword('123456');

    // 5a. User
    await client.query(`
      INSERT INTO users (id, phone, full_name, user_type, status, email, password_hash, is_phone_verified, is_email_verified)
      VALUES ($1, '+919999999999', 'Mayank Shah', 'SELLER', 'ACTIVE', 'mayank@adab.com', $2, true, true)
      ON CONFLICT (id) DO UPDATE SET
        phone = EXCLUDED.phone,
        full_name = EXCLUDED.full_name,
        user_type = EXCLUDED.user_type,
        status = EXCLUDED.status,
        password_hash = EXCLUDED.password_hash
    `, [MAYANK_USER_ID, pinHash]);

    // 5b. Seller Profile
    await client.query(`
      INSERT INTO seller_profiles (id, user_id, legal_name, entity_type, pan, gstin, kyc_status, onboarding_step)
      VALUES ($1, $2, 'mayank enterprise LLC', 'Sole Proprietorship', 'ABCDE1234F', '24ABCDE1234F1Z5', 'APPROVED', 7)
      ON CONFLICT (user_id) DO UPDATE SET
        legal_name = EXCLUDED.legal_name,
        kyc_status = EXCLUDED.kyc_status,
        onboarding_step = EXCLUDED.onboarding_step
    `, [MAYANK_PROFILE_ID, MAYANK_USER_ID]);

    // Fetch resolved profile id
    const profileRes = await client.query('SELECT id FROM seller_profiles WHERE user_id = $1', [MAYANK_USER_ID]);
    const resolvedProfileId = profileRes.rows[0].id;

    // 5c. Store
    await client.query(`
      INSERT INTO stores (
        id, seller_id, store_name, category, phone, email, address_line, 
        city, state, pincode, latitude, longitude, delivery_radius_km, 
        is_online, open_time, close_time, soundbox_enabled, rating, rating_count
      )
      VALUES (
        $1, $2, 'mayank enterprise', 'Grocery & Supermarket', '+919999999999', 'mayank@adab.com',
        'Shop 12, Sunrise Arcade, SG Highway, Bodakdev', 'Ahmedabad', 'Gujarat', '380015',
        23.0372, 72.5186, 10.00, true, '08:00:00', '22:00:00', true, 4.90, 142
      )
      ON CONFLICT (id) DO UPDATE SET
        store_name = EXCLUDED.store_name,
        is_online = true,
        open_time = '08:00:00',
        close_time = '22:00:00',
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        pincode = EXCLUDED.pincode,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        delivery_radius_km = EXCLUDED.delivery_radius_km
    `, [MAYANK_STORE_ID, resolvedProfileId]);

    // 5d. Onboarding Steps
    await client.query(`
      INSERT INTO seller_onboarding_steps (user_id, step1, step2, step3, step4, step5, step6, step7)
      VALUES ($1, true, true, true, true, true, true, true)
      ON CONFLICT (user_id) DO UPDATE SET
        step1 = true, step2 = true, step3 = true, step4 = true, step5 = true, step6 = true, step7 = true
    `, [MAYANK_USER_ID]);
    console.log('✅ Primary Seller (Mayank Shah / mayank enterprise) seeded.');

    console.log('\n6. Seeding Wholesale Hub for B2B Discovery (Gujarat Mega Wholesale Hub)...');
    const WHOLESALE_USER_ID = '8d0cc2db-06af-427a-b04b-632f1bcdc218';
    const WHOLESALE_PROFILE_ID = 'a0000000-0000-0000-0000-000000000002';
    const WHOLESALE_STORE_ID = '726fd4e1-ef8b-480a-bc70-d61534da1801';

    await client.query(`
      INSERT INTO users (id, phone, full_name, user_type, status, email, password_hash, is_phone_verified)
      VALUES ($1, '+918888888888', 'Rajesh Patel', 'SELLER', 'ACTIVE', 'wholesale@gujarat.com', $2, true)
      ON CONFLICT (id) DO NOTHING
    `, [WHOLESALE_USER_ID, pinHash]);

    await client.query(`
      INSERT INTO seller_profiles (id, user_id, legal_name, entity_type, pan, kyc_status, onboarding_step)
      VALUES ($1, $2, 'Gujarat Mega Wholesalers Pvt Ltd', 'Private Limited', 'AAACG9876Q', 'APPROVED', 7)
      ON CONFLICT (user_id) DO NOTHING
    `, [WHOLESALE_PROFILE_ID, WHOLESALE_USER_ID]);

    await client.query(`
      INSERT INTO stores (
        id, seller_id, store_name, category, phone, email, address_line, 
        city, state, pincode, latitude, longitude, delivery_radius_km, is_online
      )
      VALUES (
        $1, $2, 'Gujarat Mega Wholesale Hub', 'Wholesale Distributor', '+918888888888', 'wholesale@gujarat.com',
        'APMC Yard, Vasna Market Yard, Sarkhej Road', 'Ahmedabad', 'Gujarat', '380007',
        23.0041, 72.5412, 50.00, true
      )
      ON CONFLICT (id) DO NOTHING
    `, [WHOLESALE_STORE_ID, WHOLESALE_PROFILE_ID]);
    console.log('✅ Wholesale Store (Gujarat Mega Wholesale Hub) seeded.');

    // Clean existing seed listings & orders to maintain idempotency
    await client.query(`DELETE FROM order_items WHERE seller_order_id IN (SELECT id FROM seller_orders WHERE store_id = $1)`, [MAYANK_STORE_ID]);
    await client.query(`DELETE FROM seller_orders WHERE store_id = $1`, [MAYANK_STORE_ID]);
    await client.query(`DELETE FROM inventory WHERE listing_id IN (SELECT id FROM seller_listings WHERE store_id IN ($1, $2))`, [MAYANK_STORE_ID, WHOLESALE_STORE_ID]);
    await client.query(`DELETE FROM seller_listings WHERE store_id IN ($1, $2)`, [MAYANK_STORE_ID, WHOLESALE_STORE_ID]);

    console.log('\n7. Seeding Seller Listings & Inventory for mayank enterprise...');
    const storeListings = [
      {
        barcode: '8901537000511',
        title: 'Daawat Rozana Gold Basmati Rice 5kg',
        category_id: 3,
        mrp: 410.00,
        sell_price: 135.00,
        stock_qty: 38,
        unit: 'bag'
      },
      {
        barcode: '8901030381018',
        title: 'Aashirvaad Superior MP Shudh Chakki Atta 10kg',
        category_id: 3,
        mrp: 485.00,
        sell_price: 450.00,
        stock_qty: 25,
        unit: 'bag'
      },
      {
        barcode: '8901030010017',
        title: 'Tata Salt Vacuum Evaporated Iodised Salt 1kg',
        category_id: 3,
        mrp: 28.00,
        sell_price: 25.00,
        stock_qty: 60,
        unit: 'packet'
      },
      {
        barcode: '8906007280014',
        title: 'Fortune Sunlite Refined Sunflower Oil 1L Pouch',
        category_id: 3,
        mrp: 145.00,
        sell_price: 130.00,
        stock_qty: 3, // Low stock alert!
        unit: 'pouch'
      },
      {
        barcode: '8901262010057',
        title: 'Amul Pasteurised Butter 500g',
        category_id: 2,
        mrp: 275.00,
        sell_price: 260.00,
        stock_qty: 2, // Low stock alert!
        unit: 'pack'
      },
      {
        barcode: '8901058852333',
        title: 'Maggi 2-Minute Masala Instant Noodles 280g (4-Pack)',
        category_id: 4,
        mrp: 56.00,
        sell_price: 52.00,
        stock_qty: 50,
        unit: 'pack'
      },
      {
        barcode: '8901030001015',
        title: 'Tata Tea Premium Desh Ki Chai 1kg Leaf Tea',
        category_id: 5,
        mrp: 490.00,
        sell_price: 460.00,
        stock_qty: 15,
        unit: 'packet'
      },
      {
        barcode: '8901030131019',
        title: 'Surf Excel Easy Wash Detergent Powder 1kg',
        category_id: 7,
        mrp: 142.00,
        sell_price: 135.00,
        stock_qty: 20,
        unit: 'packet'
      },
      {
        barcode: '8901786101018',
        title: 'Everest Super Garam Masala 100g Carton',
        category_id: 10,
        mrp: 92.00,
        sell_price: 85.00,
        stock_qty: 40,
        unit: 'carton'
      }
    ];

    const mayankListingMap = new Map();

    for (const item of storeListings) {
      const masterCatalogId = masterCatalogMap.get(item.barcode);
      const listRes = await client.query(`
        INSERT INTO seller_listings (
          store_id, product_type, master_catalog_id, title, barcode, 
          category_id, mrp, sell_price, unit, stock_qty, 
          approval_status, is_active, is_refundable, refund_percentage, return_window_days
        )
        VALUES (
          $1, 'PACKED_ITEM', $2, $3, $4, 
          $5, $6, $7, $8, $9, 
          'APPROVED', true, true, 100.00, 7
        )
        RETURNING id, title
      `, [
        MAYANK_STORE_ID, masterCatalogId, item.title, item.barcode,
        item.category_id, item.mrp, item.sell_price, item.unit, item.stock_qty
      ]);

      const listingId = listRes.rows[0].id;
      mayankListingMap.set(item.title, { id: listingId, price: item.sell_price, mrp: item.mrp });

      // Insert into inventory table
      await client.query(`
        INSERT INTO inventory (listing_id, stock_quantity, reserved_quantity, low_stock_threshold)
        VALUES ($1, $2, 0, 5.0)
        ON CONFLICT (listing_id) DO UPDATE SET
          stock_quantity = EXCLUDED.stock_quantity,
          low_stock_threshold = 5.0
      `, [listingId, item.stock_qty]);
    }
    console.log(`✅ Seeded ${storeListings.length} store listings & inventory for mayank enterprise.`);

    console.log('\n8. Seeding Wholesale Catalog for Gujarat Mega Wholesale Hub (B2B restock supplier)...');
    const wholesaleListings = [
      {
        title: 'Fortune Kachi Ghani Pure Mustard Oil 1L Pouch',
        barcode: '8906007282032',
        category_id: 10,
        mrp: 165.00,
        sell_price: 130.00,
        stock_qty: 500,
        min_order_qty: 10,
        unit: 'pouch'
      },
      {
        title: 'Daawat Rozana Gold Basmati Rice 5kg',
        barcode: '8901537000511',
        category_id: 3,
        mrp: 410.00,
        sell_price: 340.00,
        stock_qty: 250,
        min_order_qty: 5,
        unit: 'bag'
      },
      {
        title: 'Madhur Pure & Hygienic Crystal Sugar 5kg',
        barcode: '8906014640108',
        category_id: 3,
        mrp: 260.00,
        sell_price: 215.00,
        stock_qty: 400,
        min_order_qty: 5,
        unit: 'bag'
      },
      {
        title: 'Aashirvaad Superior MP Shudh Chakki Atta 10kg',
        barcode: '8901030381018',
        category_id: 3,
        mrp: 485.00,
        sell_price: 395.00,
        stock_qty: 300,
        min_order_qty: 10,
        unit: 'bag'
      }
    ];

    for (const w of wholesaleListings) {
      const masterCatalogId = masterCatalogMap.get(w.barcode);
      await client.query(`
        INSERT INTO seller_listings (
          store_id, product_type, master_catalog_id, title, barcode, 
          category_id, mrp, sell_price, unit, stock_qty, min_order_qty,
          approval_status, is_active
        )
        VALUES ($1, 'PACKED_ITEM', $2, $3, $4, $5, $6, $7, $8, $9, $10, 'APPROVED', true)
      `, [
        WHOLESALE_STORE_ID, masterCatalogId, w.title, w.barcode,
        w.category_id, w.mrp, w.sell_price, w.unit, w.stock_qty, w.min_order_qty
      ]);
    }
    console.log('✅ B2B Wholesale inventory seeded.');

    console.log('\n9. Seeding Customers & Real-Time Orders for mayank enterprise...');
    const customers = [
      { id: 'c0000000-0000-0000-0000-000000000001', phone: '+919876500001', name: 'Pooja Sharma' },
      { id: 'c0000000-0000-0000-0000-000000000002', phone: '+919876500002', name: 'Amit Trivedi' },
      { id: 'c0000000-0000-0000-0000-000000000003', phone: '+919876500003', name: 'Sneha Patel' },
      { id: 'c0000000-0000-0000-0000-000000000004', phone: '+919876500004', name: 'Vikram Desai' }
    ];

    for (const cust of customers) {
      await client.query(`
        INSERT INTO users (id, phone, full_name, user_type, status, email)
        VALUES ($1, $2, $3, 'CUSTOMER', 'ACTIVE', $4)
        ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone
      `, [cust.id, cust.phone, cust.name, `${cust.name.toLowerCase().replace(' ', '')}@example.com`]);
    }

    // Now seed the 5 specific UAT orders
    const rice = mayankListingMap.get('Daawat Rozana Gold Basmati Rice 5kg');
    const atta = mayankListingMap.get('Aashirvaad Superior MP Shudh Chakki Atta 10kg');
    const salt = mayankListingMap.get('Tata Salt Vacuum Evaporated Iodised Salt 1kg');
    const maggi = mayankListingMap.get('Maggi 2-Minute Masala Instant Noodles 280g (4-Pack)');
    const tea = mayankListingMap.get('Tata Tea Premium Desh Ki Chai 1kg Leaf Tea');
    const masala = mayankListingMap.get('Everest Super Garam Masala 100g Carton');

    const ordersToSeed = [
      {
        orderNumber: 'ORD-108',
        customerId: customers[0].id,
        status: 'NEW',
        subtotal: 689.00,
        grandTotal: 689.00,
        paymentMethod: 'UPI',
        paymentStatus: 'PAID',
        minutesAgo: 15,
        items: [
          { listingId: rice.id, name: 'Daawat Rozana Gold Basmati Rice 5kg', qty: 1, unitPrice: 135.00, totalPrice: 135.00 },
          { listingId: atta.id, name: 'Aashirvaad Superior MP Shudh Chakki Atta 10kg', qty: 1, unitPrice: 450.00, totalPrice: 450.00 },
          { listingId: maggi.id, name: 'Maggi 2-Minute Masala Instant Noodles 280g (4-Pack)', qty: 2, unitPrice: 52.00, totalPrice: 104.00 }
        ]
      },
      {
        orderNumber: 'ORD-109',
        customerId: customers[1].id,
        status: 'NEW',
        subtotal: 510.00,
        grandTotal: 510.00,
        paymentMethod: 'CASH_ON_DELIVERY',
        paymentStatus: 'PENDING',
        minutesAgo: 35,
        items: [
          { listingId: salt.id, name: 'Tata Salt Vacuum Evaporated Iodised Salt 1kg', qty: 2, unitPrice: 25.00, totalPrice: 50.00 },
          { listingId: tea.id, name: 'Tata Tea Premium Desh Ki Chai 1kg Leaf Tea', qty: 1, unitPrice: 460.00, totalPrice: 460.00 }
        ]
      },
      {
        orderNumber: 'ORD-105',
        customerId: customers[2].id,
        status: 'DELIVERED',
        subtotal: 1240.00,
        grandTotal: 1240.00,
        paymentMethod: 'UPI',
        paymentStatus: 'PAID',
        minutesAgo: 180,
        invoiceNumber: 'INV-2026-00105',
        taxAmount: 112.00,
        items: [
          { listingId: rice.id, name: 'Daawat Rozana Gold Basmati Rice 5kg', qty: 2, unitPrice: 135.00, totalPrice: 270.00 },
          { listingId: atta.id, name: 'Aashirvaad Superior MP Shudh Chakki Atta 10kg', qty: 2, unitPrice: 450.00, totalPrice: 900.00 },
          { listingId: masala.id, name: 'Everest Super Garam Masala 100g Carton', qty: 1, unitPrice: 70.00, totalPrice: 70.00 }
        ]
      },
      {
        orderNumber: 'ORD-102',
        customerId: customers[3].id,
        status: 'DELIVERED',
        subtotal: 890.00,
        grandTotal: 890.00,
        paymentMethod: 'UPI',
        paymentStatus: 'PAID',
        minutesAgo: 300,
        invoiceNumber: 'INV-2026-00102',
        taxAmount: 80.00,
        items: [
          { listingId: tea.id, name: 'Tata Tea Premium Desh Ki Chai 1kg Leaf Tea', qty: 1, unitPrice: 460.00, totalPrice: 460.00 },
          { listingId: atta.id, name: 'Aashirvaad Superior MP Shudh Chakki Atta 10kg', qty: 1, unitPrice: 430.00, totalPrice: 430.00 }
        ]
      },
      {
        orderNumber: 'ORD-101',
        customerId: customers[0].id,
        status: 'CANCELLED',
        subtotal: 450.00,
        grandTotal: 450.00,
        paymentMethod: 'UPI',
        paymentStatus: 'REFUNDED',
        minutesAgo: 1440,
        items: [
          { listingId: atta.id, name: 'Aashirvaad Superior MP Shudh Chakki Atta 10kg', qty: 1, unitPrice: 450.00, totalPrice: 450.00 }
        ]
      }
    ];

    for (const ord of ordersToSeed) {
      const createdAt = new Date(Date.now() - ord.minutesAgo * 60 * 1000);
      const deliveryAddress = JSON.stringify({
        street: '14, Palm Avenue, Bodakdev',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380054',
        latitude: 23.0410,
        longitude: 72.5120
      });

      // Insert parent order
      const parentRes = await client.query(`
        INSERT INTO orders (
          order_number, customer_id, delivery_address, delivery_mode, 
          total_mrp, total_discount, delivery_fee, grand_total, 
          payment_method, payment_status, order_status, created_at, updated_at
        )
        VALUES (
          $1, $2, $3, 'EXPRESS_30M', 
          $4, 0.00, 0.00, $4, 
          $5, $6, $7, $8, $8
        )
        ON CONFLICT (order_number) DO UPDATE SET
          order_status = EXCLUDED.order_status,
          grand_total = EXCLUDED.grand_total
        RETURNING id
      `, [
        ord.orderNumber, ord.customerId, deliveryAddress,
        ord.grandTotal, ord.paymentMethod, ord.paymentStatus,
        ord.status === 'DELIVERED' ? 'DELIVERED' : ord.status === 'CANCELLED' ? 'CANCELLED' : 'PLACED',
        createdAt
      ]);

      const parentOrderId = parentRes.rows[0].id;
      const commissionFee = Math.round(ord.subtotal * 0.05 * 100) / 100;
      const sellerPayout = ord.subtotal - commissionFee;

      // Insert seller_order
      const soRes = await client.query(`
        INSERT INTO seller_orders (
          parent_order_id, store_id, subtotal, commission_fee, seller_payout_amount, status, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        parentOrderId, MAYANK_STORE_ID, ord.subtotal, commissionFee, sellerPayout, ord.status, createdAt
      ]);

      const sellerOrderId = soRes.rows[0].id;

      // Insert order items
      for (const it of ord.items) {
        await client.query(`
          INSERT INTO order_items (seller_order_id, listing_id, product_name, quantity, unit_price, total_price)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [sellerOrderId, it.listingId, it.name, it.qty, it.unitPrice, it.totalPrice]);
      }

      // If invoiced, insert into invoices table
      if (ord.invoiceNumber) {
        await client.query(`
          INSERT INTO invoices (
            seller_order_id, order_id, invoice_number, tax_amount, total_amount, generated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (invoice_number) DO NOTHING
        `, [sellerOrderId, parentOrderId, ord.invoiceNumber, ord.taxAmount, ord.grandTotal, createdAt]);
      }
    }
    console.log(`✅ Seeded ${ordersToSeed.length} live orders (ORD-108, ORD-109, ORD-105, ORD-102, ORD-101) for mayank enterprise.`);

    console.log('\n===============================================================');
    console.log('🎉 NEON DATABASE FULLY SEEDED WITH TEST DATA & LIVE ENTITIES! 🎉');
    console.log('===============================================================');

  } catch (err) {
    console.error('❌ Seeding failed with error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedNeon();
