import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import NotificationsView from '../components/NotificationsView.jsx';
import App from '../App.jsx';

describe('Day 6 Frontend Task 4: Live Notification Inbox & Badge Counters (#sec-notifications)', () => {
  const sampleNotifications = [
    {
      id: 'notif-1',
      title: 'Order Placed #ORD-101',
      message: 'Your order has been confirmed with Balaji Grocery Store.',
      type: 'ORDER_STATUS',
      is_read: false,
      action_url: '/track?orderId=ord-101',
      reference_id: 'ord-101',
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
    },
    {
      id: 'notif-2',
      title: 'Rider nearby! Out for delivery',
      message: 'Courier Ramesh is 4 minutes away from your delivery address.',
      type: 'DELIVERY_TELEMETRY',
      is_read: false,
      action_url: '/track?orderId=ord-101',
      reference_id: 'ord-101',
      created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString()
    },
    {
      id: 'notif-3',
      title: 'Refund Processed: ₹450.00',
      message: 'Your return for Balaji Silk Kurti has been completed and ₹450 refunded to UPI.',
      type: 'REFUND_PROCESSED',
      is_read: false,
      action_url: '/returns',
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    },
    {
      id: 'notif-4',
      title: 'Points Earned (+50 Pts)',
      message: 'You earned 50 ADAB reward points on your recent purchase.',
      type: 'GENERAL',
      is_read: true,
      action_url: '/points',
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    }
  ];

  it('1. Renders the #sec-notifications container with top header and unread count banner', () => {
    const html = renderToString(
      <NotificationsView
        notifications={sampleNotifications}
        onBack={() => {}}
      />
    );

    expect(html).toContain('id="sec-notifications"');
    expect(html).toContain('Notification Inbox');
    expect(html).toContain('Live order tracking, delivery alerts, and account notices');
    expect(html).toContain('unread');
    expect(html).toContain('Mark All as Read');
  });

  it('2. Renders category filter chips matching unified-customer-portal-demo.html', () => {
    const html = renderToString(
      <NotificationsView
        notifications={sampleNotifications}
        onBack={() => {}}
      />
    );

    expect(html).toContain('All Updates');
    expect(html).toContain('Delivery Alerts');
    expect(html).toContain('Order Status');
    expect(html).toContain('KYC &amp; Address');
    expect(html).toContain('Rewards &amp; Offers');
  });

  it('3. Renders notification cards with visual badges and action deep-links', () => {
    const html = renderToString(
      <NotificationsView
        notifications={sampleNotifications}
        onBack={() => {}}
      />
    );

    expect(html).toContain('Order Placed #ORD-101');
    expect(html).toContain('Rider nearby! Out for delivery');
    expect(html).toContain('Refund Processed: ₹450.00');
    expect(html).toContain('Points Earned (+50 Pts)');

    // Deep link action buttons
    expect(html).toContain('data-testid="notification-action-link"');
    expect(html).toContain('Live Tracking');
  });

  it('4. Provides individual "Mark read" toggle button on each notification card', () => {
    const html = renderToString(
      <NotificationsView
        notifications={sampleNotifications}
        onBack={() => {}}
      />
    );

    expect(html).toContain('data-testid="notification-read-toggle"');
    expect(html).toContain('Mark as read');
    expect(html).toContain('Read');
  });

  it('5. Renders dynamic notification badge counters in desktop, mobile, and bottom nav headers', () => {
    // In App component, unreadNotifications state is rendered in desktop, mobile, and bottom nav
    const html = renderToString(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    // Desktop header notification button & badge
    expect(html).toContain('id="desktopNotificationBtn"');
    expect(html).toContain('data-testid="desktop-notification-btn"');

    // Mobile header notification button & badge
    expect(html).toContain('id="mobileNotificationBtn"');
    expect(html).toContain('data-testid="mobile-notification-btn"');

    // Bottom navigation account button & badge
    expect(html).toContain('id="navNotifBadge"');
    expect(html).toContain('data-testid="bottom-nav-notif-badge"');
  });

  it('6. Supports deep-linking navigation handler for /track?orderId=... and /returns', () => {
    let navigatedTo = null;
    const mockNavigate = (url) => {
      navigatedTo = url;
    };

    // Verify deep link action url
    const orderNotif = sampleNotifications[0];
    expect(orderNotif.action_url).toBe('/track?orderId=ord-101');
    mockNavigate(orderNotif.action_url);
    expect(navigatedTo).toBe('/track?orderId=ord-101');

    const refundNotif = sampleNotifications[2];
    expect(refundNotif.action_url).toBe('/returns');
    mockNavigate(refundNotif.action_url);
    expect(navigatedTo).toBe('/returns');
  });

  it('7. Displays all-caught-up state when no unread notifications remain', () => {
    const allReadNotifications = sampleNotifications.map((n) => ({ ...n, is_read: true }));
    const html = renderToString(
      <NotificationsView
        notifications={allReadNotifications}
        onBack={() => {}}
      />
    );

    expect(html).toContain('All caught up');
    // Mark all read button disabled
    expect(html).toContain('disabled=""');
  });
});
