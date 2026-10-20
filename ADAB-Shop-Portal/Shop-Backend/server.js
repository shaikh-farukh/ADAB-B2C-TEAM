const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 5003; 

// Middleware
app.use(cors()); 
app.use(express.json()); 

const rateLimit = require('express-rate-limit');
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Generous limit so active portal usage & tests never get 429 throttled
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

const sellerRoutes = require('./src/routes/seller');
const listingRoutes = require('./src/routes/listing');
const marketingRoutes = require('./src/routes/marketing');
const pricingRoutes = require('./src/routes/pricing');

// Initialize Background Jobs
require('./src/jobs/bulkUploadJob');
require('./src/jobs/pgListener');

// Health / Sample API Route with DB check
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as db_time');
    res.json({ 
      status: 'ok', 
      service: 'ADAB-Shop-Portal Backend', 
      db_time: result.rows[0].db_time 
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed', 
      error: err.message 
    });
  }
});

// Domain Routes
app.use('/api/v1/seller/listings', listingRoutes);
app.use('/api/v1/seller/pricing', pricingRoutes);
app.use('/api/v1/seller', sellerRoutes);
app.use('/api/v1/seller', marketingRoutes);
app.use('/api/v1/seller/marketing', marketingRoutes);

// Invoice PDF / Printable HTML Route
app.get(['/api/v1/orders/:orderId/invoice/pdf', '/api/v1/seller/orders/:orderId/invoice'], async (req, res) => {
  try {
    const { orderId } = req.params;
    const query = `
      SELECT so.id as seller_order_id,
             so.store_id,
             so.status as seller_order_status,
             so.subtotal as store_subtotal,
             o.id as parent_order_id,
             o.order_number,
             o.delivery_mode,
             o.delivery_fee,
             o.total_discount,
             o.total_mrp,
             o.payment_method,
             o.payment_status,
             o.grand_total as amount,
             o.delivery_address,
             u.full_name as customer,
             u.phone as customer_phone,
             inv.invoice_number,
             inv.tax_amount,
             inv.generated_at as invoice_date,
             st.store_name,
             st.address_line as store_address_line,
             st.city as store_city,
             st.state as store_state,
             st.pincode as store_pincode,
             st.phone as store_phone,
             (
               SELECT json_agg(json_build_object(
                 'id', oi.id,
                 'name', COALESCE(oi.product_name, 'Item'),
                 'quantity', oi.quantity,
                 'unit_price', oi.unit_price,
                 'total_price', oi.total_price
               ))
               FROM order_items oi
               WHERE oi.seller_order_id = so.id
             ) as items_list
      FROM seller_orders so
      JOIN orders o ON so.parent_order_id = o.id
      LEFT JOIN stores st ON so.store_id = st.id
      LEFT JOIN users u ON o.customer_id = u.id
      LEFT JOIN invoices inv ON inv.seller_order_id = so.id OR (inv.seller_order_id IS NULL AND inv.order_id = so.parent_order_id)
      WHERE so.id::text = $1 OR o.id::text = $1 OR o.order_number = $1
      LIMIT 1
    `;
    const result = await pool.query(query, [orderId]);
    if (result.rows.length === 0) {
      return res.status(404).send('<h1>Invoice Not Found</h1><p>The requested order invoice could not be found.</p>');
    }
    const r = result.rows[0];
    const itemsSubtotal = Number(r.store_subtotal ?? 0);
    const deliveryFee = Number(r.delivery_fee ?? 0);
    const discount = Number(r.total_discount ?? 0);
    const totalAmount = Number(r.amount ?? (itemsSubtotal + deliveryFee - discount));
    const taxAmount = r.tax_amount != null ? Number(r.tax_amount) : Math.round((itemsSubtotal * 5 / 105) * 100) / 100;
    const taxableAmount = Math.max(0, Math.round((itemsSubtotal - taxAmount) * 100) / 100);
    const cgst = (taxAmount / 2).toFixed(2);
    const sgst = (taxAmount / 2).toFixed(2);
    const invNum = r.invoice_number || `INV-${r.order_number || r.seller_order_id}`;
    const invDt = r.invoice_date ? new Date(r.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const sName = r.store_name || 'ADAB Merchant Store';
    const sGst = r.store_gstin || '24AAACH7409R1ZZ';
    const sAddr = [r.store_address_line, r.store_city, r.store_state, r.store_pincode].filter(Boolean).join(', ') || 'Gujarat, India';
    const sPhone = r.store_phone || '';
    const addr = r.delivery_address || {};
    const custName = r.customer || addr.full_name || 'Customer';
    const custAddr = [addr.address_line, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ') || 'Delivery Address';
    const items = r.items_list || [];

    const itemsRows = items.map((it, idx) => {
      const q = Number(it.quantity) || 1;
      const up = Number(it.unit_price) || 0;
      const tp = Number(it.total_price) || (q * up);
      const itTaxable = Math.round((tp * 100 / 105) * 100) / 100;
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827;">${it.name || 'Item'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${q}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${up.toFixed(2)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${itTaxable.toFixed(2)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">₹${tp.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice - ${invNum}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1f2937; margin: 0; padding: 20px; background: #f3f4f6; }
    .invoice-card { max-width: 800px; margin: 0 auto; background: #fff; padding: 32px; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .top-actions { max-width: 800px; margin: 0 auto 16px auto; display: flex; justify-content: flex-end; gap: 10px; }
    .btn { padding: 9px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px; border: 1px solid transparent; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
    .btn-print { background: #059669; color: white; }
    .btn-print:hover { background: #047857; }
    .header-table { width: 100%; border-bottom: 2px solid #059669; padding-bottom: 16px; margin-bottom: 20px; }
    .tax-badge { display: inline-block; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; font-size: 12px; }
    .info-box { background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 12px 14px; }
    .info-box h4 { margin: 0 0 6px 0; color: #4b5563; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    table.items-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
    table.items-table th { background: #f3f4f6; color: #4b5563; text-transform: uppercase; font-size: 10px; font-weight: 700; padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
    .totals-area { display: flex; justify-content: flex-end; margin-bottom: 24px; font-size: 12px; }
    .totals-table { width: 320px; border-collapse: collapse; }
    .totals-table td { padding: 6px 8px; }
    .totals-table tr.grand-total { border-top: 2px solid #10b981; font-weight: 800; font-size: 14px; color: #065f46; background: #ecfdf5; }
    .footer-note { border-top: 1px dashed #d1d5db; padding-top: 16px; font-size: 11px; color: #6b7280; display: flex; justify-content: space-between; align-items: flex-end; }
    @media print {
      body { background: white; padding: 0; }
      .invoice-card { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="top-actions no-print">
    <button class="btn btn-print" onclick="window.print()">Print / Save as PDF</button>
  </div>
  <div class="invoice-card">
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <h2 style="margin: 0; color: #065f46; font-size: 22px; font-weight: 800;">${sName}</h2>
          <div style="font-size: 12px; color: #4b5563; margin-top: 4px;">${sAddr}</div>
          ${sPhone ? `<div style="font-size: 12px; color: #4b5563;">Phone: ${sPhone}</div>` : ''}
          <div style="font-size: 12px; font-weight: 700; color: #1f2937; margin-top: 4px;">GSTIN: <span style="font-family: monospace;">${sGst}</span></div>
        </td>
        <td style="text-align: right; vertical-align: top;">
          <div class="tax-badge">Tax Invoice • GST Compliant</div>
          <div style="font-size: 18px; font-weight: 800; font-family: monospace; color: #111827; margin-top: 6px;">${invNum}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">Date: <b>${invDt}</b></div>
          <div style="font-size: 12px; color: #6b7280;">Order: <b>#${r.order_number || r.seller_order_id}</b></div>
        </td>
      </tr>
    </table>
    <div class="grid-2">
      <div class="info-box">
        <h4>Billed / Shipped To:</h4>
        <div style="font-weight: 700; color: #111827; font-size: 13px;">${custName}</div>
        <div style="color: #4b5563; margin-top: 3px;">${custAddr}</div>
        ${r.customer_phone ? `<div style="color: #4b5563; margin-top: 3px; font-family: monospace;">Phone: ${r.customer_phone}</div>` : ''}
      </div>
      <div class="info-box">
        <h4>Order & Delivery Details:</h4>
        <div style="color: #4b5563;">Delivery Mode: <b style="text-transform: capitalize; color: #111827;">${r.delivery_mode || 'Normal'}</b></div>
        <div style="color: #4b5563; margin-top: 3px;">Payment Method: <b>${(r.payment_method || 'PREPAID').toUpperCase()}</b></div>
        <div style="color: #4b5563; margin-top: 3px;">Payment Status: <b style="color: #059669;">${(r.payment_status || 'PAID').toUpperCase()}</b></div>
      </div>
    </div>
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          <th>Item Description</th>
          <th style="width: 60px; text-align: center;">Qty</th>
          <th style="width: 100px; text-align: right;">Unit Price</th>
          <th style="width: 110px; text-align: right;">Taxable Value</th>
          <th style="width: 110px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows || '<tr><td colspan="6" style="padding: 12px; text-align: center; color: #9ca3af;">No itemized breakdown recorded</td></tr>'}
      </tbody>
    </table>
    <div class="totals-area">
      <table class="totals-table">
        <tr>
          <td style="color: #6b7280;">Taxable Amount (Excl. Tax):</td>
          <td style="text-align: right; font-weight: 600;">₹${taxableAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="color: #6b7280;">CGST (2.5%):</td>
          <td style="text-align: right; font-weight: 600;">₹${cgst}</td>
        </tr>
        <tr>
          <td style="color: #6b7280;">SGST (2.5%):</td>
          <td style="text-align: right; font-weight: 600;">₹${sgst}</td>
        </tr>
        <tr style="border-top: 1px dashed #e5e7eb;">
          <td style="color: #6b7280; font-weight: 700;">Total GST (5% Inclusive):</td>
          <td style="text-align: right; font-weight: 700; color: #047857;">₹${taxAmount.toFixed(2)}</td>
        </tr>
        <tr style="border-top: 1px solid #e5e7eb;">
          <td style="color: #6b7280; font-weight: 600;">Items Subtotal:</td>
          <td style="text-align: right; font-weight: 700; color: #111827;">₹${itemsSubtotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="color: #6b7280;">Delivery Fee:</td>
          <td style="text-align: right; font-weight: 600;">₹${deliveryFee.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="color: #6b7280;">Discounts:</td>
          <td style="text-align: right; font-weight: 600; color: ${discount > 0 ? '#059669' : '#6b7280'};">${discount > 0 ? `-₹${discount.toFixed(2)}` : '₹0.00'}</td>
        </tr>
        <tr class="grand-total">
          <td style="padding: 10px 8px;">Total Payable:</td>
          <td style="padding: 10px 8px; text-align: right;">₹${totalAmount.toFixed(2)}</td>
        </tr>
      </table>
    </div>
    <div class="footer-note">
      <div>
        <p style="margin: 0; font-weight: 600; color: #374151;">Terms & Conditions:</p>
        <p style="margin: 2px 0 0 0;">1. Goods once sold are covered under ADAB return & refund policies.<br>2. This is a computer-generated tax invoice verified electronically.</p>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: 700; color: #111827; margin-bottom: 24px;">For ${sName}</div>
        <div style="font-size: 10px; color: #6b7280; border-top: 1px solid #9ca3af; padding-top: 4px; display: inline-block;">Authorized Signatory</div>
      </div>
    </div>
  </div>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    console.error('Invoice generation error:', err);
    return res.status(500).send('<h1>Server Error</h1><p>Failed to generate invoice.</p>');
  }
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Initialize Socket.io (with JWT Handshake Authentication & Room Scoping)
const socket = require('./src/config/socket');
const io = socket.init(server);

const sellerService = require('./src/services/seller');

io.on('connection', (clientSocket) => {
  const authUserId = clientSocket.userId || clientSocket.user?.userId;
  console.log(`Client connected to socket: ${clientSocket.id} (user: ${authUserId})`);

  // Handle incoming messages from the frontend via Socket
  clientSocket.on('send_message', async (data) => {
    try {
      const { threadId, content } = data;
      const newMsg = await sellerService.sendThreadMessage(authUserId, threadId, {
        content: content
      });
      
      // Broadcast back to the seller's room (so other tabs sync)
      io.to(authUserId).emit('receive_message', newMsg);
    } catch (err) {
      console.error('Socket send_message error:', err);
    }
  });

  clientSocket.on('mark_read', async (data) => {
    try {
      const { threadId } = data;
      const updatedMsg = await sellerService.markThreadRead(authUserId, threadId);
      io.to(authUserId).emit('message_read_status', updatedMsg);
    } catch (err) {
      console.error('Socket mark_read error:', err);
    }
  });

  clientSocket.on('disconnect', () => {
    console.log('Client disconnected:', clientSocket.id);
  });
});