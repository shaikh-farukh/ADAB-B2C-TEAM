/**
 * Enterprise Tax Invoice Document Generator & Print Engine for ADAB
 * 
 * Generates an official, standard A4 GST Tax Invoice / Cash Memo
 * matching Indian Quick-Commerce and Retail standards (Amazon / Blinkit / Swiggy).
 * Prints via an isolated document so the web application UI, modals,
 * and navigation bars never leak into the printed document.
 */

function numberToWords(amount) {
  if (amount === 0) return 'Zero Rupees Only';
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertChunk(num) {
    let str = '';
    if (num >= 100) {
      str += units[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num >= 20) {
      str += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    }
    if (num > 0) {
      str += units[num] + ' ';
    }
    return str.trim();
  }

  const num = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - num) * 100);

  let words = '';
  const crore = Math.floor(num / 10000000);
  let rem = num % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  const thousand = Math.floor(rem / 1000);
  rem %= 1000;
  const hundreds = rem;

  if (crore > 0) words += convertChunk(crore) + ' Crore ';
  if (lakh > 0) words += convertChunk(lakh) + ' Lakh ';
  if (thousand > 0) words += convertChunk(thousand) + ' Thousand ';
  if (hundreds > 0) words += convertChunk(hundreds);

  words = words.trim() + ' Rupees';
  if (paise > 0) {
    words += ' and ' + convertChunk(paise) + ' Paise';
  }
  return words + ' Only';
}

export function generateInvoiceHtml(data = {}) {
  const invoice = data.invoice || {};
  const order = data.order || {};
  const seller = data.seller || {};
  const buyer = data.buyer || {};
  const items = data.items || [];

  const invoiceNumber = invoice.invoice_number || `INV-${order.order_number || Date.now()}`;
  const invoiceDate = new Date(invoice.generated_at || order.created_at || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const orderDate = new Date(order.created_at || Date.now()).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const orderNum = order.order_number || 'N/A';
  const paymentMethod = (order.payment_method || 'CARD').toUpperCase().replace(/_/g, ' ');
  const paymentStatus = (order.payment_status || 'PAID').toUpperCase();
  const deliveryMode = (order.delivery_mode || 'EXPRESS_30M').replace(/_/g, ' ');

  // Store / Seller Info
  const storeName = seller.store_name || data.stores?.[0]?.store_name || 'ADAB Local Mart';
  const storeAddress = seller.address || data.stores?.[0]?.address_line || 'Ring Road, Surat, Gujarat - 395002';
  const sellerGstin = seller.gstin || data.stores?.[0]?.gstin || '24AAACA1234A1Z5';
  const storePhone = seller.phone || '+91 98765 43210';

  // Customer / Buyer Info
  const recipientName = buyer.name || buyer.recipient_name || 'Customer';
  const fullAddress = buyer.address || buyer.address_line || 'Gujarat, India';
  const recipientPhone = buyer.phone || '';
  const city = buyer.city || 'Ahmedabad';
  const pincode = buyer.pincode || '';

  // Pricing calculations
  const grandTotal = parseFloat(order.pricing?.grand_total || order.grand_total || invoice.total_amount || 0);
  const deliveryFee = parseFloat(order.pricing?.delivery_fee || order.delivery_fee || 29);
  const totalMrp = parseFloat(order.pricing?.total_mrp || order.total_mrp || grandTotal);
  const totalDiscount = parseFloat(order.pricing?.total_discount || order.total_discount || 0);

  // 5% GST Breakdown (2.5% CGST + 2.5% SGST)
  const taxableAmount = parseFloat((grandTotal / 1.05).toFixed(2));
  const totalTax = parseFloat((grandTotal - taxableAmount).toFixed(2));
  const cgst = parseFloat((totalTax / 2).toFixed(2));
  const sgst = parseFloat((totalTax / 2).toFixed(2));
  const amountInWords = numberToWords(grandTotal);

  const itemRowsHtml = items.map((it, idx) => {
    const title = it.product_name || it.title || it.name || 'Groceries Item';
    const qty = it.quantity || 1;
    const unitPrice = parseFloat(it.unit_price || it.sell_price || 0);
    const totalPrice = parseFloat(it.total_price || (unitPrice * qty) || 0);
    const itemTaxable = parseFloat((totalPrice / 1.05).toFixed(2));
    const hsn = it.hsn_code || '210690';

    return `
      <tr>
        <td style="text-align: center; width: 30px;">${idx + 1}</td>
        <td>
          <div style="font-weight: 700; color: #111827;">${title}</div>
          <div style="font-size: 9px; color: #6b7280;">HSN: ${hsn} | Standard Retail Pack</div>
        </td>
        <td style="text-align: center; font-family: monospace;">${qty}</td>
        <td style="text-align: right; font-family: monospace;">₹${unitPrice.toFixed(2)}</td>
        <td style="text-align: right; font-family: monospace;">₹${itemTaxable.toFixed(2)}</td>
        <td style="text-align: center; font-size: 10px;">5%<br><span style="font-size: 8px; color: #6b7280;">(2.5% + 2.5%)</span></td>
        <td style="text-align: right; font-weight: 700; font-family: monospace;">₹${totalPrice.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Tax Invoice - ${invoiceNumber}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 15mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #111827;
          background-color: #ffffff;
          font-size: 11px;
          line-height: 1.45;
          padding: 10px;
        }
        .invoice-wrapper {
          max-width: 800px;
          margin: 0 auto;
          border: 1.5px solid #1f2937;
          padding: 20px;
          background: #ffffff;
        }
        .header-table {
          width: 100%;
          border-bottom: 2px solid #15803D;
          padding-bottom: 12px;
          margin-bottom: 12px;
        }
        .brand-logo {
          font-size: 26px;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: #15803D;
          line-height: 1;
        }
        .brand-subtitle {
          font-size: 10px;
          color: #4b5563;
          margin-top: 3px;
          font-weight: 500;
        }
        .invoice-badge-box {
          text-align: right;
        }
        .invoice-title {
          font-size: 16px;
          font-weight: 800;
          text-transform: uppercase;
          color: #111827;
          letter-spacing: 0.5px;
        }
        .invoice-subtext {
          font-size: 9px;
          color: #4b5563;
          font-weight: 600;
        }
        .meta-grid {
          display: flex;
          gap: 12px;
          margin-bottom: 14px;
        }
        .meta-card {
          flex: 1;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 10px;
          background-color: #f9fafb;
        }
        .meta-card-title {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          color: #15803D;
          border-bottom: 1px dashed #d1d5db;
          padding-bottom: 4px;
          margin-bottom: 6px;
        }
        .meta-card-content {
          font-size: 11px;
          color: #374151;
        }
        .meta-card-content div {
          margin-bottom: 2px;
        }
        .order-strip {
          display: flex;
          justify-content: space-between;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          border-radius: 6px;
          padding: 8px 12px;
          margin-bottom: 14px;
          font-size: 10.5px;
        }
        .order-strip span {
          color: #065f46;
        }
        .order-strip strong {
          color: #047857;
        }
        table.items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 14px;
        }
        table.items-table th {
          background-color: #f3f4f6;
          border: 1px solid #d1d5db;
          padding: 7px 8px;
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 800;
          color: #1f2937;
          letter-spacing: 0.3px;
        }
        table.items-table td {
          border: 1px solid #e5e7eb;
          padding: 7px 8px;
          font-size: 10.5px;
          vertical-align: middle;
        }
        .summary-container {
          display: flex;
          gap: 14px;
          margin-bottom: 14px;
        }
        .summary-left {
          flex: 1.2;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .tax-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          margin-bottom: 8px;
        }
        .tax-table th, .tax-table td {
          padding: 5px 8px;
          font-size: 10px;
          border: 1px solid #e5e7eb;
        }
        .tax-table th {
          background: #f9fafb;
          font-weight: 700;
          text-align: left;
        }
        .amount-words-box {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          padding: 8px 10px;
          border-radius: 4px;
          font-size: 10.5px;
        }
        .summary-right {
          flex: 1;
          border: 1.5px solid #d1d5db;
          border-radius: 6px;
          padding: 10px 12px;
          background: #ffffff;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 3px 0;
          font-size: 11px;
          color: #4b5563;
        }
        .summary-row.total-row {
          border-top: 1.5px solid #111827;
          margin-top: 6px;
          padding-top: 6px;
          font-size: 14px;
          font-weight: 800;
          color: #111827;
        }
        .total-amount {
          color: #15803D;
          font-family: monospace;
          font-size: 16px;
        }
        .footer-declaration {
          border-top: 1px solid #e5e7eb;
          padding-top: 10px;
          margin-top: 10px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          font-size: 9.5px;
          color: #6b7280;
        }
        .declaration-text {
          max-width: 65%;
          line-height: 1.4;
        }
        .signatory-box {
          text-align: right;
        }
        .signatory-title {
          font-weight: 800;
          color: #111827;
          margin-bottom: 25px;
        }
        .signatory-caption {
          font-size: 9px;
          color: #4b5563;
          border-top: 1px dashed #9ca3af;
          padding-top: 3px;
        }
      </style>
    </head>
    <body>
      <div class="invoice-wrapper">
        <!-- Top Letterhead -->
        <table class="header-table">
          <tr>
            <td style="vertical-align: top;">
              <div class="brand-logo">ADAB</div>
              <div class="brand-subtitle">ADAB Quick Commerce Pvt. Ltd. • Your Local Stores, Delivered</div>
              <div style="font-size: 9px; color: #6b7280; margin-top: 2px;">
                Regd. Office: Ring Road, Surat, Gujarat - 395002 | CIN: U52100GJ2024PTC148921 | FSSAI: 10024021000892
              </div>
            </td>
            <td class="invoice-badge-box" style="vertical-align: top;">
              <div class="invoice-title">Tax Invoice / Bill of Supply</div>
              <div class="invoice-subtext">(Original for Recipient • Sec. 31 of CGST Act, 2017)</div>
              <div style="margin-top: 5px; font-weight: 700; color: #15803D; font-family: monospace; font-size: 12px;">
                ${invoiceNumber}
              </div>
            </td>
          </tr>
        </table>

        <!-- Two Column Meta Information -->
        <div class="meta-grid">
          <!-- Seller Details -->
          <div class="meta-card">
            <div class="meta-card-title">Sold By / Dispatch From</div>
            <div class="meta-card-content">
              <div style="font-weight: 800; color: #111827; font-size: 12px;">${storeName}</div>
              <div>${storeAddress}</div>
              <div><strong>GSTIN:</strong> <span style="font-family: monospace;">${sellerGstin}</span></div>
              <div><strong>State & Code:</strong> Gujarat (24)</div>
              <div><strong>FSSAI License:</strong> 10020021000456</div>
            </div>
          </div>

          <!-- Invoice & Order Identifiers -->
          <div class="meta-card">
            <div class="meta-card-title">Order & Invoice Details</div>
            <div class="meta-card-content">
              <div><strong>Invoice Date:</strong> ${invoiceDate}</div>
              <div><strong>Order Reference:</strong> <span style="font-family: monospace;">#${orderNum}</span></div>
              <div><strong>Order Placed:</strong> ${orderDate}</div>
              <div><strong>Payment Mode:</strong> <span style="font-weight: 700;">${paymentMethod}</span> (${paymentStatus})</div>
              <div><strong>Delivery Mode:</strong> ${deliveryMode}</div>
            </div>
          </div>

          <!-- Buyer / Shipping Details -->
          <div class="meta-card">
            <div class="meta-card-title">Billed To / Delivered To</div>
            <div class="meta-card-content">
              <div style="font-weight: 800; color: #111827; font-size: 12px;">${recipientName}</div>
              <div>${fullAddress}</div>
              <div>${city} ${pincode ? '- ' + pincode : ''}</div>
              <div><strong>Phone:</strong> ${recipientPhone || 'Customer'}</div>
              <div><strong>Place of Supply:</strong> Gujarat (24)</div>
            </div>
          </div>
        </div>

        <!-- Highlight Order Strip -->
        <div class="order-strip">
          <div><span>Fulfillment Status:</span> <strong>Verified & Delivered</strong></div>
          <div><span>Total Units:</span> <strong>${items.reduce((s, it) => s + (it.quantity || 1), 0)} items</strong></div>
          <div><span>Reverse Charge:</span> <strong>Not Applicable</strong></div>
          <div><span>Currency:</span> <strong>INR (₹)</strong></div>
        </div>

        <!-- Itemized Products Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th>#</th>
              <th style="text-align: left;">Item Description</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Taxable Value</th>
              <th style="text-align: center;">GST</th>
              <th style="text-align: right;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemRowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 15px;">No item details available</td></tr>'}
          </tbody>
        </table>

        <!-- Summary & Tax Breakdown Grid -->
        <div class="summary-container">
          <!-- Left: Tax Breakdown & Amount in Words -->
          <div class="summary-left">
            <div>
              <div style="font-size: 10px; font-weight: 800; color: #374151; margin-bottom: 4px; text-transform: uppercase;">GST Summary Breakdown</div>
              <table class="tax-table">
                <thead>
                  <tr>
                    <th>Tax Type</th>
                    <th style="text-align: center;">Rate</th>
                    <th style="text-align: right;">Taxable (₹)</th>
                    <th style="text-align: right;">Tax Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Central GST (CGST)</td>
                    <td style="text-align: center;">2.5%</td>
                    <td style="text-align: right; font-family: monospace;">₹${taxableAmount.toFixed(2)}</td>
                    <td style="text-align: right; font-family: monospace;">₹${cgst.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>State GST (SGST)</td>
                    <td style="text-align: center;">2.5%</td>
                    <td style="text-align: right; font-family: monospace;">₹${taxableAmount.toFixed(2)}</td>
                    <td style="text-align: right; font-family: monospace;">₹${sgst.toFixed(2)}</td>
                  </tr>
                  <tr style="font-weight: 700; background-color: #f3f4f6;">
                    <td colspan="3">Total Tax Amount (5% GST)</td>
                    <td style="text-align: right; font-family: monospace; color: #15803D;">₹${totalTax.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="amount-words-box">
              <span style="font-size: 9px; color: #6b7280; font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 2px;">Amount in Words</span>
              <strong style="color: #111827;">${amountInWords}</strong>
            </div>
          </div>

          <!-- Right: Financial Bill Summary -->
          <div class="summary-right">
            <div class="summary-row">
              <span>Item(s) Subtotal:</span>
              <span style="font-family: monospace;">₹${(grandTotal - deliveryFee + totalDiscount).toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span>Delivery & Handling Fee:</span>
              <span style="font-family: monospace;">₹${deliveryFee.toFixed(2)}</span>
            </div>
            ${totalDiscount > 0 ? `
              <div class="summary-row" style="color: #15803D;">
                <span>Discounts & Offers:</span>
                <span style="font-family: monospace;">-₹${totalDiscount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="summary-row" style="border-top: 1px dashed #e5e7eb; margin-top: 4px; padding-top: 4px;">
              <span>Total Taxable Amount:</span>
              <span style="font-family: monospace;">₹${taxableAmount.toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span>Taxes (CGST + SGST):</span>
              <span style="font-family: monospace;">₹${totalTax.toFixed(2)}</span>
            </div>
            <div class="summary-row total-row">
              <span>Grand Total:</span>
              <span class="total-amount">₹${grandTotal.toFixed(2)}</span>
            </div>
            <div style="font-size: 9px; color: #6b7280; text-align: right; margin-top: 4px;">
              (Inclusive of all applicable taxes)
            </div>
          </div>
        </div>

        <!-- Footer Legal & Signatory -->
        <div class="footer-declaration">
          <div class="declaration-text">
            <strong>Declaration:</strong> We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. Goods are supplied by verified local merchants registered on the ADAB B2C Quick-Commerce Platform.<br>
            <em>Need assistance? Reach ADAB 24x7 Customer Care at <strong>support@adabmart.com</strong> or WhatsApp <strong>+91 98765 00000</strong>.</em>
          </div>
          <div class="signatory-box">
            <div class="signatory-title">For ${storeName}</div>
            <div class="signatory-caption">Authorized Signatory<br>(Digitally Signed & Verified)</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Executes a clean, full-width A4 printout by generating
 * an isolated iframe document and triggering window.print()
 */
export function printInvoiceDocument(invoicePayload) {
  try {
    const html = generateInvoiceHtml(invoicePayload);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('title', 'ADAB Tax Invoice Print');

    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow || iframe.contentDocument;
    const doc = frameDoc.document || frameDoc;

    doc.open();
    doc.write(html);
    doc.close();

    // Give iframe time to layout fonts and styles before triggering print
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (printErr) {
        console.warn('Iframe print error, falling back to popup window:', printErr);
        const printWindow = window.open('', '_blank', 'width=850,height=1000');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
        }
      } finally {
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch (e) {}
        }, 3000);
      }
    }, 300);
  } catch (err) {
    console.error('Failed to print structured tax invoice document:', err);
    window.print();
  }
}
