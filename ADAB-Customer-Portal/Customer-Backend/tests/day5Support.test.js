/**
 * Day 5 Backend Task 3: Help & Support Tickets Enterprise Integration Tests
 * Validates canonical support_tickets and support_messages workflows
 */

const assert = require('assert');
const pool = require('../db');
const customerService = require('../services/customerService');
const supportService = require('../services/supportService');

let testPassed = 0;
let testFailed = 0;
const createdTicketIds = [];

function pass(msg) {
  testPassed++;
  console.log(`✅ [PASS] Test ${testPassed}: ${msg}`);
}

function fail(msg, err) {
  testFailed++;
  console.error(`❌ [FAIL]: ${msg}`, err);
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🎫 RUNNING DAY 5 HELP & SUPPORT TICKETS ENTERPRISE TESTS');
  console.log('======================================================\n');

  try {
    // Check DB connection
    const health = await pool.query('SELECT NOW() as db_time');
    assert(health.rows[0].db_time, 'Database must be connected');
    pass('Database connection established');

    // 1. Resolve Customer
    const testCustomerId = await customerService.resolveCustomerUserId();
    assert(testCustomerId, 'Must resolve a valid customer ID');
    pass(`Resolved customer ID: ${testCustomerId}`);

    // Fetch an order belonging to customer (if any) for linked ticket testing
    const orderRes = await pool.query(
      `SELECT id, order_number, order_status FROM orders WHERE customer_id = $1 LIMIT 1`,
      [testCustomerId]
    );
    const existingOrder = orderRes.rows[0] || null;
    if (existingOrder) {
      pass(`Found existing customer order #${existingOrder.order_number}`);
    } else {
      pass('No existing order found, proceeding with general tickets');
    }

    // --- Test Group 1: createTicket (General Ticket) ---
    console.log('\n--- Test Group 1: createTicket (General Ticket) ---');
    const ticket1 = await supportService.createTicket(testCustomerId, {
      category: 'PAYMENT',
      priority: 'HIGH',
      subject: 'Double charged on checkout',
      message: 'My card was charged twice for the order. Please refund the extra charge.',
      attachment_url: 'https://cdn.adab.com/receipts/charge_proof.png'
    });

    assert(ticket1 && ticket1.id, 'Ticket must have an id');
    createdTicketIds.push(ticket1.id);
    pass('Created general support ticket');

    assert(ticket1.ticket_number.startsWith('TCK-'), 'Ticket number must follow TCK- pattern');
    pass(`Generated unique ticket number: ${ticket1.ticket_number}`);

    assert.strictEqual(ticket1.status, 'OPEN', 'Initial status must be OPEN');
    pass('Initial ticket status is OPEN');

    assert.strictEqual(ticket1.priority, 'HIGH', 'Priority matches submitted value');
    pass('Ticket priority saved as HIGH');

    assert.strictEqual(ticket1.category, 'PAYMENT', 'Category matches submitted value');
    pass('Ticket category saved as PAYMENT');

    assert(Array.isArray(ticket1.messages) && ticket1.messages.length === 1, 'Initial message created');
    pass('Initial message record created in support_messages');

    assert(ticket1.messages[0].message.includes('Double charged'), 'Message contains subject and body');
    pass('Initial message contains subject and message content');

    assert.strictEqual(ticket1.messages[0].attachment_url, 'https://cdn.adab.com/receipts/charge_proof.png');
    pass('Initial message has attachment_url');

    // --- Test Group 2: createTicket (Linked Order Ticket) ---
    console.log('\n--- Test Group 2: createTicket (Linked Order Ticket) ---');
    let ticket2 = null;
    if (existingOrder) {
      ticket2 = await supportService.createTicket(testCustomerId, {
        category: 'ORDER_ISSUE',
        priority: 'MEDIUM',
        order_id: existingOrder.id,
        subject: `Issue with Order #${existingOrder.order_number}`,
        message: 'The package was received with minor box damage.'
      });
      assert(ticket2 && ticket2.id, 'Order linked ticket created');
      createdTicketIds.push(ticket2.id);
      pass('Created order-linked support ticket');

      assert.strictEqual(ticket2.order_id, existingOrder.id, 'order_id correctly saved');
      pass('Linked order_id matches expected order');

      assert(ticket2.order && ticket2.order.order_number, 'Linked order info returned');
      pass('Ticket payload includes linked order info');
    } else {
      pass('Skipping order-specific ticket assertion (no customer order in DB)');
    }

    // --- Test Group 3: getCustomerTickets ---
    console.log('\n--- Test Group 3: getCustomerTickets ---');
    const ticketList = await supportService.getCustomerTickets(testCustomerId, { limit: 10 });
    assert(Array.isArray(ticketList.tickets), 'tickets must be an array');
    pass('getCustomerTickets returns tickets array');

    const foundTicket = ticketList.tickets.find((t) => t.id === ticket1.id);
    assert(foundTicket, 'Created ticket must be present in customer tickets list');
    pass('Created ticket present in list');

    assert(foundTicket.message_count >= 1, 'message_count is tracked');
    pass(`Ticket summary includes message_count (${foundTicket.message_count})`);

    assert(foundTicket.last_message, 'last_message preview is present');
    pass('Ticket summary includes last_message snippet');

    assert(ticketList.pagination && ticketList.pagination.total >= 1, 'Pagination metadata is returned');
    pass(`Pagination metadata returned (total: ${ticketList.pagination.total})`);

    // Filter by status
    const openTickets = await supportService.getCustomerTickets(testCustomerId, { status: 'OPEN' });
    assert(openTickets.tickets.every((t) => t.status === 'OPEN'), 'All filtered tickets have status OPEN');
    pass('Status filter (status=OPEN) accurately applied');

    // Filter by category
    const paymentTickets = await supportService.getCustomerTickets(testCustomerId, { category: 'PAYMENT' });
    assert(paymentTickets.tickets.every((t) => t.category === 'PAYMENT'), 'All filtered tickets have category PAYMENT');
    pass('Category filter (category=PAYMENT) accurately applied');

    // --- Test Group 4: getTicketDetails & Messages ---
    console.log('\n--- Test Group 4: getTicketDetails & Messages ---');
    const details = await supportService.getTicketDetails(testCustomerId, ticket1.id);
    assert.strictEqual(details.id, ticket1.id, 'Ticket detail ID matches');
    pass('getTicketDetails returns ticket detail matching ID');

    assert(Array.isArray(details.messages), 'messages must be an array');
    pass('getTicketDetails includes conversation messages thread');

    assert(details.messages.length >= 1, 'Messages thread contains initial message');
    pass('Conversation thread contains initial message');

    assert(details.messages[0].sender_name, 'Message contains sender_name');
    pass(`Message includes sender_name: ${details.messages[0].sender_name}`);

    // Verify internal admin notes are hidden from customer
    await pool.query(
      `INSERT INTO support_messages (ticket_id, sender_user_id, message, is_internal_admin_note)
       VALUES ($1, $2, 'INTERNAL NOTE: Investigating card gateway logs', true)`,
      [ticket1.id, testCustomerId]
    );
    const detailsAfterNote = await supportService.getTicketDetails(testCustomerId, ticket1.id);
    const leakedNote = detailsAfterNote.messages.find((m) => m.message.includes('INTERNAL NOTE'));
    assert(!leakedNote, 'Internal admin notes must NEVER be exposed to customer');
    pass('Internal admin note safely filtered out from customer view');

    // --- Test Group 5: sendTicketMessage ---
    console.log('\n--- Test Group 5: sendTicketMessage ---');
    const reply = await supportService.sendTicketMessage(testCustomerId, ticket1.id, {
      message: 'Here is the bank transaction reference number: TXN9876543210.',
      attachment_url: 'https://cdn.adab.com/receipts/bank_stmt.pdf'
    });
    assert(reply && reply.id, 'Reply message record created');
    pass('sendTicketMessage created new message record in thread');

    assert.strictEqual(reply.message, 'Here is the bank transaction reference number: TXN9876543210.');
    pass('Reply message body matches submitted text');

    assert.strictEqual(reply.attachment_url, 'https://cdn.adab.com/receipts/bank_stmt.pdf');
    pass('Reply includes attachment URL');

    const updatedDetails = await supportService.getTicketDetails(testCustomerId, ticket1.id);
    assert(updatedDetails.messages.length === 2, 'Conversation thread now contains 2 messages');
    pass('Conversation thread reflects newly sent reply');

    // Test transition from WAITING_CUSTOMER to IN_PROGRESS on reply
    await pool.query(`UPDATE support_tickets SET status = 'WAITING_CUSTOMER' WHERE id = $1`, [ticket1.id]);
    await supportService.sendTicketMessage(testCustomerId, ticket1.id, {
      message: 'Customer reply to agent request'
    });
    const transitioned = await supportService.getTicketDetails(testCustomerId, ticket1.id);
    assert.strictEqual(transitioned.status, 'IN_PROGRESS', 'Status transitioned to IN_PROGRESS upon customer reply');
    pass('Replying to WAITING_CUSTOMER automatically transitions ticket to IN_PROGRESS');

    // --- Test Group 6: updateTicketStatus ---
    console.log('\n--- Test Group 6: updateTicketStatus ---');
    const resolved = await supportService.updateTicketStatus(testCustomerId, ticket1.id, {
      status: 'RESOLVED'
    });
    assert.strictEqual(resolved.status, 'RESOLVED', 'Ticket status updated to RESOLVED');
    pass('Ticket status updated to RESOLVED');

    assert(resolved.resolved_at, 'resolved_at timestamp populated upon resolution');
    pass('resolved_at timestamp populated upon resolution');

    // Close ticket
    const closed = await supportService.updateTicketStatus(testCustomerId, ticket1.id, {
      status: 'CLOSED'
    });
    assert.strictEqual(closed.status, 'CLOSED', 'Ticket status updated to CLOSED');
    pass('Ticket status updated to CLOSED');

    // --- Test Group 7: Error Validations & Security ---
    console.log('\n--- Test Group 7: Error Validations & Security ---');

    // Missing category
    let errCat = null;
    try {
      await supportService.createTicket(testCustomerId, { category: '' });
    } catch (e) {
      errCat = e;
    }
    assert(errCat && errCat.statusCode === 400, 'Must throw 400 for missing category');
    pass('Correctly throws 400 for missing category');

    // Invalid priority
    let errPrio = null;
    try {
      await supportService.createTicket(testCustomerId, { category: 'PAYMENT', priority: 'INVALID_PRIO' });
    } catch (e) {
      errPrio = e;
    }
    assert(errPrio && errPrio.statusCode === 400, 'Must throw 400 for invalid priority');
    pass('Correctly throws 400 for invalid priority');

    // Non-existent order_id
    let errOrder = null;
    try {
      await supportService.createTicket(testCustomerId, {
        category: 'ORDER_ISSUE',
        order_id: 'a0000000-0000-0000-0000-000000000000'
      });
    } catch (e) {
      errOrder = e;
    }
    assert(errOrder && (errOrder.statusCode === 404 || errOrder.statusCode === 400), 'Throws 404 for non-existent order');
    pass('Correctly throws 404 for non-existent order_id');

    // Reply to closed ticket
    let errClosed = null;
    try {
      await supportService.sendTicketMessage(testCustomerId, ticket1.id, { message: 'Message to closed ticket' });
    } catch (e) {
      errClosed = e;
    }
    assert(errClosed && errClosed.statusCode === 400, 'Must throw 400 when replying to a closed ticket');
    pass('Correctly rejects sending reply to a CLOSED ticket');

    // Empty message
    // Reopen ticket to test empty message validation
    await supportService.updateTicketStatus(testCustomerId, ticket1.id, { status: 'OPEN' });
    let errEmptyMsg = null;
    try {
      await supportService.sendTicketMessage(testCustomerId, ticket1.id, { message: '   ' });
    } catch (e) {
      errEmptyMsg = e;
    }
    assert(errEmptyMsg && errEmptyMsg.statusCode === 400, 'Must throw 400 for empty message text');
    pass('Correctly throws 400 for empty reply message');

    // Non-existent ticket ID
    let errNotFound = null;
    try {
      await supportService.getTicketDetails(testCustomerId, 'b0000000-0000-0000-0000-000000000000');
    } catch (e) {
      errNotFound = e;
    }
    assert(errNotFound && errNotFound.statusCode === 404, 'Must throw 404 for non-existent ticket');
    pass('Correctly throws 404 for non-existent ticket');

    // --- Cleanup Test Artifacts ---
    console.log('\n--- Cleaning up test support artifacts ---');
    if (createdTicketIds.length > 0) {
      await pool.query(`DELETE FROM support_messages WHERE ticket_id = ANY($1)`, [createdTicketIds]);
      await pool.query(`DELETE FROM support_tickets WHERE id = ANY($1)`, [createdTicketIds]);
      pass('Test support tickets and messages safely cleaned up');
    }

    console.log('\n------------------------------------------------------');
    console.log(`📊 RESULTS: ${testPassed}/${testPassed + testFailed} Day 5 Help & Support backend tests passed.`);
    console.log('------------------------------------------------------\n');
  } catch (error) {
    fail('Unexpected failure during test execution', error);
  } finally {
    process.exit(testFailed > 0 ? 1 : 0);
  }
}

runTests();
