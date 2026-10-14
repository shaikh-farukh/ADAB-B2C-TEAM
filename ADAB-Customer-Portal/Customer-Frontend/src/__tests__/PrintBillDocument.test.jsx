import { describe, it, expect } from 'vitest';
import { generateInvoiceHtml } from '../utils/printInvoice';

describe('Print Bill Structured Document Generator', () => {
  const sampleInvoiceData = {
    invoice: {
      invoice_number: 'INV-ORD-1791915496343-7949',
      generated_at: '2026-10-13T18:18:14.910Z',
      total_amount: 72.00
    },
    order: {
      order_number: 'ORD-1791915496343-7949',
      created_at: '2026-10-13T18:18:14.910Z',
      payment_method: 'CARD',
      payment_status: 'PAID',
      delivery_mode: 'EXPRESS_30M',
      pricing: {
        total_mrp: 50.00,
        total_discount: 0.00,
        delivery_fee: 29.00,
        tax_amount: 3.43,
        grand_total: 72.00
      }
    },
    seller: {
      store_name: 'mayank enterprise',
      address: 'saral parivesh, ioc road, chandkheda, Ahmedabad, Gujarat - 382424',
      gstin: '24AAACA1234A1Z5',
      phone: '+91 99999 99999'
    },
    buyer: {
      name: 'Mayank Shah',
      address: 'saral parivesh, IOC road chandkheda',
      city: 'Ahmedabad',
      pincode: '382424',
      phone: '9112131754'
    },
    items: [
      {
        product_name: 'sneha bhajiya',
        quantity: 1,
        unit_price: 43.00,
        total_price: 43.00,
        hsn_code: '210690'
      }
    ]
  };

  it('1. Generates complete A4 Tax Invoice document structure', () => {
    const html = generateInvoiceHtml(sampleInvoiceData);

    // Document structure
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('@page');
    expect(html).toContain('size: A4 portrait');
    expect(html).toContain('Tax Invoice / Bill of Supply');
    expect(html).toContain('Original for Recipient');
  });

  it('2. Includes company letterhead, FSSAI, and Seller GSTIN information', () => {
    const html = generateInvoiceHtml(sampleInvoiceData);

    expect(html).toContain('ADAB');
    expect(html).toContain('ADAB Quick Commerce Pvt. Ltd.');
    expect(html).toContain('FSSAI: 10024021000892');
    expect(html).toContain('mayank enterprise');
    expect(html).toContain('24AAACA1234A1Z5');
  });

  it('3. Renders buyer details and exact delivery destination', () => {
    const html = generateInvoiceHtml(sampleInvoiceData);

    expect(html).toContain('Mayank Shah');
    expect(html).toContain('saral parivesh, IOC road chandkheda');
    expect(html).toContain('Ahmedabad - 382424');
    expect(html).toContain('9112131754');
    expect(html).toContain('Gujarat (24)');
  });

  it('4. Formats itemized product breakdown with HSN code and GST breakdown', () => {
    const html = generateInvoiceHtml(sampleInvoiceData);

    expect(html).toContain('sneha bhajiya');
    expect(html).toContain('HSN: 210690');
    expect(html).toContain('₹43.00');
    expect(html).toContain('Central GST (CGST)');
    expect(html).toContain('State GST (SGST)');
    expect(html).toContain('Total Tax Amount (5% GST)');
    expect(html).toContain('₹72.00');
  });

  it('5. Computes Indian currency amount in words and legal declaration', () => {
    const html = generateInvoiceHtml(sampleInvoiceData);

    expect(html).toContain('Seventy Two Rupees Only');
    expect(html).toContain('Declaration:');
    expect(html).toContain('Authorized Signatory');
    expect(html).toContain('Digitally Signed');
  });
});
