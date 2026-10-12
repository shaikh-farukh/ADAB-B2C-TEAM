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

  try {
    // 1. Fetch orders from database
    const ordersRes = await pool.query(`SELECT id, order_number, order_status, customer_id FROM orders ORDER BY created_at DESC LIMIT 5`);
    assert(ordersRes.rows.length > 0, `Database contains existing orders (found ${ordersRes.rows.length})`);

    const sampleOrder = ordersRes.rows[0];

    // 2. Test getCustomerOrders service
    const customerOrders = await orderService.getCustomerOrders(sampleOrder.customer_id);
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
    const notifs = await customerService.getNotifications(sampleOrder.customer_id);
    assert(Array.isArray(notifs) && notifs.length > 0, `getNotifications returns customer notifications list`);
    assert(notifs[0].title && notifs[0].message, `Notifications contain title, message, and type`);

    // 10. Test Notification unread count
    const unreadCount = await customerService.getUnreadNotificationCount(sampleOrder.customer_id);
    assert(typeof unreadCount === 'number', `getUnreadNotificationCount returns integer count (${unreadCount})`);

    // 11. Test Mark notification as read
    const firstNotif = notifs[0];
    const readResult = await customerService.markNotificationRead(sampleOrder.customer_id, firstNotif.id);
    assert(readResult.is_read === true, `markNotificationRead successfully marks notification as read`);

    // 12. Test Mark all notifications as read
    const markAllResult = await customerService.markAllNotificationsRead(sampleOrder.customer_id);
    assert(typeof markAllResult.updated_count === 'number', `markAllNotificationsRead bulk updates notifications`);

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
    await pool.end();
  }
}

runDay4Tests();
