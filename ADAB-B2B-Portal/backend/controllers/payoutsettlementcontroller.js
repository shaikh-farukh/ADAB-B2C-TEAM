import pool from '../Config/database.js';
import { validationResult } from 'express-validator';
import PDFDocument from 'pdfkit';
import { getManufacturerDistributorsSubquery } from '../utils/distributorScope.js';

// =============================================================
//  HELPER: write a ledger entry and return the new balance
// =============================================================
const writeLedgerEntry = async (client, distributorId, type, referenceId, debit, credit, description, shopId = null) => {
  // get current running balance for this distributor/shop
  let balanceQuery, params;
  if (shopId) {
    balanceQuery = `
      SELECT COALESCE(balance, 0) as balance
      FROM manage_b_to_b_ledger_entries
      WHERE distributor_id = $1 AND shop_id = $2
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `;
    params = [distributorId, shopId];
  } else {
    balanceQuery = `
      SELECT COALESCE(balance, 0) as balance
      FROM manage_b_to_b_ledger_entries
      WHERE distributor_id = $1 AND shop_id IS NULL
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `;
    params = [distributorId];
  }

  const balanceResult = await client.query(balanceQuery, params);
  const currentBalance = parseFloat(balanceResult.rows[0]?.balance || 0);

  // debit increases what they owe, credit decreases it
  const newBalance = currentBalance + parseFloat(debit) - parseFloat(credit);

  await client.query(
    `INSERT INTO manage_b_to_b_ledger_entries
       (distributor_id, shop_id, type, reference_id, description, debit, credit, balance, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
    [distributorId, shopId, type, referenceId, description, debit, credit, newBalance]
  );

  return newBalance;
};

// =============================================================
//  HELPER: process payment allocation, updates invoice, ledger, outstanding, and used credit
// =============================================================
const processAllocation = async (client, paymentId, invoiceId, amount) => {
  // lock payment and invoice
  const paymentResult = await client.query('SELECT * FROM manage_b_to_b_payments WHERE id = $1 FOR UPDATE', [paymentId]);
  const payment = paymentResult.rows[0];
  const invoiceResult = await client.query('SELECT * FROM manage_b_to_b_invoices WHERE id = $1 FOR UPDATE', [invoiceId]);
  const invoice = invoiceResult.rows[0];

  // insert allocation row
  await client.query(
    `INSERT INTO manage_b_to_b_payment_allocations (payment_id, invoice_id, allocated_amount, created_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT (payment_id, invoice_id)
     DO UPDATE SET allocated_amount = manage_b_to_b_payment_allocations.allocated_amount + EXCLUDED.allocated_amount`,
    [paymentId, invoiceId, amount]
  );

  // recalculate total paid on this invoice
  const totalPaidRes = await client.query(
    'SELECT COALESCE(SUM(allocated_amount), 0) as total_paid FROM manage_b_to_b_payment_allocations WHERE invoice_id = $1',
    [invoiceId]
  );
  const totalPaid = parseFloat(totalPaidRes.rows[0].total_paid);
  const invoiceTotal = parseFloat(invoice.total_amount);

  // update invoice status
  const newStatus = parseFloat(totalPaid.toFixed(2)) >= parseFloat(invoiceTotal.toFixed(2)) ? 'paid' : 'partially_paid';
  await client.query(
    'UPDATE manage_b_to_b_invoices SET status = $1, modified_at = CURRENT_TIMESTAMP WHERE id = $2',
    [newStatus, invoiceId]
  );

  // write ledger entry
  await writeLedgerEntry(
    client, payment.distributor_id, 'payment', paymentId,
    0, amount,
    `Payment ${paymentId} allocated to invoice ${invoice.invoice_number}`,
    payment.shop_id
  );

  // update outstanding credit limit & used credit
  if (payment.shop_id) {
    // Shop to Distributor relationship
    await client.query(
      `UPDATE relationship_credits
       SET outstanding_amount = GREATEST(0, outstanding_amount - $1), modified_at = CURRENT_TIMESTAMP
       WHERE creditor_id = $2 AND debtor_id = $3 AND debtor_type = 'shop'`,
      [amount, payment.distributor_id, payment.shop_id]
    );
  } else {
    // Distributor to Manufacturer relationship
    const mId = invoice.manufacturer_id;
    if (mId) {
      await client.query(
        `UPDATE relationship_credits
         SET outstanding_amount = GREATEST(0, outstanding_amount - $1), modified_at = CURRENT_TIMESTAMP
         WHERE creditor_id = $2 AND debtor_id = $3 AND debtor_type = 'distributor'`,
        [amount, mId, payment.distributor_id]
      );
    }
  }
};

// =============================================================
//  HELPER: FIFO auto-allocate remaining amount of a payment to unpaid invoices
// =============================================================
const autoAllocatePaymentInternal = async (client, paymentId) => {
  const paymentResult = await client.query('SELECT * FROM manage_b_to_b_payments WHERE id = $1 FOR UPDATE', [paymentId]);
  const payment = paymentResult.rows[0];

  // calculate how much is already allocated
  const alreadyAllocatedResult = await client.query(
    'SELECT COALESCE(SUM(allocated_amount), 0) as allocated FROM manage_b_to_b_payment_allocations WHERE payment_id = $1',
    [paymentId]
  );
  let remaining = parseFloat(payment.amount) - parseFloat(alreadyAllocatedResult.rows[0].allocated);

  if (remaining <= 0) return { allocations: [], remaining: 0 };

  // Fetch unpaid/partially paid invoices
  let invoicesQuery, params;
  if (payment.shop_id) {
    invoicesQuery = `
      SELECT i.*,
             COALESCE((SELECT SUM(allocated_amount) FROM manage_b_to_b_payment_allocations pa WHERE pa.invoice_id = i.id), 0) as already_paid
      FROM manage_b_to_b_invoices i
      WHERE i.distributor_id = $1 AND i.shop_id = $2
        AND i.status IN ('issued','partially_paid')
        AND i.deleted_at IS NULL
      ORDER BY i.created_at ASC
    `;
    params = [payment.distributor_id, payment.shop_id];
  } else {
    invoicesQuery = `
      SELECT i.*,
             COALESCE((SELECT SUM(allocated_amount) FROM manage_b_to_b_payment_allocations pa WHERE pa.invoice_id = i.id), 0) as already_paid
      FROM manage_b_to_b_invoices i
      WHERE i.distributor_id = $1 AND i.shop_id IS NULL
        AND i.status IN ('issued','partially_paid')
        AND i.deleted_at IS NULL
      ORDER BY i.created_at ASC
    `;
    params = [payment.distributor_id];
  }

  const invoicesResult = await client.query(invoicesQuery, params);
  const allocationsApplied = [];

  for (const invoice of invoicesResult.rows) {
    if (remaining <= 0) break;

    const outstanding = parseFloat(invoice.total_amount) - parseFloat(invoice.already_paid);
    const toAllocate = Math.min(remaining, outstanding);

    await processAllocation(client, paymentId, invoice.id, toAllocate);

    allocationsApplied.push({ invoice_id: invoice.id, invoice_number: invoice.invoice_number, amount: toAllocate });
    remaining -= toAllocate;
  }

  if (remaining > 0) {
    await writeLedgerEntry(
      client, payment.distributor_id, 'overpayment_wallet', payment.id,
      0, remaining,
      `Overpayment of ${remaining.toFixed(2)} moved to wallet`,
      payment.shop_id
    );
    allocationsApplied.push({ type: 'wallet', amount: remaining });
  }

  return { allocations: allocationsApplied, remaining };
};


export const createInvoiceInternal = async (client, order_id, items, gst, due_date, created_by) => {
  // verify order exists and get parties
  const orderCheck = await client.query(
    'SELECT id, distributor_id, manufacturer_id, shop_id, total_amount, status FROM manage_b_to_b_orders WHERE id = $1 AND deleted_at IS NULL',
    [order_id]
  );
  if (orderCheck.rows.length === 0) throw new Error('Order not found');

  const order = orderCheck.rows[0];
  const resolvedDistributorId = order.distributor_id;
  const resolvedManufacturerId = order.manufacturer_id;
  const resolvedShopId = order.shop_id;

  const existingInvoice = await client.query(
    'SELECT id FROM manage_b_to_b_invoices WHERE order_id = $1 AND deleted_at IS NULL',
    [order_id]
  );
  if (existingInvoice.rows.length > 0) return existingInvoice.rows[0]; // Already generated

  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price || item.unit_price) * parseInt(item.qty || item.quantity)), 0);
  const gstPercent = parseFloat(gst || 0);
  const gstAmount = parseFloat((subtotal * gstPercent / 100).toFixed(2));
  const totalAmount = parseFloat((subtotal + gstAmount).toFixed(2));

  const seqResult = await client.query("SELECT nextval('invoice_number_seq') as seq");
  const invoiceNumber = 'INV-' + seqResult.rows[0].seq;

  const insertQuery = `INSERT INTO manage_b_to_b_invoices (
      invoice_number, order_id, distributor_id, manufacturer_id, shop_id,
      subtotal, gst_percentage, tax_amount, total_amount,
      due_date, status, created_at, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10, CURRENT_TIMESTAMP + INTERVAL '30 days'),'issued',CURRENT_TIMESTAMP,$11) RETURNING *`;

  const result = await client.query(insertQuery, [
    invoiceNumber, order_id, resolvedDistributorId, resolvedManufacturerId || null, resolvedShopId || null,
    subtotal, gstPercent, gstAmount, totalAmount,
    due_date || null, created_by
  ]);
  const invoice = result.rows[0];

  await writeLedgerEntry(
    client, resolvedDistributorId, 'invoice', invoice.id,
    totalAmount, 0,
    'Invoice ' + invoiceNumber + ' raised for order #' + order_id,
    resolvedShopId
  );

  return invoice;
};

// =============================================================
//  1. createInvoice
//     POST /api/invoices
//     Creates a financial invoice from a confirmed order.
//     Also writes a DEBIT ledger entry for the distributor.
// =============================================================
export const createInvoice = async (req, res) => {
  const client = await pool.connect();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { order_id, items, gst, due_date } = req.body;

    // verify order exists and get parties
    const orderCheck = await client.query(
      `SELECT id, distributor_id, manufacturer_id, shop_id, total_amount, status
       FROM manage_b_to_b_orders
       WHERE id = $1 AND deleted_at IS NULL`,
      [order_id]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orderCheck.rows[0];
    const resolvedDistributorId = order.distributor_id;
    const resolvedManufacturerId = order.manufacturer_id;
    const resolvedShopId = order.shop_id;

    // check invoice does not already exist for this order
    const existingInvoice = await client.query(
      'SELECT id FROM manage_b_to_b_invoices WHERE order_id = $1 AND deleted_at IS NULL',
      [order_id]
    );

    if (existingInvoice.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Invoice already exists for this order' });
    }

    // calculate amounts from items
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.qty)), 0);
    const gstPercent = parseFloat(gst || 0);
    const gstAmount = parseFloat((subtotal * gstPercent / 100).toFixed(2));
    const totalAmount = parseFloat((subtotal + gstAmount).toFixed(2));

    // generate sequential invoice number
    const seqResult = await client.query(`SELECT nextval('invoice_number_seq') as seq`);
    const invoiceNumber = `INV-${seqResult.rows[0].seq}`;

    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO manage_b_to_b_invoices (
        invoice_number, order_id, distributor_id, manufacturer_id, shop_id,
        subtotal_amount, gst_percent, gst_amount, total_amount,
        due_date, status, created_at, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10, CURRENT_TIMESTAMP + INTERVAL '30 days'),'issued',CURRENT_TIMESTAMP,$11)
      RETURNING *
    `;

    const result = await client.query(insertQuery, [
      invoiceNumber, order_id, resolvedDistributorId, resolvedManufacturerId || null, resolvedShopId || null,
      subtotal, gstPercent, gstAmount, totalAmount,
      due_date || null, req.user.userId
    ]);

    const invoice = result.rows[0];

    // write DEBIT ledger entry — debtor now owes this amount
    await writeLedgerEntry(
      client, resolvedDistributorId, 'invoice', invoice.id,
      totalAmount, 0,
      `Invoice ${invoiceNumber} raised for order #${order_id}`,
      resolvedShopId
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: {
        invoice_id:     invoice.id,
        invoice_number: invoiceNumber,
        total_amount:   totalAmount,
        status:         'issued'
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('createInvoice error:', error);
    res.status(500).json({ success: false, message: 'Failed to create invoice' });
  } finally {
    client.release();
  }
};


// =============================================================
//  2. recordPayment
//     POST /api/payments
//     Captures a payment made by a distributor or shop.
//     Triggers manual allocation (if invoice_id is passed) or auto allocation (FIFO).
// =============================================================
export const recordPayment = async (req, res) => {
  const client = await pool.connect();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { distributor_id, shop_id, amount, mode, reference_id, invoice_id } = req.body;

    // Validate distributor exists
    const distCheck = await client.query(
      'SELECT id FROM manage_b_to_b_userdetail WHERE id = $1 AND deleted_at IS NULL',
      [distributor_id]
    );

    if (distCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Distributor not found' });
    }

    // Validate shop exists if provided
    if (shop_id) {
      const shopCheck = await client.query(
        'SELECT id FROM shopdetail WHERE id = $1 AND delete_at IS NULL',
        [shop_id]
      );
      if (shopCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Shop not found' });
      }
    }

    // Payment mode reference validation
    const requiresRef = ['UPI', 'BANK_TRANSFER', 'CHEQUE', 'BANK TRANSFER'].includes(mode.toUpperCase());
    if (requiresRef && (!reference_id || reference_id.trim() === '')) {
      return res.status(400).json({ success: false, message: `Reference number is required for ${mode} payments` });
    }

    let resolvedDistributorId = distributor_id;
    let resolvedShopId = shop_id;

    if (invoice_id) {
      const invoiceCheck = await client.query(
        `SELECT id, total_amount, status, distributor_id, shop_id,
         COALESCE((SELECT SUM(allocated_amount) FROM manage_b_to_b_payment_allocations WHERE invoice_id = $1), 0) as paid_amount
         FROM manage_b_to_b_invoices WHERE id = $1 AND deleted_at IS NULL`,
        [invoice_id]
      );

      if (invoiceCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Invoice not found' });
      }

      const inv = invoiceCheck.rows[0];
      if (inv.status === 'paid' || inv.status === 'cancelled') {
        return res.status(400).json({ success: false, message: `Cannot pay a ${inv.status} invoice` });
      }

      const outstanding = parseFloat(inv.total_amount) - parseFloat(inv.paid_amount);
      if (parseFloat(amount) > outstanding) {
        return res.status(400).json({
          success: false,
          message: `Outstanding amount exceeded. Outstanding: ${outstanding.toFixed(2)}, Provided: ${parseFloat(amount).toFixed(2)}`
        });
      }

      resolvedDistributorId = inv.distributor_id;
      resolvedShopId = inv.shop_id;
    }

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO manage_b_to_b_payments
         (distributor_id, shop_id, amount, mode, reference_id, status, created_at, created_by)
       VALUES ($1,$2,$3,$4,$5,'success',CURRENT_TIMESTAMP,$6)
       RETURNING *`,
      [resolvedDistributorId, resolvedShopId || null, amount, mode, reference_id || null, req.user.userId]
    );

    const payment = result.rows[0];

    let allocationResult;
    if (invoice_id) {
      await processAllocation(client, payment.id, invoice_id, amount);
      allocationResult = { type: 'manual', invoice_id };
    } else {
      allocationResult = await autoAllocatePaymentInternal(client, payment.id);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Payment recorded and allocated successfully',
      data: {
        payment_id:   payment.id,
        status:       payment.status,
        allocation:   allocationResult
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('recordPayment error:', error);
    res.status(500).json({ success: false, message: 'Failed to record payment' });
  } finally {
    client.release();
  }
};


// =============================================================
//  3. allocatePayment
//     POST /api/payments/allocate
//     Manually maps a payment to one or more invoices.
//     Updates invoice status and writes CREDIT ledger entries.
// =============================================================
export const allocatePayment = async (req, res) => {
  const client = await pool.connect();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { payment_id, allocations } = req.body;
    // allocations = [{ invoice_id, amount }, ...]

    await client.query('BEGIN');

    // lock payment row
    const paymentResult = await client.query(
      'SELECT * FROM manage_b_to_b_payments WHERE id = $1 FOR UPDATE',
      [payment_id]
    );

    if (paymentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const payment = paymentResult.rows[0];

    // how much of this payment is already allocated
    const alreadyAllocatedResult = await client.query(
      'SELECT COALESCE(SUM(allocated_amount), 0) as allocated FROM manage_b_to_b_payment_allocations WHERE payment_id = $1',
      [payment_id]
    );
    const alreadyAllocated = parseFloat(alreadyAllocatedResult.rows[0].allocated);
    const available = parseFloat(payment.amount) - alreadyAllocated;

    const totalRequested = allocations.reduce((sum, a) => sum + parseFloat(a.amount), 0);

    if (parseFloat(totalRequested.toFixed(2)) > parseFloat(available.toFixed(2))) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Allocation amount (${totalRequested}) exceeds available payment balance (${available.toFixed(2)})`
      });
    }

    for (const alloc of allocations) {
      const { invoice_id, amount } = alloc;

      // lock invoice row
      const invoiceResult = await client.query(
        'SELECT * FROM manage_b_to_b_invoices WHERE id = $1 FOR UPDATE',
        [invoice_id]
      );

      if (invoiceResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: `Invoice ${invoice_id} not found` });
      }

      const invoice = invoiceResult.rows[0];

      if (['paid', 'cancelled'].includes(invoice.status)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Invoice ${invoice_id} is already ${invoice.status}`
        });
      }

      await processAllocation(client, payment_id, invoice_id, amount);
    }

    // calculate remaining unallocated amount
    const newAllocatedResult = await client.query(
      'SELECT COALESCE(SUM(allocated_amount), 0) as allocated FROM manage_b_to_b_payment_allocations WHERE payment_id = $1',
      [payment_id]
    );
    const remainingAmount = parseFloat(payment.amount) - parseFloat(newAllocatedResult.rows[0].allocated);

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Payment allocated successfully',
      data: {
        status:           'allocated',
        remaining_amount: parseFloat(remainingAmount.toFixed(2))
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('allocatePayment error:', error);
    res.status(500).json({ success: false, message: 'Failed to allocate payment' });
  } finally {
    client.release();
  }
};


// =============================================================
//  4. autoAllocatePayment
//     POST /api/payments/:id/auto-allocate
//     System auto-matches payment to oldest unpaid invoices
//     (FIFO — oldest invoice gets paid first).
// =============================================================
export const autoAllocatePayment = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id: payment_id } = req.params;

    const paymentResult = await client.query(
      'SELECT * FROM manage_b_to_b_payments WHERE id = $1 FOR UPDATE',
      [payment_id]
    );

    if (paymentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const allocationResult = await autoAllocatePaymentInternal(client, payment_id);

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Payment auto-allocated successfully',
      data: {
        allocations_applied: allocationResult.allocations,
        remaining_as_wallet: parseFloat(allocationResult.remaining.toFixed(2))
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('autoAllocatePayment error:', error);
    res.status(500).json({ success: false, message: 'Failed to auto-allocate payment' });
  } finally {
    client.release();
  }
};


// =============================================================
//  5. updateLedger
//     POST /api/ledger/entry
//     Manually add an adjustment entry to a distributor ledger.
// =============================================================
export const updateLedger = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { distributor_id, debit, credit, description } = req.body;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const newBalance = await writeLedgerEntry(
        client, distributor_id, 'adjustment', null,
        debit || 0, credit || 0, description
      );
      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Ledger entry added',
        data: { new_balance: newBalance }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('updateLedger error:', error);
    res.status(500).json({ success: false, message: 'Failed to update ledger' });
  }
};


// =============================================================
//  6. calculateDistributorBalance
//     GET /api/ledger/:distributor_id/balance
//     Returns outstanding balance + full ledger history.
// =============================================================
export const calculateDistributorBalance = async (req, res) => {
  try {
    const { distributor_id } = req.params;

    // Optional scoping for manufacturer context
    let scopeCondition = '';
    const params = [distributor_id];
    let paramIdx = 2;
    if (req.user && req.user.role === 'manufacturer') {
      scopeCondition = `AND distributor_id IN ${getManufacturerDistributorsSubquery('$' + paramIdx++)}`;
      params.push(parseInt(req.user.userId));
    }

    // latest balance from ledger
    const balanceResult = await pool.query(
      `SELECT COALESCE(balance, 0) as current_balance
       FROM manage_b_to_b_ledger_entries
       WHERE distributor_id = $1 ${scopeCondition}
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      params
    );

    // full ledger history
    const historyResult = await pool.query(
      `SELECT * FROM manage_b_to_b_ledger_entries
       WHERE distributor_id = $1
       ORDER BY created_at DESC`,
      [distributor_id]
    );

    // summary counts
    const summaryResult = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'issued')         AS open_invoices,
         COUNT(*) FILTER (WHERE status = 'partially_paid') AS partial_invoices,
         COALESCE(SUM(total_amount) FILTER (WHERE status IN ('issued','partially_paid')), 0) AS total_outstanding
       FROM manage_b_to_b_invoices
       WHERE distributor_id = $1 AND deleted_at IS NULL`,
      [distributor_id]
    );

    const s = summaryResult.rows[0];

    res.status(200).json({
      success: true,
      data: {
        current_balance:   parseFloat(balanceResult.rows[0]?.current_balance || 0),
        open_invoices:     parseInt(s.open_invoices),
        partial_invoices:  parseInt(s.partial_invoices),
        total_outstanding: parseFloat(s.total_outstanding),
        ledger_history:    historyResult.rows
      }
    });
  } catch (error) {
    console.error('calculateDistributorBalance error:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate balance' });
  }
};


// =============================================================
//  7. generateSettlement
//     POST /api/settlements/generate
//     Calculates manufacturer payable for all collected invoices
//     not yet in a settlement. Applies deductions.
// =============================================================
export const generateSettlement = async (req, res) => {
  const client = await pool.connect();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { manufacturer_id } = req.body;

    await client.query('BEGIN');

    // all paid invoices for this manufacturer not yet in a settlement
    const invoicesResult = await client.query(
      `SELECT i.*
       FROM manage_b_to_b_invoices i
       WHERE i.manufacturer_id = $1
         AND i.status = 'paid'
         AND i.deleted_at IS NULL
         AND i.settlement_id IS NULL`,
      [manufacturer_id]
    );

    if (invoicesResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'No paid invoices available for settlement'
      });
    }

    const totalInvoiceAmount = invoicesResult.rows.reduce(
      (sum, inv) => sum + parseFloat(inv.total_amount), 0
    );

    // collect payments for these invoices
    const invoiceIds = invoicesResult.rows.map(i => i.id);
    const paymentsResult = await client.query(
      `SELECT COALESCE(SUM(pa.allocated_amount), 0) as total_collected
       FROM manage_b_to_b_payment_allocations pa
       WHERE pa.invoice_id = ANY($1)`,
      [invoiceIds]
    );
    const totalCollected = parseFloat(paymentsResult.rows[0].total_collected);

    // apply approved credit notes deduction
    const creditNotesResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as returns_amount
       FROM manage_b_to_b_credit_notes
       WHERE manufacturer_id = $1
         AND invoice_id = ANY($2)
         AND status = 'approved'`,
      [manufacturer_id, invoiceIds]
    );
    const returnsAmount = parseFloat(creditNotesResult.rows[0].returns_amount);

    // calculate deductions (these rates would come from platform config in production)
    const COMMISSION_RATE = 0.05;   // 5%
    const PG_CHARGE_RATE  = 0.02;   // 2%
    const TDS_RATE        = 0.01;   // 1%

    const commission  = parseFloat((totalCollected * COMMISSION_RATE).toFixed(2));
    const pgCharges   = parseFloat((totalCollected * PG_CHARGE_RATE).toFixed(2));
    const tds         = parseFloat((totalCollected * TDS_RATE).toFixed(2));
    let netPayable  = parseFloat(
      (totalCollected - commission - pgCharges - returnsAmount - tds).toFixed(2)
    );

    if (netPayable < 0) netPayable = 0;

    // generate settlement number
    const seqResult = await client.query(`SELECT nextval('settlement_number_seq') as seq`);
    const settlementNumber = `STL-${seqResult.rows[0].seq}`;

    const insertResult = await client.query(
      `INSERT INTO manage_b_to_b_settlements (
         settlement_number, manufacturer_id,
         total_invoice_amount, total_collected,
         commission, pg_charges, returns_amount, tds, net_payable,
         status, created_at, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',CURRENT_TIMESTAMP,$2)
       RETURNING *`,
      [
        settlementNumber, manufacturer_id,
        totalInvoiceAmount, totalCollected,
        commission, pgCharges, returnsAmount, tds, netPayable
      ]
    );

    const settlement = insertResult.rows[0];

    // Link matching invoices to this settlement
    await client.query(
      'UPDATE manage_b_to_b_invoices SET settlement_id = $1 WHERE id = ANY($2)',
      [settlement.id, invoiceIds]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Settlement generated successfully',
      data: {
        settlement_id:        settlement.id,
        settlement_number:    settlementNumber,
        total_invoice_amount: parseFloat(totalInvoiceAmount.toFixed(2)),
        total_collected:      parseFloat(totalCollected.toFixed(2)),
        commission:           commission,
        pg_charges:           pgCharges,
        returns_amount:       returnsAmount,
        tds:                  tds,
        net_payable:          netPayable,
        status:               'pending'
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('generateSettlement error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate settlement' });
  } finally {
    client.release();
  }
};


// =============================================================
//  8. calculateSettlementDeductions
//     GET /api/settlements/:id/deductions
//     Returns breakdown of deductions for a given settlement.
// =============================================================
export const calculateSettlementDeductions = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
         id, settlement_number,
         total_invoice_amount, total_collected,
         commission, pg_charges, returns_amount, tds,
         net_payable, status
       FROM manage_b_to_b_settlements
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Settlement not found' });
    }

    const s = result.rows[0];
    const total_deductions = parseFloat(s.commission) + parseFloat(s.pg_charges) +
                             parseFloat(s.returns_amount) + parseFloat(s.tds);

    res.status(200).json({
      success: true,
      data: {
        settlement_id:        s.id,
        settlement_number:    s.settlement_number,
        total_collected:      parseFloat(s.total_collected),
        deductions: {
          commission:         parseFloat(s.commission),
          pg_charges:         parseFloat(s.pg_charges),
          returns_amount:     parseFloat(s.returns_amount),
          tds:                parseFloat(s.tds),
          total_deductions:   parseFloat(total_deductions.toFixed(2))
        },
        net_payable:          parseFloat(s.net_payable),
        status:               s.status
      }
    });
  } catch (error) {
    console.error('calculateSettlementDeductions error:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate deductions' });
  }
};


// =============================================================
//  9. applyCreditNote
//     POST /api/credit-notes
//     Handles returns and adjustments. Reduces distributor balance.
// =============================================================
export const applyCreditNote = async (req, res) => {
  const client = await pool.connect();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { invoice_id, amount, reason } = req.body;

    await client.query('BEGIN');

    // verify invoice exists
    const invoiceResult = await client.query(
      'SELECT * FROM manage_b_to_b_invoices WHERE id = $1 AND deleted_at IS NULL',
      [invoice_id]
    );

    if (invoiceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];

    if (parseFloat(amount) > parseFloat(invoice.total_amount)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Credit note amount cannot exceed invoice total (${invoice.total_amount})`
      });
    }

    // generate credit note number
    const seqResult = await client.query(`SELECT nextval('credit_note_number_seq') as seq`);
    const creditNoteNumber = `CN-${seqResult.rows[0].seq}`;

    const insertResult = await client.query(
      `INSERT INTO manage_b_to_b_credit_notes
         (credit_note_number, invoice_id, distributor_id, manufacturer_id, amount, reason, status, created_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,'approved',CURRENT_TIMESTAMP,$3)
       RETURNING *`,
      [creditNoteNumber, invoice_id, invoice.distributor_id, invoice.manufacturer_id, amount, reason]
    );

    // write CREDIT ledger entry — distributor owes less
    await writeLedgerEntry(
      client, invoice.distributor_id, 'credit_note', insertResult.rows[0].id,
      0, amount,
      `Credit note ${creditNoteNumber} applied to invoice ${invoice.invoice_number}: ${reason}`
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Credit note applied successfully',
      data: {
        credit_note_id:     insertResult.rows[0].id,
        credit_note_number: creditNoteNumber,
        amount:             parseFloat(amount),
        status:             'approved'
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('applyCreditNote error:', error);
    res.status(500).json({ success: false, message: 'Failed to apply credit note' });
  } finally {
    client.release();
  }
};


// =============================================================
//  10. handleOverpayment
//      POST /api/payments/:id/handle-overpayment
//      Moves unallocated excess payment to distributor wallet
//      (recorded as a CREDIT ledger entry).
// =============================================================
export const handleOverpayment = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id: payment_id } = req.params;

    const paymentResult = await client.query(
      'SELECT * FROM manage_b_to_b_payments WHERE id = $1',
      [payment_id]
    );

    if (paymentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const payment = paymentResult.rows[0];

    // calculate unallocated amount
    const allocatedResult = await client.query(
      'SELECT COALESCE(SUM(allocated_amount), 0) as allocated FROM manage_b_to_b_payment_allocations WHERE payment_id = $1',
      [payment_id]
    );
    const overpayment = parseFloat(payment.amount) - parseFloat(allocatedResult.rows[0].allocated);

    if (overpayment <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'No overpayment found for this payment' });
    }

    // write credit ledger entry — this goes to distributor wallet (can be used against future invoices)
    await writeLedgerEntry(
      client, payment.distributor_id, 'overpayment_wallet', parseInt(payment_id),
      0, overpayment,
      `Overpayment of ${overpayment.toFixed(2)} from payment #${payment_id} moved to wallet`
    );

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Overpayment moved to wallet',
      data: {
        payment_id:        parseInt(payment_id),
        overpayment_amount: parseFloat(overpayment.toFixed(2)),
        wallet_credited:   true
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('handleOverpayment error:', error);
    res.status(500).json({ success: false, message: 'Failed to handle overpayment' });
  } finally {
    client.release();
  }
};


// =============================================================
//  11. createPayout
//      POST /api/payouts
//      Initiates the actual transfer to manufacturer.
//      In production this would call Razorpay/bank API.
//      Here we create the payout record and mark it processing.
// =============================================================
export const createPayout = async (req, res) => {
  const client = await pool.connect();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { settlement_id } = req.body;

    await client.query('BEGIN');

    // verify settlement exists and is in pending state
    const settlementResult = await client.query(
      `SELECT s.*, CONCAT(u.bank_name, ' - ', u.bank_account_no, ' (IFSC: ', u.ifsc_code, ')') AS bank_details
       FROM manage_b_to_b_settlements s
       INNER JOIN manage_b_to_b_userdetail u ON s.manufacturer_id = u.id
       WHERE s.id = $1 AND s.status = 'pending' AND s.deleted_at IS NULL
       FOR UPDATE`,
      [settlement_id]
    );

    if (settlementResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Settlement not found or not in pending state'
      });
    }

    const settlement = settlementResult.rows[0];

    if (!settlement.bank_details) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Manufacturer bank details not configured. Please update bank details first.'
      });
    }

    if (parseFloat(settlement.net_payable) <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Net payable amount is zero or negative, payout cannot be initiated'
      });
    }

    // check no payout already exists for this settlement
    const existingPayout = await client.query(
      `SELECT id FROM manage_b_to_b_payouts
       WHERE settlement_id = $1 AND status IN ('processing','success')`,
      [settlement_id]
    );

    if (existingPayout.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Payout already exists for this settlement' });
    }

    // create payout record
    const payoutResult = await client.query(
      `INSERT INTO manage_b_to_b_payouts
         (settlement_id, manufacturer_id, amount, status, initiated_at, created_at, created_by)
       VALUES ($1,$2,$3,'processing',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,$2)
       RETURNING *`,
      [settlement_id, settlement.manufacturer_id, settlement.net_payable]
    );

    // update settlement to processing
    await client.query(
      `UPDATE manage_b_to_b_settlements
       SET status = 'processing', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [settlement_id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Payout initiated successfully',
      data: {
        payout_id: payoutResult.rows[0].id,
        status:    'processing',
        amount:    parseFloat(settlement.net_payable),
        bank_details: settlement.bank_details
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('createPayout error:', error);
    res.status(500).json({ success: false, message: 'Failed to create payout' });
  } finally {
    client.release();
  }
};


// =============================================================
//  12. updatePayoutStatus
//      PATCH /api/payouts/:id/status
//      Tracks payout lifecycle: processing → success | failed
// =============================================================
export const updatePayoutStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { id } = req.params;
    const { status, transaction_ref, failure_reason } = req.body;

    await client.query('BEGIN');

    const payoutResult = await client.query(
      'SELECT * FROM manage_b_to_b_payouts WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (payoutResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Payout not found' });
    }

    const payout = payoutResult.rows[0];

    if (payout.status !== 'processing') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Payout is already ${payout.status}, cannot update`
      });
    }

    // update payout
    await client.query(
      `UPDATE manage_b_to_b_payouts
       SET status = $1,
           transaction_ref = $2,
           failure_reason  = $3,
           completed_at    = CASE WHEN $1 IN ('success','failed') THEN CURRENT_TIMESTAMP ELSE NULL END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [status, transaction_ref || null, failure_reason || null, id]
    );

    // if success → mark settlement completed
    // if failed  → revert settlement to pending so it can be retried
    const settlementStatus = status === 'success' ? 'completed' : 'pending';
    await client.query(
      `UPDATE manage_b_to_b_settlements
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [settlementStatus, payout.settlement_id]
    );

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: `Payout status updated to ${status}`,
      data: {
        payout_id:       parseInt(id),
        status:          status,
        transaction_ref: transaction_ref || null,
        settlement_status: settlementStatus
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('updatePayoutStatus error:', error);
    res.status(500).json({ success: false, message: 'Failed to update payout status' });
  } finally {
    client.release();
  }
};


// =============================================================
//  13. reconcilePayments
//      GET /api/payments/reconcile/:distributor_id
//      Matches recorded payments against invoices and flags gaps.
// =============================================================
export const reconcilePayments = async (req, res) => {
  try {
    const { distributor_id } = req.params;

    // all invoices
    const invoicesResult = await pool.query(
      `SELECT
         i.id, i.invoice_number, i.total_amount, i.status,
         COALESCE(SUM(pa.allocated_amount), 0) as total_allocated
       FROM manage_b_to_b_invoices i
       LEFT JOIN manage_b_to_b_payment_allocations pa ON i.id = pa.invoice_id
       WHERE i.distributor_id = $1 AND i.deleted_at IS NULL
       GROUP BY i.id
       ORDER BY i.created_at ASC`,
      [distributor_id]
    );

    // all payments
    const paymentsResult = await pool.query(
      `SELECT
         p.id, p.amount, p.payment_mode, p.reference_id, p.status, p.received_at,
         COALESCE(SUM(pa.allocated_amount), 0) as total_allocated
       FROM manage_b_to_b_payments p
       LEFT JOIN manage_b_to_b_payment_allocations pa ON p.id = pa.payment_id
       WHERE p.distributor_id = $1
       GROUP BY p.id
       ORDER BY p.received_at ASC`,
      [distributor_id]
    );

    const totalInvoiced   = invoicesResult.rows.reduce((s, i) => s + parseFloat(i.total_amount), 0);
    const totalPaid       = paymentsResult.rows.reduce((s, p) => s + parseFloat(p.amount), 0);
    const totalUnallocated = paymentsResult.rows.reduce(
      (s, p) => s + (parseFloat(p.amount) - parseFloat(p.total_allocated)), 0
    );

    const discrepancies = invoicesResult.rows
      .filter(i => parseFloat(i.total_allocated) < parseFloat(i.total_amount))
      .map(i => ({
        invoice_id:     i.id,
        invoice_number: i.invoice_number,
        total_amount:   parseFloat(i.total_amount),
        paid_amount:    parseFloat(i.total_allocated),
        gap:            parseFloat((parseFloat(i.total_amount) - parseFloat(i.total_allocated)).toFixed(2))
      }));

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total_invoiced:    parseFloat(totalInvoiced.toFixed(2)),
          total_paid:        parseFloat(totalPaid.toFixed(2)),
          total_unallocated: parseFloat(totalUnallocated.toFixed(2)),
          net_outstanding:   parseFloat((totalInvoiced - totalPaid).toFixed(2)),
          discrepancy_count: discrepancies.length
        },
        discrepancies,
        invoices: invoicesResult.rows,
        payments: paymentsResult.rows
      }
    });
  } catch (error) {
    console.error('reconcilePayments error:', error);
    res.status(500).json({ success: false, message: 'Failed to reconcile payments' });
  }
};


// =============================================================
//  14. validateCreditLimit
//      GET /api/distributors/:id/credit-limit
//      Prevents over-ordering by checking available credit.
// =============================================================
export const validateCreditLimit = async (req, res) => {
  try {
    const { id } = req.params;
    const { order_amount } = req.query;

    const result = await pool.query(
      `SELECT id, company_name, credit_limit, used_credit
       FROM manage_b_to_b_userdetail
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Distributor not found' });
    }

    const d = result.rows[0];
    const available_credit = parseFloat(d.credit_limit) - parseFloat(d.used_credit);
    const requested        = parseFloat(order_amount || 0);
    const allowed          = requested === 0 ? true : requested <= available_credit;

    res.status(200).json({
      success: true,
      data: {
        distributor_id:   d.id,
        company_name:     d.company_name,
        credit_limit:     parseFloat(d.credit_limit),
        used_credit:      parseFloat(d.used_credit),
        available_credit: parseFloat(available_credit.toFixed(2)),
        order_amount:     requested,
        allowed:          allowed,
        message:          allowed
          ? 'Order is within credit limit'
          : `Insufficient credit. Available: ${available_credit.toFixed(2)}, Requested: ${requested}`
      }
    });
  } catch (error) {
    console.error('validateCreditLimit error:', error);
    res.status(500).json({ success: false, message: 'Failed to validate credit limit' });
  }
};


// =============================================================
//  15. getInvoices
//      GET /api/invoices
// =============================================================
export const getInvoices = async (req, res) => {
  try {
    const { distributor_id, manufacturer_id, shop_id, status, order_id } = req.query;
    let query = `
      SELECT i.*,
             o.order_number,
             d.company_name as distributor_name,
             m.company_name as manufacturer_name,
             s.shop_name,
             COALESCE((SELECT SUM(allocated_amount) FROM manage_b_to_b_payment_allocations WHERE invoice_id = i.id), 0) as paid_amount,
             COALESCE((SELECT SUM(amount) FROM manage_b_to_b_credit_notes WHERE invoice_id = i.id AND status = 'approved'), 0) as credited_amount
      FROM manage_b_to_b_invoices i
      LEFT JOIN manage_b_to_b_orders o ON i.order_id = o.id
      LEFT JOIN manage_b_to_b_userdetail d ON i.distributor_id = d.id
      LEFT JOIN manage_b_to_b_userdetail m ON i.manufacturer_id = m.id
      LEFT JOIN shopdetail s ON i.shop_id = s.id
      WHERE i.deleted_at IS NULL
    `;
    const params = [];
    let paramIdx = 1;

    if (distributor_id) {
      query += " AND i.distributor_id = $" + paramIdx++;
      params.push(parseInt(distributor_id));
    }

    if (manufacturer_id) {
      query += " AND i.manufacturer_id = $" + paramIdx++;
      params.push(parseInt(manufacturer_id));
    }

    if (shop_id) {
      query += " AND i.shop_id = $" + paramIdx++;
      params.push(parseInt(shop_id));
    }
    if (status) {
      query += " AND i.status = $" + paramIdx++;
      params.push(status);
    }
    if (order_id) {
      query += " AND i.order_id = $" + paramIdx++;
      params.push(parseInt(order_id));
    }

    query += ` ORDER BY i.created_at DESC`;

    const result = await pool.query(query, params);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getInvoices error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch invoices' });
  }
};


// =============================================================
//  16. getInvoice
//      GET /api/invoices/:id
// =============================================================
export const getInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    let query = `
      SELECT i.*,
              o.order_number,
              d.company_name as distributor_name,
              m.company_name as manufacturer_name,
              s.shop_name,
              COALESCE((SELECT SUM(allocated_amount) FROM manage_b_to_b_payment_allocations WHERE invoice_id = i.id), 0) as paid_amount,
              COALESCE((SELECT SUM(amount) FROM manage_b_to_b_credit_notes WHERE invoice_id = i.id AND status = 'approved'), 0) as credited_amount
       FROM manage_b_to_b_invoices i
       LEFT JOIN manage_b_to_b_orders o ON i.order_id = o.id
       LEFT JOIN manage_b_to_b_userdetail d ON i.distributor_id = d.id
       LEFT JOIN manage_b_to_b_userdetail m ON i.manufacturer_id = m.id
       LEFT JOIN shopdetail s ON i.shop_id = s.id
       WHERE i.id = $1 AND i.deleted_at IS NULL`;

    const params = [id];
    let paramIdx = 2;
    if (req.user && req.user.role === 'manufacturer') {
      query += ` AND i.distributor_id IN ${getManufacturerDistributorsSubquery('$' + paramIdx++)}`;
      params.push(parseInt(req.user.userId));
    }

    const invoiceResult = await pool.query(query, params);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];

    // Fetch order items (line items)
    const itemsResult = await pool.query(
      `SELECT oi.*, p.product_name
       FROM manage_b_to_b_order_items oi
       LEFT JOIN manage_manufacturer_products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [invoice.order_id]
    );

    invoice.items = itemsResult.rows;

    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    console.error('getInvoice error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch invoice details' });
  }
};


// =============================================================
//  17. downloadInvoicePdf
//      GET /api/invoices/:id/download
// =============================================================
export const downloadInvoicePdf = async (req, res) => {
  try {
    const { id } = req.params;
    let query = `
      SELECT i.*,
              o.order_number,
              d.company_name as distributor_name, d.email as distributor_email,
              m.company_name as manufacturer_name, m.email as manufacturer_email,
              s.shop_name, s.email_id as shop_email,
              COALESCE((SELECT SUM(allocated_amount) FROM manage_b_to_b_payment_allocations WHERE invoice_id = i.id), 0) as paid_amount,
              COALESCE((SELECT SUM(amount) FROM manage_b_to_b_credit_notes WHERE invoice_id = i.id AND status = 'approved'), 0) as credited_amount
       FROM manage_b_to_b_invoices i
       LEFT JOIN manage_b_to_b_orders o ON i.order_id = o.id
       LEFT JOIN manage_b_to_b_userdetail d ON i.distributor_id = d.id
       LEFT JOIN manage_b_to_b_userdetail m ON i.manufacturer_id = m.id
       LEFT JOIN shopdetail s ON i.shop_id = s.id
       WHERE i.id = $1 AND i.deleted_at IS NULL`;

    const params = [id];
    let paramIdx = 2;
    if (req.user && req.user.role === 'manufacturer') {
      query += ` AND i.distributor_id IN ${getManufacturerDistributorsSubquery('$' + paramIdx++)}`;
      params.push(parseInt(req.user.userId));
    }

    const invoiceResult = await pool.query(query, params);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];

    // Fetch items
    const itemsResult = await pool.query(
      `SELECT oi.*, p.product_name
       FROM manage_b_to_b_order_items oi
       LEFT JOIN manage_manufacturer_products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [invoice.order_id]
    );

    // Fetch payments
    const paymentsResult = await pool.query(
      `SELECT p.id, p.payment_mode, p.reference_id, p.received_at, pa.allocated_amount
       FROM manage_b_to_b_payment_allocations pa
       JOIN manage_b_to_b_payments p ON pa.payment_id = p.id
       WHERE pa.invoice_id = $1 AND p.status = 'successful'
       ORDER BY p.received_at ASC`,
      [invoice.id]
    );

    const totalAmount = parseFloat(invoice.total_amount) || 0;
    const paidAmount = parseFloat(invoice.paid_amount) || 0;
    const creditedAmount = parseFloat(invoice.credited_amount) || 0;
    const outstandingAmount = Math.max(0, totalAmount - paidAmount - creditedAmount);

    let paymentStatus = 'unpaid';
    if (outstandingAmount <= 0) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0) {
      paymentStatus = 'partially_paid';
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice_${invoice.invoice_number}.pdf`);

    doc.pipe(res);

    // Invoice Header
    doc.fontSize(20).text('INVOICE', { align: 'right' });
    doc.fontSize(10).text(`Invoice Number: ${invoice.invoice_number}`, { align: 'right' });
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, { align: 'right' });
    if (invoice.due_date) {
      doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, { align: 'right' });
    }
    doc.text(`Status: ${paymentStatus.replace('_', ' ').toUpperCase()}`, { align: 'right' });
    doc.moveDown(2);

    // Vendor & Client Details
    const yPos = doc.y;
    doc.fontSize(12).text('Issued By:', 50, yPos, { underline: true });
    if (invoice.manufacturer_name) {
      doc.fontSize(10).text(invoice.manufacturer_name);
      doc.text(invoice.manufacturer_email || '');
    } else if (invoice.distributor_name) {
      doc.fontSize(10).text(invoice.distributor_name);
      doc.text(invoice.distributor_email || '');
    }

    doc.fontSize(12).text('Bill To:', 300, yPos, { underline: true });
    if (invoice.shop_name) {
      doc.fontSize(10).text(invoice.shop_name, 300);
      doc.text(invoice.shop_email || '', 300);
    } else if (invoice.distributor_name) {
      doc.fontSize(10).text(invoice.distributor_name, 300);
      doc.text(invoice.distributor_email || '', 300);
    }

    doc.moveDown(2);

    // Order number
    doc.fontSize(11).text(`Reference Order: ${invoice.order_number || ('#' + invoice.order_id)}`, 50);
    doc.moveDown(1);

    // Table Header
    const tableTop = doc.y;
    doc.fontSize(10);
    doc.text('Item', 50, tableTop, { width: 200 });
    doc.text('SKU', 250, tableTop, { width: 100 });
    doc.text('Price', 350, tableTop, { width: 60, align: 'right' });
    doc.text('Qty', 420, tableTop, { width: 40, align: 'right' });
    doc.text('Total', 480, tableTop, { width: 80, align: 'right' });

    doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();

    let currentY = tableTop + 25;
    itemsResult.rows.forEach(item => {
      const price = item.price || item.unit_price || 0;
      const qty = item.qty || item.quantity || 0;
      doc.text(item.product_name || `Product ID: ${item.product_id}`, 50, currentY, { width: 200 });
      doc.text(item.product_sku || '-', 250, currentY, { width: 100 });
      doc.text(parseFloat(price).toFixed(2), 350, currentY, { width: 60, align: 'right' });
      doc.text(qty.toString(), 420, currentY, { width: 40, align: 'right' });
      const itemTotal = parseFloat(price) * qty;
      doc.text(itemTotal.toFixed(2), 480, currentY, { width: 80, align: 'right' });
      currentY += 20;
    });

    doc.moveTo(50, currentY).lineTo(560, currentY).stroke();
    currentY += 15;

    // Totals
    doc.text('Subtotal:', 350, currentY, { width: 120, align: 'right' });
    doc.text(parseFloat(invoice.subtotal_amount).toFixed(2), 480, currentY, { width: 80, align: 'right' });

    currentY += 15;
    doc.text(`GST (${invoice.gst_percent}%):`, 350, currentY, { width: 120, align: 'right' });
    doc.text(parseFloat(invoice.gst_amount).toFixed(2), 480, currentY, { width: 80, align: 'right' });

    currentY += 20;
    doc.fontSize(12).text('Total Amount:', 350, currentY, { width: 120, align: 'right', bold: true });
    doc.text(parseFloat(invoice.total_amount).toFixed(2), 480, currentY, { width: 80, align: 'right', bold: true });

    // Payment Summary
    currentY += 25;
    doc.fontSize(12).text('Payment Summary', 50, currentY, { underline: true });
    currentY += 20;
    doc.fontSize(10);

    doc.text('Total Amount:', 50, currentY, { width: 150 });
    doc.text(totalAmount.toFixed(2), 200, currentY, { width: 100, align: 'right' });
    currentY += 15;

    doc.text('Paid Amount:', 50, currentY, { width: 150 });
    doc.text(paidAmount.toFixed(2), 200, currentY, { width: 100, align: 'right' });
    currentY += 15;

    if (creditedAmount > 0) {
      doc.text('Credited Amount:', 50, currentY, { width: 150 });
      doc.text(creditedAmount.toFixed(2), 200, currentY, { width: 100, align: 'right' });
      currentY += 15;
    }

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Outstanding Amount:', 50, currentY, { width: 150 });
    doc.text(outstandingAmount.toFixed(2), 200, currentY, { width: 100, align: 'right' });
    doc.font('Helvetica');
    currentY += 25;

    // Payment History
    if (paymentsResult.rows.length > 0) {
      doc.fontSize(12).text('Payment History', 50, currentY, { underline: true });
      currentY += 20;
      doc.fontSize(10);

      doc.text('Date', 50, currentY, { width: 100 });
      doc.text('Method', 150, currentY, { width: 100 });
      doc.text('Reference', 250, currentY, { width: 150 });
      doc.text('Amount', 400, currentY, { width: 100, align: 'right' });

      doc.moveTo(50, currentY + 15).lineTo(500, currentY + 15).stroke();
      currentY += 25;

      paymentsResult.rows.forEach(payment => {
        const dateStr = payment.received_at ? new Date(payment.received_at).toLocaleDateString() : 'N/A';
        doc.text(dateStr, 50, currentY, { width: 100 });
        doc.text(payment.payment_mode || 'N/A', 150, currentY, { width: 100 });
        doc.text(payment.reference_id || 'N/A', 250, currentY, { width: 150 });
        doc.text(parseFloat(payment.allocated_amount).toFixed(2), 400, currentY, { width: 100, align: 'right' });
        currentY += 20;
      });
    }

    doc.end();
  } catch (error) {
    console.error('downloadInvoicePdf error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF', error: error.message, stack: error.stack });
  }
};


// =============================================================
//  18. getAgingReport
//      GET /api/invoices/aging
// =============================================================
export const getAgingReport = async (req, res) => {
  try {
    const { distributor_id, manufacturer_id, shop_id, group_by } = req.query;

    let baseQuery = `
      SELECT
        ${group_by === 'distributor' ? 'distributor_id, distributor_name,' : ''}
        ${group_by === 'shop' ? 'shop_id, shop_name,' : ''}
        CASE
          WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN '0-30'
          WHEN created_at >= CURRENT_DATE - INTERVAL '60 days' THEN '31-60'
          WHEN created_at >= CURRENT_DATE - INTERVAL '90 days' THEN '61-90'
          ELSE '90+'
        END as age_bucket,
        COALESCE(SUM(total_amount - total_allocated), 0) as outstanding_amount,
        COUNT(*)::int as invoice_count
      FROM (
        SELECT i.*,
               d.company_name as distributor_name,
               s.shop_name as shop_name,
               COALESCE((SELECT SUM(allocated_amount) FROM manage_b_to_b_payment_allocations WHERE invoice_id = i.id), 0) as total_allocated
        FROM manage_b_to_b_invoices i
        LEFT JOIN manage_b_to_b_userdetail d ON i.distributor_id = d.id
        LEFT JOIN shopdetail s ON i.shop_id = s.id
        WHERE i.status IN ('issued', 'partially_paid') AND i.deleted_at IS NULL
    `;

    const params = [];
    let paramIdx = 1;

    if (distributor_id) {
      baseQuery += ` AND i.distributor_id = $${paramIdx++}`;
      params.push(parseInt(distributor_id));
    }
    if (req.user && req.user.role === 'manufacturer') {
      baseQuery += ` AND i.distributor_id IN ${getManufacturerDistributorsSubquery('$' + paramIdx++)}`;
      params.push(parseInt(req.user.userId));
    } else if (manufacturer_id) {
      baseQuery += ` AND i.manufacturer_id = $${paramIdx++}`;
      params.push(parseInt(manufacturer_id));
    }
    if (shop_id) {
      baseQuery += ` AND i.shop_id = $${paramIdx++}`;
      params.push(parseInt(shop_id));
    }

    let groupClause = 'GROUP BY ';
    if (group_by === 'distributor') groupClause += 'distributor_id, distributor_name, ';
    if (group_by === 'shop') groupClause += 'shop_id, shop_name, ';
    groupClause += 'age_bucket';

    baseQuery += `
      ) sub
      ${groupClause}
    `;

    const result = await pool.query(baseQuery, params);

    if (group_by === 'distributor') {
      const distMap = {};
      result.rows.forEach(row => {
        if (!distMap[row.distributor_id]) {
          distMap[row.distributor_id] = {
            distributor_id: row.distributor_id,
            distributor_name: row.distributor_name || 'Unknown',
            '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0
          };
        }
        const amt = parseFloat(row.outstanding_amount) || 0;
        distMap[row.distributor_id][row.age_bucket] = amt;
        distMap[row.distributor_id].total += amt;
      });
      return res.status(200).json({ success: true, data: Object.values(distMap) });
    }

    if (group_by === 'shop') {
      const shopMap = {};
      result.rows.forEach(row => {
        if (!shopMap[row.shop_id]) {
          shopMap[row.shop_id] = {
            shop_id: row.shop_id,
            shop_name: row.shop_name || 'Unknown',
            '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0
          };
        }
        const amt = parseFloat(row.outstanding_amount) || 0;
        shopMap[row.shop_id][row.age_bucket] = amt;
        shopMap[row.shop_id].total += amt;
      });
      return res.status(200).json({ success: true, data: Object.values(shopMap) });
    }

    // Format response to ensure all buckets are represented
    const buckets = {
      '0-30': { outstanding_amount: 0, invoice_count: 0 },
      '31-60': { outstanding_amount: 0, invoice_count: 0 },
      '61-90': { outstanding_amount: 0, invoice_count: 0 },
      '90+': { outstanding_amount: 0, invoice_count: 0 }
    };

    result.rows.forEach(row => {
      if (buckets[row.age_bucket]) {
        buckets[row.age_bucket] = {
          outstanding_amount: parseFloat(row.outstanding_amount),
          invoice_count: parseInt(row.invoice_count)
        };
      }
    });

    res.status(200).json({ success: true, data: buckets });
  } catch (error) {
    console.error('getAgingReport error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate aging report' });
  }
};


// =============================================================
//  19. getSettlements
//      GET /api/settlements
// =============================================================
export const getSettlements = async (req, res) => {
  try {
    const { manufacturer_id, distributor_id, shop_id, status, from, to } = req.query;

    let query = `
      SELECT DISTINCT s.*,
             m.company_name as manufacturer_name,
             sh.shop_name
      FROM manage_b_to_b_settlements s
      LEFT JOIN manage_b_to_b_userdetail m ON s.manufacturer_id = m.id
      LEFT JOIN shopdetail sh ON s.shop_id = sh.id
    `;

    const params = [];
    let paramIdx = 1;
    const conditions = ['s.deleted_at IS NULL'];

    if (req.user && req.user.role === 'manufacturer') {
      // For settlements, manufacturer filters by their mapped distributors OR created_by them.
      // We will filter by the mapped distributors using the helper.
      conditions.push(`s.manufacturer_id = $${paramIdx++}`);
      params.push(parseInt(req.user.userId));
    } else if (manufacturer_id) {
      conditions.push(`s.manufacturer_id = $${paramIdx++}`);
      params.push(parseInt(manufacturer_id));
    }
    if (shop_id) {
      conditions.push(`s.shop_id = $${paramIdx++}`);
      params.push(parseInt(shop_id));
    }
    if (status) {
      conditions.push(`s.status = $${paramIdx++}`);
      params.push(status);
    }
    if (from) {
      conditions.push(`s.created_at >= $${paramIdx++}`);
      params.push(from);
    }
    if (to) {
      // Include the entire day for the 'to' date
      conditions.push(`s.created_at <= $${paramIdx++}::timestamp + interval '1 day' - interval '1 microsecond'`);
      params.push(to);
    }
    if (distributor_id) {
      conditions.push(`(s.manufacturer_id = $${paramIdx} OR s.created_by = $${paramIdx})`);
      params.push(parseInt(distributor_id));
      paramIdx++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY s.created_at DESC`;

    const result = await pool.query(query, params);

    // Fetch related invoices and payouts for each settlement
    const settlements = [];
    for (const row of result.rows) {
      const invoicesRes = await pool.query(
        `SELECT i.*, o.order_number,
                COALESCE((SELECT SUM(allocated_amount) FROM manage_b_to_b_payment_allocations WHERE invoice_id = i.id), 0) as paid_amount,
                COALESCE((SELECT SUM(amount) FROM manage_b_to_b_credit_notes WHERE invoice_id = i.id AND status = 'approved'), 0) as credited_amount
         FROM manage_b_to_b_invoices i
         LEFT JOIN manage_b_to_b_orders o ON i.order_id = o.id
         WHERE i.settlement_id = $1`,
        [row.id]
      );

      const payoutRes = await pool.query(
        `SELECT * FROM manage_b_to_b_payouts WHERE settlement_id = $1 LIMIT 1`,
        [row.id]
      );

      settlements.push({
        id: `stl-${row.id}`,
        settlementNumber: row.settlement_number,
        manufacturerName: row.manufacturer_name,
        totalInvoiceAmount: parseFloat(row.total_invoice_amount),
        totalCollected: parseFloat(row.total_collected),
        commission: parseFloat(row.commission),
        pgCharges: parseFloat(row.pg_charges),
        returnsAmount: parseFloat(row.returns_amount),
        tdsAmount: parseFloat(row.tds),
        netPayable: parseFloat(row.net_payable),
        status: row.status,
        createdAt: row.created_at,
        payout: payoutRes.rows[0] ? {
          transactionRef: payoutRes.rows[0].transaction_ref,
          amount: parseFloat(payoutRes.rows[0].amount),
          status: payoutRes.rows[0].status
        } : null,
        invoices: invoicesRes.rows.map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          orderNumber: inv.order_number,
          totalAmount: parseFloat(inv.total_amount),
          paidAmount: parseFloat(inv.paid_amount),
          creditedAmount: parseFloat(inv.credited_amount),
          balanceAmount: parseFloat(inv.total_amount) - parseFloat(inv.paid_amount) - parseFloat(inv.credited_amount)
        }))
      });
    }

    res.status(200).json({ success: true, data: settlements });
  } catch (error) {
    console.error('getSettlements error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settlements' });
  }
};


// =============================================================
//  20. getPayments
//      GET /api/payments
// =============================================================
export const getPayments = async (req, res) => {
  try {
    const { distributor_id, shop_id, type, from, to } = req.query;
    let query = `
      SELECT p.*,
             d.company_name as distributor_name,
             s.shop_name
      FROM manage_b_to_b_payments p
      LEFT JOIN manage_b_to_b_userdetail d ON p.distributor_id = d.id
      LEFT JOIN shopdetail s ON p.shop_id = s.id
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    if (distributor_id) {
      query += " AND p.distributor_id = $" + paramIdx++;
      params.push(parseInt(distributor_id));
    } else if (req.user && req.user.role === 'manufacturer') {
      query += ` AND p.distributor_id IN ${getManufacturerDistributorsSubquery('$' + paramIdx++)}`;
      params.push(parseInt(req.user.userId));
    }
    if (shop_id) {
      query += " AND p.shop_id = $" + paramIdx++;
      params.push(parseInt(shop_id));
    }

    query += ` ORDER BY p.created_at DESC`;

    const result = await pool.query(query, params);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getPayments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
};


// =============================================================
//  21. getLedgerEntries
//      GET /api/ledger
// =============================================================
export const getLedgerEntries = async (req, res) => {
  try {
    const { distributor_id, shop_id } = req.query;
    let query = `
      SELECT l.*,
             d.company_name as distributor_name,
             s.shop_name
      FROM manage_b_to_b_ledger_entries l
      LEFT JOIN manage_b_to_b_userdetail d ON l.distributor_id = d.id
      LEFT JOIN shopdetail s ON l.shop_id = s.id
    `;
    const params = [];
    let paramIdx = 1;
    const conditions = [];

    if (distributor_id) {
      conditions.push(`l.distributor_id = $${paramIdx++}`);
      params.push(parseInt(distributor_id));
    } else if (req.user && req.user.role === 'manufacturer') {
      // Ensure manufacturer only sees ledger entries for their mapped distributors
      conditions.push(`l.distributor_id IN ${getManufacturerDistributorsSubquery('$' + paramIdx++)}`);
      params.push(parseInt(req.user.userId));
    }

    if (shop_id) {
      conditions.push(`l.shop_id = $${paramIdx++}`);
      params.push(parseInt(shop_id));
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY l.created_at DESC, l.id DESC`;

    const result = await pool.query(query, params);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getLedgerEntries error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ledger entries' });
  }
};