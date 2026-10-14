const pool = require('../db');
const orderService = require('../services/orderService');
const cartService = require('../services/cartService');

async function runUniqueUserCheckoutTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING CHECKOUT UNIQUE CONSTRAINT VERIFICATION');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] Test ${total}: ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] Test ${total}: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // Find an active listing with stock and approval
    const listingRes = await pool.query(`
      SELECT id, store_id, sell_price, title 
      FROM seller_listings 
      WHERE is_active = true AND stock_qty > 5 AND (approval_status IS NULL OR approval_status = 'APPROVED')
      LIMIT 1
    `);
    if (listingRes.rows.length === 0) {
      console.log('⚠️ No active listing available to test checkout.');
      return;
    }
    const listing = listingRes.rows[0];

    // TEST 1: Checkout with hardcoded customer@adab.com and arbitrary phone without customerId
    const session1 = 'test-session-chk-' + Date.now();
    const cart1 = await cartService.getOrCreateCart({ sessionToken: session1 });
    await cartService.addItemToCart(cart1.id, listing.id, 1);

    const order1 = await orderService.createOrderFromCart({
      cartId: cart1.id,
      customerId: null,
      customerName: 'Pooja Sharma',
      customerPhone: '+919876599999',
      customerEmail: 'customer@adab.com',
      deliveryAddress: {
        recipient_name: 'Pooja Sharma',
        phone: '+919876599999',
        address_line: 'Flat 101, Test Road',
        city: 'Surat',
        pincode: '395002'
      },
      deliverySpeed: 'EXPRESS_30M',
      paymentMethod: 'CARD'
    });

    assert(order1 && order1.order_number, 'Checkout succeeded without users_email_key duplicate violation for customer@adab.com');
    assert(order1.payment_method === 'CARD', 'Order placed with CARD payment method');
    assert(order1.customer && order1.customer.id, 'Customer was resolved safely');

    // TEST 2: Second checkout with same email customer@adab.com and different phone format (10 digits)
    const session2 = 'test-session-chk2-' + Date.now();
    const cart2 = await cartService.getOrCreateCart({ sessionToken: session2 });
    await cartService.addItemToCart(cart2.id, listing.id, 1);

    const order2 = await orderService.createOrderFromCart({
      cartId: cart2.id,
      customerId: null,
      customerName: 'Guest Tester',
      customerPhone: '9876500000',
      customerEmail: 'customer@adab.com',
      deliveryAddress: {
        recipient_name: 'Guest Tester',
        phone: '9876500000',
        address_line: 'B-202, River Heights',
        city: 'Surat',
        pincode: '395002'
      },
      deliverySpeed: 'EXPRESS_30M',
      paymentMethod: 'CARD'
    });

    assert(order2 && order2.order_number, 'Repeated checkout with customer@adab.com succeeds without collision');

    // TEST 3: Checkout for a newly registered user with their actual customerId
    const sampleUserRes = await pool.query(`SELECT id, full_name, email, phone FROM users WHERE user_type = 'CUSTOMER' LIMIT 1`);
    if (sampleUserRes.rows.length > 0) {
      const user = sampleUserRes.rows[0];
      const session3 = 'test-session-chk3-' + Date.now();
      const cart3 = await cartService.getOrCreateCart({ sessionToken: session3, customerId: user.id });
      await pool.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cart3.id]);
      await pool.query(`UPDATE seller_listings SET stock_qty = 100 WHERE id = $1`, [listing.id]);
      await cartService.addItemToCart(cart3.id, listing.id, 1);

      const order3 = await orderService.createOrderFromCart({
        cartId: cart3.id,
        customerId: user.id,
        customerName: user.full_name,
        customerPhone: user.phone,
        customerEmail: user.email,
        deliveryAddress: {
          recipient_name: user.full_name,
          phone: user.phone,
          address_line: 'House 45, Green Park',
          city: 'Surat',
          pincode: '395002'
        },
        deliverySpeed: 'EXPRESS_30M',
        paymentMethod: 'CARD'
      });

      assert(order3.customer_id === user.id, 'Order linked correctly to logged-in customer ID');
    }

    console.log(`\n------------------------------------------------------`);
    console.log(`📊 RESULTS: ${passed}/${total} unique user checkout tests passed.`);
    console.log(`------------------------------------------------------\n`);
  } finally {
    await pool.end();
  }
}

runUniqueUserCheckoutTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
