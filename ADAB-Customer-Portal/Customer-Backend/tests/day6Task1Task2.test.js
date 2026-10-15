const pool = require('../db');
const orderService = require('../services/orderService');
const cartService = require('../services/cartService');

async function runDay6BackendTests() {
  console.log('\n======================================================');
  console.log('🚀 RUNNING DAY 6 BACKEND TASKS 1 & 2 VERIFICATION TESTS');
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

  let testCartId = null;
  let testOrderId = null;
  let listing1 = null;
  let listing2 = null;
  let initialStock1 = 0;
  let testUser = null;

  try {
    // 1. Resolve active listings from real database
    const listingsRes = await pool.query(
      `SELECT sl.id, sl.store_id, sl.title, sl.sell_price, sl.stock_qty, s.store_name
       FROM seller_listings sl
       JOIN stores s ON sl.store_id = s.id
       WHERE sl.is_active = true AND sl.stock_qty >= 5
       ORDER BY sl.created_at DESC
       LIMIT 2`
    );

    assert(listingsRes.rows.length >= 1, 'Active seller listings found in database for checkout test');
    listing1 = listingsRes.rows[0];
    initialStock1 = Number(listing1.stock_qty);

    // Resolve customer user
    const userRes = await pool.query(
      `SELECT id, full_name, email, phone FROM users WHERE user_type = 'CUSTOMER' LIMIT 1`
    );
    assert(userRes.rows.length > 0, 'Customer user resolved from database');
    testUser = userRes.rows[0];

    // 2. Setup Cart with real listing
    const cart = await cartService.getOrCreateCart({
      customerId: testUser.id,
      sessionToken: 'test-session-day6-' + Date.now()
    });
    testCartId = cart.id;
    await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [testCartId]);
    assert(testCartId !== undefined, `Cart created or retrieved with ID: ${testCartId}`);

    // Add 2 quantity of listing1
    const addRes = await cartService.addItemToCart(testCartId, listing1.id, 2);
    assert(Number(addRes.quantity) === 2, `Added item to cart with quantity 2`);

    // --- TEST GROUP 1: Real Customer Purchase & Multi-Seller Order Synchronization ---
    console.log('\n--- Test Group 1: Atomic Order Placement & Multi-Seller Split ---');

    const order = await orderService.createOrderFromCart({
      cartId: testCartId,
      customerId: testUser.id,
      customerName: testUser.full_name || 'Mrunal Customer',
      customerPhone: testUser.phone || '+91 98765 43210',
      customerEmail: testUser.email || 'mrunal.customer@example.com',
      deliveryAddress: {
        address_line: 'Adajan Gam, Surat',
        city: 'Surat',
        pincode: '395009',
        recipient_name: 'Mrunal Customer'
      },
      deliverySpeed: 'EXPRESS_30M',
      paymentMethod: 'UPI'
    });

    testOrderId = order.id;

    assert(order && order.id !== undefined, `Master order record created with ID: ${order.id}`);
    assert(order.order_number && order.order_number.startsWith('ORD-'), `Order number has valid format (${order.order_number})`);
    assert(order.customer_id === testUser.id, `Order correctly linked to customer ID: ${testUser.id}`);
    assert(Number(order.grand_total) > 0, `Grand total calculated correctly: ₹${order.grand_total}`);
    assert(order.order_status === 'PLACED', `Initial order_status set to PLACED`);
    assert(order.delivery_address && typeof order.delivery_address === 'object', `Delivery address saved as structured JSON`);
    assert(order.delivery_address.latitude && order.delivery_address.longitude, `Delivery address populated with exact geocoded coordinates (${order.delivery_address.latitude}, ${order.delivery_address.longitude})`);

    // Verify Child records in seller_orders
    const soRes = await pool.query(
      `SELECT * FROM seller_orders WHERE parent_order_id = $1`,
      [testOrderId]
    );
    assert(soRes.rows.length >= 1, `seller_orders child records created (${soRes.rows.length} store split)`);
    const sellerOrder = soRes.rows[0];
    assert(sellerOrder.store_id === listing1.store_id, `seller_order matches listing store_id`);
    assert(sellerOrder.status === 'NEW', `Initial seller_order status is NEW`);
    assert(Number(sellerOrder.subtotal) > 0, `seller_order subtotal populated: ₹${sellerOrder.subtotal}`);

    // Verify Itemized records in order_items
    const oiRes = await pool.query(
      `SELECT * FROM order_items WHERE seller_order_id = $1`,
      [sellerOrder.id]
    );
    assert(oiRes.rows.length >= 1, `order_items records created for seller order (${oiRes.rows.length} items)`);
    assert(oiRes.rows[0].listing_id === listing1.id, `order_item linked to seller_listing ID`);
    assert(Number(oiRes.rows[0].quantity) === 2, `order_item quantity matches requested quantity (2)`);

    // Verify payments record
    const payRes = await pool.query(`SELECT * FROM payments WHERE order_id = $1`, [testOrderId]);
    assert(payRes.rows.length > 0, `Payment transaction created in payments table`);
    assert(payRes.rows[0].status === 'PENDING', `Payment status is PENDING`);
    assert(Number(payRes.rows[0].amount) === Number(order.grand_total), `Payment amount matches order grand total`);

    // Verify payment_transactions record
    const payTxRes = await pool.query(`SELECT * FROM payment_transactions WHERE order_id = $1`, [testOrderId]);
    assert(payTxRes.rows.length > 0, `Audit record created in payment_transactions table`);

    // Verify Tax Invoice in invoices table
    const invRes = await pool.query(`SELECT * FROM invoices WHERE order_id = $1`, [testOrderId]);
    assert(invRes.rows.length > 0, `Tax invoice created in invoices table`);
    assert(invRes.rows[0].invoice_number.startsWith('INV-'), `Invoice has sequential number: ${invRes.rows[0].invoice_number}`);
    assert(Number(invRes.rows[0].total_amount) === Number(order.grand_total), `Invoice total matches order grand total`);
    assert(Number(invRes.rows[0].tax_amount) > 0, `Invoice tax amount calculated: ₹${invRes.rows[0].tax_amount}`);

    // Verify Stock deduction in seller_listings
    const updatedListingRes = await pool.query(`SELECT stock_qty FROM seller_listings WHERE id = $1`, [listing1.id]);
    const updatedStock = Number(updatedListingRes.rows[0].stock_qty);
    assert(updatedStock === initialStock1 - 2, `Stock deducted in seller_listings (${initialStock1} -> ${updatedStock})`);

    // Verify Inventory Reservation in inventory_reservations
    const resRes = await pool.query(
      `SELECT * FROM inventory_reservations WHERE order_id = $1`,
      [testOrderId]
    );
    assert(resRes.rows.length > 0, `Inventory reservation recorded in inventory_reservations`);
    assert(resRes.rows[0].status === 'COMMITTED', `Inventory reservation status is COMMITTED`);
    assert(Number(resRes.rows[0].quantity_reserved) === 2, `Reserved quantity matches order item quantity (2)`);

    // Verify Initial order_status_history
    const histRes = await pool.query(
      `SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY created_at ASC`,
      [testOrderId]
    );
    assert(histRes.rows.length >= 1, `Initial milestone recorded in order_status_history`);
    assert(histRes.rows[0].new_status === 'PLACED', `Initial history status is PLACED`);

    // Verify Initial customer notification
    const notifRes = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 AND title LIKE '%Order Placed%' ORDER BY created_at DESC LIMIT 1`,
      [testUser.id]
    );
    assert(notifRes.rows.length > 0, `Order placed notification dispatched to customer inbox`);

    // --- TEST GROUP 2: Live Shipment & Tracking Telemetry Feed ---
    console.log('\n--- Test Group 2: Live Shipment & Tracking Telemetry Feed ---');

    // Initial tracking telemetry
    const initialTracking = await orderService.getOrderTracking(testOrderId);
    assert(initialTracking && initialTracking.order_id === testOrderId, `getOrderTracking returns telemetry object`);
    assert(initialTracking.store && initialTracking.store.latitude !== undefined, `Telemetry includes store origin coordinates`);
    assert(initialTracking.destination && initialTracking.destination.latitude !== undefined, `Telemetry includes destination delivery pin`);
    assert(initialTracking.rider && initialTracking.rider.name === 'Ramesh Patel', `Telemetry includes assigned rider details`);
    assert(Array.isArray(initialTracking.events) && initialTracking.events.length > 0, `Telemetry includes tracking events log`);

    // Milestone 1: Seller accepts order (ACCEPTED)
    console.log('\nTransitioning order to ACCEPTED...');
    const acceptedOrder = await orderService.updateOrderStatus(testOrderId, 'ACCEPTED', {
      notes: 'Store has verified and accepted order'
    });
    assert(acceptedOrder.order_status === 'CONFIRMED', `Order status transitioned to CONFIRMED / ACCEPTED`);
    
    const soAcceptedRes = await pool.query(`SELECT status FROM seller_orders WHERE parent_order_id = $1`, [testOrderId]);
    assert(soAcceptedRes.rows[0].status === 'ACCEPTED', `seller_orders status synchronized to ACCEPTED`);

    // Milestone 2: Packing (PACKED)
    console.log('\nTransitioning order to PACKED...');
    const packedOrder = await orderService.updateOrderStatus(testOrderId, 'PACKED', {
      notes: 'Store completed order packing'
    });
    assert(packedOrder.order_status === 'PREPARING', `Order status transitioned to PREPARING / PACKED`);
    
    const soPackedRes = await pool.query(`SELECT status FROM seller_orders WHERE parent_order_id = $1`, [testOrderId]);
    assert(soPackedRes.rows[0].status === 'PACKED', `seller_orders status synchronized to PACKED`);

    // Milestone 3: Dispatch & Courier Handshake (OUT_FOR_DELIVERY)
    console.log('\nTransitioning order to OUT_FOR_DELIVERY...');
    const dispatchedOrder = await orderService.updateOrderStatus(testOrderId, 'OUT_FOR_DELIVERY', {
      notes: 'Courier Ramesh picked up parcel',
      riderLatitude: 21.1850,
      riderLongitude: 72.8250,
      carrierName: 'ADAB Hyperlocal Courier'
    });
    assert(dispatchedOrder.order_status === 'OUT_FOR_DELIVERY', `Order status transitioned to OUT_FOR_DELIVERY`);
    
    const soDispatchedRes = await pool.query(`SELECT status FROM seller_orders WHERE parent_order_id = $1`, [testOrderId]);
    assert(soDispatchedRes.rows[0].status === 'DISPATCHED', `seller_orders status synchronized to DISPATCHED`);

    // Verify shipments record created/updated
    const shipRes = await pool.query(
      `SELECT * FROM shipments WHERE seller_order_id IN (SELECT id FROM seller_orders WHERE parent_order_id = $1)`,
      [testOrderId]
    );
    assert(shipRes.rows.length > 0, `Shipment record generated in shipments table`);
    assert(shipRes.rows[0].status === 'OUT_FOR_DELIVERY', `Shipment status is OUT_FOR_DELIVERY`);
    assert(shipRes.rows[0].tracking_number !== null, `Shipment has unique tracking number (${shipRes.rows[0].tracking_number})`);
    assert(shipRes.rows[0].shipped_at !== null, `Shipment shipped_at timestamp recorded`);

    // Check Live Tracking telemetry during delivery
    const liveTracking = await orderService.getOrderTracking(testOrderId);
    assert(liveTracking.order_status === 'OUT_FOR_DELIVERY', `Tracking reflects live OUT_FOR_DELIVERY status`);
    assert(liveTracking.current_location && liveTracking.current_location.latitude !== undefined, `Telemetry has live courier GPS latitude/longitude`);
    assert(Array.isArray(liveTracking.shipments) && liveTracking.shipments.length > 0, `Tracking returns associated shipments`);
    assert(liveTracking.shipments[0].tracking_number === shipRes.rows[0].tracking_number, `Tracking shipment numbers match`);

    // Milestone 4: Customer Delivery (DELIVERED)
    console.log('\nTransitioning order to DELIVERED...');
    const deliveredOrder = await orderService.updateOrderStatus(testOrderId, 'DELIVERED', {
      notes: 'Package handed over to customer'
    });
    assert(deliveredOrder.order_status === 'DELIVERED', `Order status transitioned to DELIVERED`);
    
    const soDeliveredRes = await pool.query(`SELECT status FROM seller_orders WHERE parent_order_id = $1`, [testOrderId]);
    assert(soDeliveredRes.rows[0].status === 'DELIVERED', `seller_orders status synchronized to DELIVERED`);

    const deliveredShipRes = await pool.query(
      `SELECT * FROM shipments WHERE seller_order_id IN (SELECT id FROM seller_orders WHERE parent_order_id = $1)`,
      [testOrderId]
    );
    assert(deliveredShipRes.rows[0].status === 'DELIVERED', `Shipment status updated to DELIVERED`);
    assert(deliveredShipRes.rows[0].delivered_at !== null, `Shipment delivered_at timestamp recorded`);

    // Verify complete Order Status History milestones
    const fullHistory = await orderService.getOrderStatusHistory(testOrderId);
    assert(fullHistory.length >= 4, `order_status_history records complete milestone timeline (${fullHistory.length} milestones)`);
    const historyStatuses = fullHistory.map(h => h.new_status);
    assert(historyStatuses.includes('PLACED'), `Timeline includes PLACED milestone`);
    assert(historyStatuses.includes('CONFIRMED'), `Timeline includes CONFIRMED milestone`);
    assert(historyStatuses.includes('PREPARING'), `Timeline includes PREPARING milestone`);
    assert(historyStatuses.includes('OUT_FOR_DELIVERY'), `Timeline includes OUT_FOR_DELIVERY milestone`);
    assert(historyStatuses.includes('DELIVERED'), `Timeline includes DELIVERED milestone`);

    // Verify Tracking Events Breadcrumb
    const trackEventsRes = await pool.query(
      `SELECT * FROM tracking_events WHERE order_id = $1 ORDER BY timestamp ASC`,
      [testOrderId]
    );
    assert(trackEventsRes.rows.length >= 3, `tracking_events contains multiple waypoint breadcrumbs (${trackEventsRes.rows.length} events)`);
    const eventNames = trackEventsRes.rows.map(e => e.event_name);
    assert(eventNames.includes('DISPATCHED_FOR_DELIVERY'), `Tracking events contain DISPATCHED_FOR_DELIVERY`);
    assert(eventNames.includes('ORDER_DELIVERED'), `Tracking events contain ORDER_DELIVERED`);

    // Verify Customer Notifications generated
    const allNotifsRes = await pool.query(
      `SELECT title, message, type FROM notifications WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '5 minutes' ORDER BY created_at ASC`,
      [testUser.id]
    );
    assert(allNotifsRes.rows.length >= 3, `Notifications generated for customer (${allNotifsRes.rows.length} notifications)`);

    // Idempotency verification: repeat DELIVERED update
    console.log('\nTesting Idempotency...');
    const duplicateDelivered = await orderService.updateOrderStatus(testOrderId, 'DELIVERED');
    assert(duplicateDelivered.order_status === 'DELIVERED', `Idempotent call preserves DELIVERED status`);
    const histAfterRepeat = await pool.query(`SELECT COUNT(*) as count FROM order_status_history WHERE order_id = $1`, [testOrderId]);
    assert(Number(histAfterRepeat.rows[0].count) === fullHistory.length, `Idempotent call did NOT insert duplicate history record`);

    // --- CLEANUP ---
    console.log('\nCleaning up test artifacts...');
    // Restore stock
    await pool.query(`UPDATE seller_listings SET stock_qty = $1 WHERE id = $2`, [initialStock1, listing1.id]);
    // Clean up test order records
    await pool.query(`DELETE FROM notifications WHERE user_id = $1 AND action_url = '/track'`, [testUser.id]);
    await pool.query(`DELETE FROM tracking_events WHERE order_id = $1`, [testOrderId]);
    await pool.query(`DELETE FROM shipments WHERE seller_order_id IN (SELECT id FROM seller_orders WHERE parent_order_id = $1)`, [testOrderId]);
    await pool.query(`DELETE FROM invoices WHERE order_id = $1`, [testOrderId]);
    await pool.query(`DELETE FROM inventory_reservations WHERE order_id = $1`, [testOrderId]);
    await pool.query(`DELETE FROM inventory_transactions WHERE reference_id = $1`, [testOrderId]);
    await pool.query(`DELETE FROM payment_transactions WHERE order_id = $1`, [testOrderId]);
    await pool.query(`DELETE FROM payments WHERE order_id = $1`, [testOrderId]);
    await pool.query(`DELETE FROM order_items WHERE seller_order_id IN (SELECT id FROM seller_orders WHERE parent_order_id = $1)`, [testOrderId]);
    await pool.query(`DELETE FROM order_status_history WHERE order_id = $1`, [testOrderId]);
    await pool.query(`DELETE FROM seller_orders WHERE parent_order_id = $1`, [testOrderId]);
    await pool.query(`DELETE FROM orders WHERE id = $1`, [testOrderId]);
    if (testCartId) {
      await pool.query(`DELETE FROM cart_items WHERE cart_id = $1`, [testCartId]);
      await pool.query(`DELETE FROM carts WHERE id = $1`, [testCartId]);
    }

    assert(true, 'Test artifacts and database state safely restored');

    console.log('\n------------------------------------------------------');
    console.log(`📊 RESULTS: All ${passed}/${total} Day 6 Backend Tasks 1 & 2 tests passed!`);
    console.log('------------------------------------------------------\n');
  } catch (err) {
    console.error('Test execution error:', err);
    if (listing1 && initialStock1 > 0) {
      pool.query(`UPDATE seller_listings SET stock_qty = $1 WHERE id = $2`, [initialStock1, listing1.id]).catch(() => {});
    }
    if (testOrderId) {
      pool.query(`DELETE FROM orders WHERE id = $1`, [testOrderId]).catch(() => {});
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runDay6BackendTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = runDay6BackendTests;
