import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createInvoicePDFStream = async (invoiceData, res) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      // Pipe its output to the response
      doc.pipe(res);

      // 1. Generate QR Code Data URL (Verification URL)
      // Use the app's actual base URL so QR is scannable
      const appBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const verificationUrl = `${appBaseUrl}/verify-invoice?id=${invoiceData.invoice_id}&inv=${invoiceData.invoice_number}`;
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, { errorCorrectionLevel: 'M', margin: 1 });

      const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');

      // 2. Add Logo and Header
      const logoPath = path.join(__dirname, '../public/logo.jpeg');
      try {
        doc.image(logoPath, 50, 35, { width: 100 });
      } catch (e) {
        // Fallback: render text-based logo
        doc.fontSize(22).font('Helvetica-Bold').fillColor('#00843D').text('ada', 50, 45, { continued: true }).fillColor('#FF8200').text('B');
      }

      doc.fontSize(24)
         .fillColor('#FF8200')
         .font('Helvetica-Bold')
         .text('TAX INVOICE', 0, 50, { align: 'right' });

      doc.fontSize(10)
         .fillColor('#6B7280')
         .font('Helvetica')
         .text(`Invoice No: ${invoiceData.invoice_number}`, 0, 80, { align: 'right' })
         .text(`Date: ${new Date(invoiceData.invoice_date).toLocaleDateString()}`, 0, 95, { align: 'right' })
         .text(`Due Date: ${invoiceData.due_date ? new Date(invoiceData.due_date).toLocaleDateString() : 'N/A'}`, 0, 110, { align: 'right' });

      doc.image(qrCodeBuffer, doc.page.width - 50 - 60, 130, { width: 60 });

      doc.moveTo(50, 150).lineTo(doc.page.width - 50, 150).strokeColor('#E5E7EB').lineWidth(1).stroke();

      // 3. Billing Info
      const topBillingY = 170;
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#00843D').text('BILLED BY (MANUFACTURER):', 50, topBillingY);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text(invoiceData.manufacturer.company_name, 50, topBillingY + 15);
      doc.fontSize(10).font('Helvetica').fillColor('#4B5563')
         .text(invoiceData.manufacturer.address || 'Address N/A', 50, topBillingY + 30)
         .text(`Email: ${invoiceData.manufacturer.email || 'N/A'}`, 50, topBillingY + 45)
         .text(`GST: ${invoiceData.manufacturer.gst_number || 'N/A'}`, 50, topBillingY + 60);

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#FF8200').text('BILLED TO (DISTRIBUTOR):', 300, topBillingY);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text(invoiceData.distributor.company_name, 300, topBillingY + 15);
      doc.fontSize(10).font('Helvetica').fillColor('#4B5563')
         .text(invoiceData.distributor.address || 'Address N/A', 300, topBillingY + 30)
         .text(`Email: ${invoiceData.distributor.email || 'N/A'}`, 300, topBillingY + 45)
         .text(`GST: ${invoiceData.distributor.gst_number || 'N/A'}`, 300, topBillingY + 60);

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('Order Details:', 50, topBillingY + 90);
      doc.font('Helvetica').fillColor('#4B5563').text(`PO Number: ${invoiceData.order.order_number}`, 50, topBillingY + 105);
      doc.text(`PO Date: ${new Date(invoiceData.order.order_date).toLocaleDateString()}`, 50, topBillingY + 120);
      const paymentTerm = invoiceData.order.payment_mode === 'NET_30' ? 'Net-30 Credit Line' : 'Cash on Delivery / Direct';
      doc.text(`Payment Term: ${paymentTerm}`, 50, topBillingY + 135);

      // 4. Itemized Table
      let tableTop = 330;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000');
      doc.rect(50, tableTop - 5, doc.page.width - 100, 20).fill('#F3F4F6');
      doc.fillColor('#000000');

      doc.text('Item / Description', 55, tableTop);
      doc.text('SKU', 250, tableTop);
      doc.text('Qty', 350, tableTop, { width: 50, align: 'right' });
      doc.text('Unit Price', 410, tableTop, { width: 60, align: 'right' });
      doc.text('Amount', 480, tableTop, { width: 60, align: 'right' });

      doc.moveTo(50, tableTop + 15).lineTo(doc.page.width - 50, tableTop + 15).strokeColor('#E5E7EB').lineWidth(1).stroke();

      let yPos = tableTop + 25;
      doc.font('Helvetica').fillColor('#4B5563');

      invoiceData.items.forEach((item) => {
        if (yPos > doc.page.height - 150) {
          doc.addPage();
          yPos = 50;
        }

        doc.text(item.product_name, 55, yPos, { width: 190 });
        doc.text(item.product_sku || 'N/A', 250, yPos, { width: 90 });
        doc.text(item.quantity.toString(), 350, yPos, { width: 50, align: 'right' });
        doc.text(`$${item.unit_price.toFixed(2)}`, 410, yPos, { width: 60, align: 'right' });
        doc.text(`$${item.subtotal.toFixed(2)}`, 480, yPos, { width: 60, align: 'right' });

        yPos += 20;
      });

      doc.moveTo(50, yPos).lineTo(doc.page.width - 50, yPos).strokeColor('#E5E7EB').lineWidth(1).stroke();

      // 5. Totals
      const totalY = yPos + 15;
      doc.font('Helvetica-Bold').fillColor('#000000');

      doc.text('Subtotal:', 380, totalY, { width: 100, align: 'right' });
      doc.font('Helvetica').text(`$${invoiceData.financials.subtotal_amount.toFixed(2)}`, 480, totalY, { width: 60, align: 'right' });

      doc.font('Helvetica-Bold').text(`GST (${invoiceData.financials.gst_percent}%):`, 380, totalY + 15, { width: 100, align: 'right' });
      doc.font('Helvetica').text(`$${invoiceData.financials.gst_amount.toFixed(2)}`, 480, totalY + 15, { width: 60, align: 'right' });

      doc.moveTo(380, totalY + 30).lineTo(doc.page.width - 50, totalY + 30).strokeColor('#E5E7EB').lineWidth(1).stroke();

      doc.fontSize(12).font('Helvetica-Bold').fillColor('#00843D');
      doc.text('Total Amount:', 350, totalY + 40, { width: 130, align: 'right' });
      doc.text(`$${invoiceData.financials.total_amount.toFixed(2)}`, 480, totalY + 40, { width: 60, align: 'right' });

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#4B5563');
      doc.text('Amount Paid:', 350, totalY + 65, { width: 130, align: 'right' });
      doc.font('Helvetica').text(`$${invoiceData.financials.total_paid.toFixed(2)}`, 480, totalY + 65, { width: 60, align: 'right' });

      doc.font('Helvetica-Bold').fillColor(invoiceData.financials.balance_due > 0 ? '#FF8200' : '#00843D');
      doc.text('Balance Due:', 350, totalY + 80, { width: 130, align: 'right' });
      doc.text(`$${invoiceData.financials.balance_due.toFixed(2)}`, 480, totalY + 80, { width: 60, align: 'right' });

      // 6. Footer
      const footerY = doc.page.height - 100;
      doc.moveTo(50, footerY).lineTo(doc.page.width - 50, footerY).strokeColor('#E5E7EB').lineWidth(1).stroke();

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000').text('Bank Details:', 50, footerY + 10);
      doc.font('Helvetica').fillColor('#6B7280');
      if (invoiceData.manufacturer.bank_details) {
        doc.text(invoiceData.manufacturer.bank_details, 50, footerY + 25, { width: 200 });
      } else {
        doc.text('Please contact the manufacturer for payment instructions.', 50, footerY + 25);
      }

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000').text('Terms & Conditions:', 300, footerY + 10);
      doc.font('Helvetica').fillColor('#6B7280')
         .text('1. Payment is due within the specified terms.', 300, footerY + 25)
         .text('2. Please include the invoice number on your check or transfer.', 300, footerY + 35);

      doc.end();

      res.on('finish', resolve);
      res.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};
