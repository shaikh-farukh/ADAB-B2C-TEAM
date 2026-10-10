import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import CartView from '../components/CartView.jsx';
import FloatingCartBar from '../components/FloatingCartBar.jsx';

// Mock CartAPI to prevent network calls during SSR test
vi.mock('../services/api.js', () => ({
  CartAPI: {
    getCart: vi.fn().mockResolvedValue({
      status: 'success',
      data: {
        cart: { id: 'c1', coupon_code: null },
        items: [],
        stores: [],
        summary: { subtotal: 0, grand_total: 0, delivery_fee: 0 }
      }
    }),
    getCoupons: vi.fn().mockResolvedValue({
      status: 'success',
      data: { coupons: [] }
    }),
    updateItem: vi.fn(),
    applyCoupon: vi.fn(),
    removeCoupon: vi.fn(),
    validateCart: vi.fn()
  },
  CheckoutAPI: {
    placeOrder: vi.fn()
  }
}));

describe('Day 2 Frontend Task 4: UI Design Parity with unified-customer-portal-demo.html', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('1. Renders Website Top Navigation (.site-nav) with logo, navigation links, and desktop actions', () => {
    const html = renderToString(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    // Top Navigation Header
    expect(html).toContain('id="siteNav"');
    expect(html).toContain('class="site-nav"');
    expect(html).toContain('site-nav-inner');
    expect(html).toContain('site-logo');
    expect(html).toContain('<i>A</i>ADAB');

    // Navigation Links
    expect(html).toContain('Explore');
    expect(html).toContain('Shops');
    expect(html).toContain('Categories');
    expect(html).toContain('Offers');
    expect(html).toContain('Orders');
    expect(html).toContain('Account');

    // Action Buttons
    expect(html).toContain('site-actions');
    expect(html).toContain('id="navPoints"');
    expect(html).toContain('id="navAuth"');
    expect(html).toContain('Sign In');
  });

  it('2. Renders Hero Copy and Hero Stats in App Header matching updated demo UI', () => {
    const html = renderToString(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    // Hero Copy
    expect(html).toContain('class="hero-copy"');
    expect(html).toContain('Your neighbourhood shops');
    const cleanHtml = html.replace(/<!--[\s\S]*?-->/g, '');
    expect(cleanHtml).toContain('48 trusted local stores in Surat');

    // Hero Stats
    expect(html).toContain('class="hero-stats"');
    expect(cleanHtml).toContain('48 local stores');
    expect(html).toContain('14–45 min delivery');
    expect(html).toContain('Earn rewards on every order');
    expect(html).toContain('Secure payments');
  });

  it('3. Renders Desktop Footer (.site-footer) with columns and copyright', () => {
    const html = renderToString(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    expect(html).toContain('class="site-footer"');
    expect(html).toContain('site-footer-inner');
    expect(html).toContain('Supporting neighbourhood businesses across Surat');
    expect(html).toContain('© 2026 ADAB · Surat, Gujarat · Made for local businesses');
  });

  it('4. FloatingCartBar adheres 100% to demo classes, typography, and structure', () => {
    const html = renderToString(
      <FloatingCartBar
        itemCount={2}
        totalPrice={250}
        storeName="Shri Balaji Supermarket"
        onOpenCart={() => {}}
      />
    );

    expect(html).toContain('id="floatCart"');
    expect(html).toContain('float-cart');
    expect(html).toContain('fa-bag-shopping');
    expect(html).toContain('id="floatCartCount"');
    expect(html).toContain('2 items');
    expect(html).toContain('id="floatCartStore"');
    expect(html).toContain('Shri Balaji Supermarket');
    expect(html).toContain('id="floatCartTotal"');
    expect(html).toContain('250');
  });

  it('5. CartView adheres 100% to sec-cart, cartFull, bill-row, and button styling', () => {
    const html = renderToString(
      <CartView
        cartData={{
          items: [
            {
              cart_item_id: 'i1',
              product_name: 'Banana Chips',
              sell_price: 30,
              quantity: 2,
              store_name: 'Shri Balaji'
            }
          ],
          summary: { subtotal: 60, grand_total: 89, delivery_fee: 29 }
        }}
      />
    );

    expect(html).toContain('id="sec-cart"');
    expect(html).toContain('id="cartFull"');
    expect(html).toContain('id="cartItems"');
    expect(html).toContain('id="cartSubtotal"');
    expect(html).toContain('id="cartDelivery"');
    expect(html).toContain('id="cartTotal"');
    expect(html).toContain('id="couponInput"');
    expect(html).toContain('coral-btn');
    expect(html).toContain('id="cartCheckoutBtn"');
    expect(html).toContain('green-btn');
  });
});
