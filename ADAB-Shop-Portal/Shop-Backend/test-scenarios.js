const pool = require('./db');

async function runTests() {
  try {
    console.log('--- STARTING NOTIFICATION TESTS ---');
    console.log('Ensure your React frontend is open to see the toasts pop up!');

// Find an existing store and seller instead of mocking from scratch
const existingStoreRes = await pool.query('SELECT id, seller_id FROM stores LIMIT 1');
if (existingStoreRes.rows.length === 0) {
  console.log("No stores found in DB! Cannot run test.");
  return;
}
const storeId = existingStoreRes.rows[0].id;
const sellerProfileId = existingStoreRes.rows[0].seller_id;

const existingSellerRes = await pool.query('SELECT user_id FROM seller_profiles WHERE id = $1', [sellerProfileId]);
if (existingSellerRes.rows.length === 0) {
  console.log("No seller profile found for store!");
  return;
}
const sellerId = existingSellerRes.rows[0].user_id;

console.log('✅ Found existing Store ID:', storeId);
console.log('✅ Found existing Seller User ID:', sellerId);

    // --- TEST 1: KYC STATUS CHANGE ---
    console.log('⏳ Testing Scenario 1: KYC Status Change in 3 seconds...');
    await new Promise(r => setTimeout(r, 3000));
    await pool.query(`
      UPDATE seller_profiles SET kyc_status = 'APPROVED' WHERE id = $1;
    `, [sellerId]);
    console.log('✅ Scenario 1 executed: KYC Approved');

    // --- TEST 2: LISTING REJECTION ---
    console.log('⏳ Testing Scenario 2: Listing Rejection in 5 seconds...');
    const listingRes = await pool.query(`
      INSERT INTO seller_listings (store_id, title, sku, product_type, mrp, sell_price, approval_status)
      VALUES ($1, 'Test Silk Kurti', 'SKU-001', 'OWN_BRAND', 1000, 800, 'UNDER_REVIEW')
      RETURNING id;
    `, [storeId]);
    const listingId = listingRes.rows[0].id;
    
    await new Promise(r => setTimeout(r, 5000));
    await pool.query(`
      UPDATE seller_listings SET approval_status = 'REJECTED' WHERE id = $1;
    `, [listingId]);
    console.log('✅ Scenario 2 executed: Listing Rejected');

    // --- TEST 3: NEW ORDER RECEIVED ---
    console.log('⏳ Testing Scenario 3: New Order Received in 5 seconds...');
    const orderRes = await pool.query(`
      INSERT INTO orders (customer_id, delivery_address, total_mrp, grand_total, payment_method, order_number)
      VALUES ($1, '{}', 800, 800, 'UPI', 'ORD-' || EXTRACT(EPOCH FROM NOW()))
      RETURNING id;
    `, [sellerId]); // using sellerId as customer just for mock
    const orderId = orderRes.rows[0].id;

    await new Promise(r => setTimeout(r, 5000));
    const sellerOrderRes = await pool.query(`
      INSERT INTO seller_orders (parent_order_id, store_id, subtotal, seller_payout_amount, status)
      VALUES ($1, $2, 800, 750, 'NEW')
      RETURNING id;
    `, [orderId, storeId]);
    const sellerOrderId = sellerOrderRes.rows[0].id;
    console.log('✅ Scenario 3 executed: New Order Inserted');

    // --- TEST 4: ORDER CANCELLED ---
    console.log('⏳ Testing Scenario 4: Order Cancelled in 5 seconds...');
    await new Promise(r => setTimeout(r, 5000));
    await pool.query(`
      UPDATE seller_orders SET status = 'CANCELLED' WHERE id = $1;
    `, [sellerOrderId]);
    console.log('✅ Scenario 4 executed: Order Cancelled');

    // --- TEST 5: PAYOUT SETTLED ---
    console.log('⏳ Testing Scenario 5: Payout Settled in 5 seconds...');
    
    // Create mock bank account
    const bankRes = await pool.query(`
      INSERT INTO seller_bank_accounts (seller_id, account_holder_name, account_number, ifsc_code, bank_name)
      VALUES ($1, 'Test Seller', '1234567890', 'HDFC0001234', 'HDFC')
      RETURNING id;
    `, [sellerProfileId]);
    const bankId = bankRes.rows[0].id;

    const payoutRes = await pool.query(`
      INSERT INTO seller_payouts (payout_batch_id, store_id, bank_account_id, gross_earnings, commission_deducted, tax_tcs_tds_deducted, net_payout_amount, payout_status)
      VALUES ('BATCH-001', $1, $2, 1000, 100, 50, 850, 'PROCESSING')
      RETURNING id;
    `, [storeId, bankId]);
    const payoutId = payoutRes.rows[0].id;

    await new Promise(r => setTimeout(r, 5000));
    await pool.query(`
      UPDATE seller_payouts SET payout_status = 'SETTLED' WHERE id = $1;
    `, [payoutId]);
    console.log('✅ Scenario 5 executed: Payout Settled');

    console.log('--- ALL TESTS FINISHED ---');
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    pool.end();
  }
}

runTests();
