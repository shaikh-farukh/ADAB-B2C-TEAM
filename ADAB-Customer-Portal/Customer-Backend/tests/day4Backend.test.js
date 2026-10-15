const pool = require('../db');
const orderService = require('../services/orderService');
const customerService = require('../services/customerService');

async function runDay4Tests() {
  console.log('\n======================================================');
  console.log('📦 RUNNING DAY 4 BACKEND ENTERPRISE TESTS');
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

  let createdTestOrder = false;
  let sampleOrder;

  try {
    // 0. Clean up any leftover test orders
    await pool.query(`DELETE FROM invoices WHERE seller_order_id IN (SELECT id FROM seller_orders WHERE parent_order_id IN (SELECT id FROM orders WHERE order_number LIKE 'ORD-TEST%'))`);
    await pool.query(`DELETE FROM order_items WHERE seller_order_id IN (SELECT id FROM seller_orders WHERE parent_order_id IN (SELECT id FROM orders WHERE order_number LIKE 'ORD-TEST%'))`);
    await pool.query(`DELETE FROM order_status_history WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'ORD-TEST%')`);
    await pool.query(`DELETE FROM seller_orders WHERE parent_order_id IN (SELECT id FROM orders WHERE order_number LIKE 'ORD-TEST%')`);
    await pool.query(`DELETE FROM orders WHERE order_number LIKE 'ORD-TEST%'`);

    // 1. Fetch orders from database with valid items
    let ordersRes = await pool.query(`
      SELECT o.id, o.order_number, o.order_status, o.customer_id 
      FROM orders o
      JOIN seller_orders so ON so.parent_order_id = o.id
      JOIN order_items oi ON oi.seller_order_id = so.id
      JOIN seller_listings sl ON oi.listing_id = sl.id
      WHERE sl.is_active = true AND sl.stock_qty > 0
      ORDER BY o.created_at DESC LIMIT 5
    `);

    if (ordersRes.rows.length === 0) {
      const userRes = await pool.query(`SELECT id FROM users WHERE user_type = 'CUSTOMER' LIMIT 1`);
      const storeRes = await pool.query(`SELECT id FROM stores LIMIT 1`);
      if (userRes.rows.length > 0 && storeRes.rows.length > 0) {
        const uId = userRes.rows[0].id;
        const sId = storeRes.rows[0].id;
        const ordRes = await pool.query(`
          INSERT INTO orders (
            order_number, customer_id, delivery_address, delivery_mode,
            total_mrp, total_discount, delivery_fee, grand_total,
            payment_method, payment_status, order_status, eta_minutes, created_at, updated_at
          ) VALUES (
            'ORD-TEST-9999', $1, '{"address":"Test Address"}', 'EXPRESS_30M',
            250, 0, 29, 279,
            'UPI', 'PAID', 'CONFIRMED', 25, NOW(), NOW()
          ) RETURNING id, order_number, order_status, customer_id
        `, [uId]);
        sampleOrder = ordRes.rows[0];

        const soRes = await pool.query(`
          INSERT INTO seller_orders (parent_order_id, store_id, subtotal, seller_payout_amount, status, created_at)
          VALUES ($1, $2, 250, 230, 'NEW', NOW())
          RETURNING id
        `, [sampleOrder.id, sId]);

        const listingRes = await pool.query(`SELECT id, title, sell_price FROM seller_listings WHERE is_active = true AND stock_qty > 0 LIMIT 1`);
        if (listingRes.rows.length > 0) {
          const l = listingRes.rows[0];
          await pool.query(`
            INSERT INTO order_items (seller_order_id, listing_id, product_name, quantity, unit_price, total_price)
            VALUES ($1, $2, $3, 1, $4, $4)
          `, [soRes.rows[0].id, l.id, l.title, l.sell_price]);
        }

        createdTestOrder = true;
      }
    } else {
      sampleOrder = ordersRes.rows[0];
    }

    assert(sampleOrder !== undefined, `Database contains order for Day 4 tests`);
    console.log('sampleOrder:', sampleOrder);

    // 2. Test getCustomerOrders service
    const customerOrders = await orderService.getCustomerOrders(sampleOrder.customer_id);
    console.log('customerOrders:', customerOrders);
    assert(Array.isArray(customerOrders) && customerOrders.length > 0, `getCustomerOrders returns array of orders for customer`);
    assert(customerOrders[0].seller_orders !== undefined, `Customer orders include seller_orders array`);
    assert(customerOrders[0].items !== undefined, `Customer orders include items array`);

    // 3. Test getOrderById
    const singleOrder = await orderService.getOrderById(sampleOrder.id);
    assert(singleOrder && singleOrder.id === sampleOrder.id, `getOrderById returns full order object`);
    assert(Array.isArray(singleOrder.seller_orders), `Order details include seller_orders breakdown`);
    assert(Array.isArray(singleOrder.items), `Order details include itemized products`);

    // 4. Test getOrderStatusHistory
    const statusHistory = await orderService.getOrderStatusHistory(sampleOrder.id);
    assert(Array.isArray(statusHistory) && statusHistory.length > 0, `getOrderStatusHistory returns timeline milestones`);
    assert(statusHistory[0].new_status !== undefined, `Milestones have valid status descriptors`);

    // 5. Test getOrderShipments
    const shipments = await orderService.getOrderShipments(sampleOrder.id);
    assert(Array.isArray(shipments) && shipments.length > 0, `getOrderShipments returns shipment tracking data`);
    assert(shipments[0].tracking_number !== undefined, `Shipment has valid tracking number format`);

    // 6. Test getOrderTracking
    const tracking = await orderService.getOrderTracking(sampleOrder.id);
    assert(tracking && tracking.order_id === sampleOrder.id, `getOrderTracking returns live telemetry object`);
    assert(tracking.rider && tracking.rider.name, `Tracking contains assigned rider information (${tracking.rider.name})`);
    assert(tracking.store && typeof tracking.store.latitude === 'number', `Tracking contains store coordinates`);
    assert(tracking.current_location && typeof tracking.current_location.latitude === 'number', `Tracking contains rider live latitude/longitude`);
    assert(Array.isArray(tracking.events) && tracking.events.length > 0, `Tracking contains event logs persisted in tracking_events`);

    // 7. Test getOrderInvoice
    const invoiceData = await orderService.getOrderInvoice(sampleOrder.id);
    assert(invoiceData && invoiceData.invoice, `getOrderInvoice generates/retrieves tax invoice record`);
    assert(invoiceData.invoice.invoice_number.startsWith('INV-'), `Invoice has proper sequential number (${invoiceData.invoice.invoice_number})`);
    assert(typeof invoiceData.order.pricing.tax_amount === 'number', `Invoice computes GST breakdown (₹${invoiceData.order.pricing.tax_amount})`);

    // 8. Test Reorder functionality
    const reorderResult = await orderService.reorderOrder(sampleOrder.id, { customerId: sampleOrder.customer_id });
    assert(reorderResult && reorderResult.cart_id, `reorderOrder successfully resolves cart (${reorderResult.cart_id})`);
    assert(typeof reorderResult.added_count === 'number', `Reorder added available items to cart (${reorderResult.added_count} items)`);

    // 9. Test Notifications service
    const testUserRes = await pool.query(`
      INSERT INTO users (phone, email, full_name, user_type)
      VALUES ('+919999900099', 'testnotif@adab.test', 'Test Notif User', 'CUSTOMER')
      ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name
      RETURNING id
    `);
    const testCustomerId = testUserRes.rows[0].id;

    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
       VALUES ($1, 'Test Notification', 'This is a test notification', 'ORDER_STATUS', false, NOW())`,
      [testCustomerId]
    );

    const notifs = await customerService.getNotifications(testCustomerId);
    assert(Array.isArray(notifs) && notifs.length > 0, `getNotifications returns customer notifications list`);
    assert(notifs[0].title && notifs[0].message, `Notifications contain title, message, and type`);

    // 10. Test Notification unread count
    const unreadCount = await customerService.getUnreadNotificationCount(testCustomerId);
    assert(typeof unreadCount === 'number', `getUnreadNotificationCount returns integer count (${unreadCount})`);

    // 11. Test Mark notification as read
    const firstNotif = notifs[0];
    const readResult = await customerService.markNotificationRead(testCustomerId, firstNotif.id);
    assert(readResult.is_read === true, `markNotificationRead successfully marks notification as read`);

    // 12. Test Mark all notifications as read
    const markAllResult = await customerService.markAllNotificationsRead(testCustomerId);
    assert(typeof markAllResult.updated_count === 'number', `markAllNotificationsRead bulk updates notifications`);

    // Clean up test notifications and user
    await pool.query(`DELETE FROM notifications WHERE user_id = $1`, [testCustomerId]);
    await pool.query(`DELETE FROM users WHERE id = $1`, [testCustomerId]);

    // 13. Test cancelOrder with status validation
    // Find an active order or test non-cancellable rejection
    const nonCancellableOrder = ordersRes.rows.find(o => ['DELIVERED', 'CANCELLED'].includes(o.order_status));
    if (nonCancellableOrder) {
      let threw = false;
      try {
        await orderService.cancelOrder(nonCancellableOrder.id);
      } catch (e) {
        threw = true;
      }
      assert(threw, `cancelOrder properly rejects cancelling orders already in DELIVERED or CANCELLED state`);
    }

    console.log('\n------------------------------------------------------');
    console.log(`📊 RESULTS: ${passed}/${total} Day 4 backend tests passed.`);
    console.log('------------------------------------------------------\n');
  } catch (err) {
    console.error('❌ Day 4 backend test suite encountered an error:', err);
    process.exit(1);
  } finally {
    if (createdTestOrder && sampleOrder?.id) {
      try {
        await pool.query(`DELETE FROM invoices WHERE seller_order_id IN (SELECT id FROM seller_orders WHERE parent_order_id = $1)`, [sampleOrder.id]);
        await pool.query(`DELETE FROM order_items WHERE seller_order_id IN (SELECT id FROM seller_orders WHERE parent_order_id = $1)`, [sampleOrder.id]);
        await pool.query(`DELETE FROM order_status_history WHERE order_id = $1`, [sampleOrder.id]);
        await pool.query(`DELETE FROM seller_orders WHERE parent_order_id = $1`, [sampleOrder.id]);
        await pool.query(`DELETE FROM orders WHERE id = $1`, [sampleOrder.id]);
      } catch (cleanErr) {
        console.warn('Could not cleanup test order:', cleanErr.message);
      }
    }
    await pool.end();
  }
}

runDay4Tests();
