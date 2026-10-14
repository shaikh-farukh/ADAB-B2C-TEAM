import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import HelpSupportView from '../components/HelpSupportView.jsx';

describe('Day 5 Frontend Task 3: Help & Customer Support (sec-help, sec-messages)', () => {
  const sampleTicket = {
    id: 'f87a31b4-1e5b-42b9-a9a7-96a84d436cf4',
    ticket_number: 'TCK-ZXRM-4293',
    user_role: 'CUSTOMER',
    order_id: 'ae5be72b-93e0-4543-ab62-0191ed17ae11',
    order_number: 'ORD-1791907766247-9354',
    order_status: 'DELIVERED',
    order_total_amount: '450.00',
    category: 'PAYMENT',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    message_count: 2,
    last_message: 'Our billing team is checking the bank reference ID.',
    created_at: '2026-10-14T10:00:00.000Z',
    messages: [
      {
        id: 'msg-1',
        sender_role: 'CUSTOMER',
        sender_name: 'Pooja Sharma',
        message: 'Payment deducted twice during UPI checkout.',
        created_at: '2026-10-14T10:00:00.000Z'
      },
      {
        id: 'msg-2',
        sender_role: 'ADMIN',
        sender_name: 'ADAB Helpdesk',
        message: 'Our billing team is checking the bank reference ID. Refund will be credited within 24 hours.',
        created_at: '2026-10-14T10:15:00.000Z'
      }
    ]
  };

  const sampleOrder = {
    id: 'ae5be72b-93e0-4543-ab62-0191ed17ae11',
    order_number: 'ORD-1791907766247-9354',
    order_status: 'DELIVERED',
    grand_total: 450
  };

  it('1. Renders container section #sec-help with header and New Support Ticket button', () => {
    const html = renderToString(
      <HelpSupportView onBack={() => {}} />
    );

    expect(html).toContain('id="sec-help"');
    expect(html).toContain('Help &amp; Customer Support');
    expect(html).toContain('New Support Ticket');
    expect(html).toContain('green-btn');
  });

  it('2. Renders Quick Action Cards matching unified-customer-portal-demo.html', () => {
    const html = renderToString(
      <HelpSupportView onBack={() => {}} />
    );

    expect(html).toContain('Where is my order?');
    expect(html).toContain('fa-location-crosshairs');
    expect(html).toContain('Return an item');
    expect(html).toContain('fa-rotate-left');
    expect(html).toContain('Chat with support');
    expect(html).toContain('fa-headset');
  });

  it('3. Renders Support Tickets list with status pills, priority badges, and open thread link', () => {
    const html = renderToString(
      <HelpSupportView
        onBack={() => {}}
        initialTickets={[sampleTicket]}
      />
    );

    expect(html).toContain('TCK-ZXRM-4293');
    expect(html).toContain('PAYMENT');
    expect(html).toContain('HIGH');
    expect(html).toContain('IN PROGRESS');
    expect(html).toContain('Order #ORD-1791907766247-9354');
    expect(html).toContain('Our billing team is checking the bank reference ID.');
    expect(html).toContain('Open Thread');
  });

  it('4. Renders Support Ticket Creation Modal with order selector, category dropdown, priority, and description', () => {
    const html = renderToString(
      <HelpSupportView
        onBack={() => {}}
        preselectedOrder={sampleOrder}
        orders={[sampleOrder]}
      />
    );

    expect(html).toContain('Create Support Ticket');
    expect(html).toContain('Order Issues &amp; Cancellation');
    expect(html).toContain('Payment, UPI &amp; Refund');
    expect(html).toContain('Delivery Delay &amp; Rider Issue');
    expect(html).toContain('Link to an Order (Optional)');
    expect(html).toContain('ORD-1791907766247-9354');
    expect(html).toContain('Priority Level');
    expect(html).toContain('Detailed Description');
    expect(html).toContain('Attachment / Screenshot Link');
  });

  it('5. Renders Interactive Ticket Chat / Messaging #sec-messages with customer and support agent messages', () => {
    const html = renderToString(
      <HelpSupportView
        onBack={() => {}}
        initialView="chat"
        initialActiveTicket={sampleTicket}
      />
    );

    expect(html).toContain('id="sec-messages"');
    expect(html).toContain('TCK-ZXRM-4293');
    expect(html).toContain('Mark Resolved');
    expect(html).toContain('Close Ticket');
    // Customer message
    expect(html).toContain('Payment deducted twice during UPI checkout.');
    // Agent reply
    expect(html).toContain('Our billing team is checking the bank reference ID. Refund will be credited within 24 hours.');
    expect(html).toContain('ADAB Helpdesk');
    // Reply composer bar
    expect(html).toContain('Type your message to support...');
    expect(html).toContain('Send');
  });

  it('6. Renders searchable FAQ Accordion with common customer questions', () => {
    const html = renderToString(
      <HelpSupportView onBack={() => {}} />
    );

    expect(html).toContain('Frequently Asked Questions');
    expect(html).toContain('How is ADAB different from other apps?');
    expect(html).toContain('How fast is delivery?');
    expect(html).toContain('Can I order from multiple shops?');
    expect(html).toContain('How do reward points work?');
  });
});
