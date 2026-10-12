import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import NotificationsView from '../components/NotificationsView.jsx';

const { sampleNotifications } = vi.hoisted(() => {
  const sampleNotifications = [
    {
      id: 'notif-1',
      type: 'DELIVERY_ALERT',
      title: 'Rider nearby!',
      message: 'Order #9021 · Ramesh is 1.2 km away from your address',
      is_read: false,
      created_at: new Date().toISOString(),
      action_url: '/track'
    },
    {
      id: 'notif-2',
      type: 'ORDER_STATUS',
      title: 'Order packed',
      message: 'Order #9018 from Balaji Store is packed & ready for dispatch',
      is_read: false,
      created_at: new Date().toISOString(),
      action_url: '/orders'
    },
    {
      id: 'notif-3',
      type: 'KYC_ADDRESS',
      title: 'Address & Delivery Area Verified',
      message: 'Flat 402, Ring Road is confirmed for Express Delivery (14–45 mins)',
      is_read: false,
      created_at: new Date().toISOString(),
      action_url: '/account'
    },
    {
      id: 'notif-4',
      type: 'PROMO_REWARD',
      title: '+56 reward points',
      message: 'Credited to your ADAB wallet from delivered order #9010',
      is_read: true,
      created_at: new Date().toISOString(),
      action_url: '/orders'
    }
  ];
  return { sampleNotifications };
});

// Mock API to prevent network calls during testing
vi.mock('../services/api.js', () => ({
  CartAPI: {
    getCart: vi.fn().mockResolvedValue({
      status: 'success',
      data: { cart: {}, items: [], stores: [], summary: {} }
    })
  },
  WishlistAPI: {
    getWishlist: vi.fn().mockResolvedValue([])
  },
  OrderAPI: {
    getOrders: vi.fn().mockResolvedValue({ status: 'success', data: [] })
  },
  CustomerAPI: {
    getAddresses: vi.fn().mockResolvedValue({ status: 'success', data: [] }),
    getNotifications: vi.fn().mockResolvedValue({
      status: 'success',
      data: sampleNotifications
    }),
    getUnreadNotificationCount: vi.fn().mockResolvedValue({
      status: 'success',
      unread_count: 3
    }),
    markNotificationRead: vi.fn().mockResolvedValue({ status: 'success' }),
    markAllNotificationsRead: vi.fn().mockResolvedValue({ status: 'success' })
  }
}));

describe('Day 4 Frontend Task 3: Customer Notification Inbox (sec-notifications)', () => {
  it('1. Renders Dedicated Notification View container (#sec-notifications) with title and unread badge', () => {
    const html = renderToString(
      <NotificationsView
        notifications={sampleNotifications}
        onBack={() => {}}
        onNavigate={() => {}}
        showToast={() => {}}
      />
    );

    // Section container
    expect(html).toContain('id="sec-notifications"');

    // Header title & subtitle
    expect(html).toContain('Notification Inbox');
    expect(html).toContain('Live order tracking, delivery alerts, and account notices');

    // Unread count indicator
    expect(html).toContain('unread');
  });

  it('2. Displays real notifications matching unified-customer-portal-demo.html (Order status, KYC/Address, Delivery alerts)', () => {
    const html = renderToString(
      <NotificationsView
        notifications={sampleNotifications}
        onBack={() => {}}
        onNavigate={() => {}}
        showToast={() => {}}
      />
    );

    // Delivery alert matching demo
    expect(html).toContain('Rider nearby!');
    expect(html).toContain('Order #9021');
    expect(html).toContain('border-l-orange-500');

    // Order status update matching demo
    expect(html).toContain('Order packed');
    expect(html).toContain('#9018');
    expect(html).toContain('border-l-green-500');

    // KYC & Address notices
    expect(html).toContain('Address &amp; Delivery Area Verified');
    expect(html).toContain('Express Delivery');
    expect(html).toContain('border-l-indigo-500');

    // Rewards & offers matching demo
    expect(html).toContain('+56 reward points');
  });

  it('3. Renders Category Filter Chips for seamless inbox filtering', () => {
    const html = renderToString(
      <NotificationsView
        notifications={sampleNotifications}
        onBack={() => {}}
        onNavigate={() => {}}
        showToast={() => {}}
      />
    );

    expect(html).toContain('All Updates');
    expect(html).toContain('Delivery Alerts');
    expect(html).toContain('Order Status');
    expect(html).toContain('KYC &amp; Address');
    expect(html).toContain('Rewards &amp; Offers');
  });

  it('4. Renders "Mark All as Read" button and individual "Mark as Read" toggle actions', () => {
    const html = renderToString(
      <NotificationsView
        notifications={sampleNotifications}
        onBack={() => {}}
        onNavigate={() => {}}
        showToast={() => {}}
      />
    );

    // Mark All as Read button
    expect(html).toContain('id="markAllReadBtn"');
    expect(html).toContain('Mark All as Read');

    // Individual action buttons
    expect(html).toContain('Mark as read');
    expect(html).toContain('Read');
  });

  it('5. Integrates Unread Badge Counter into Top Header and Bottom Navigation Bar in App', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    // Desktop Header unread badge
    expect(html).toContain('class="site-btn"');
    expect(html).toContain('site-badge');

    // Mobile Header unread badge
    expect(html).toContain('bg-brand-coral');

    // Bottom Navigation Bar unread badge counter
    expect(html).toContain('id="navNotifBadge"');
    expect(html).toContain('You');
  });

  it('6. Renders Notification Inbox route when activeTab is notifications', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/notifications']}>
        <App />
      </MemoryRouter>
    );

    expect(html).toContain('id="sec-notifications"');
    expect(html).toContain('Notification Inbox');
    expect(html).toContain('Notifications');
  });
});
