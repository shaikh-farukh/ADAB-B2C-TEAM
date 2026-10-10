import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import CartView from '../components/CartView.jsx';

describe('Day 2 Frontend Task 1: Shopping Cart UI (sec-cart)', () => {
  it('1. Renders Empty Cart State with basket graphic, copy, and Start Shopping CTA', () => {
    const html = renderToString(
      <CartView
        cartData={{ items: [], summary: {} }}
        onStartShopping={() => {}}
      />
    );

    expect(html).toContain('id="sec-cart"');
    expect(html).toContain('id="cartEmpty"');
    expect(html).toContain('Your basket is empty');
    expect(html).toContain('fa-basket-shopping');
    expect(html).toContain('Start Shopping');
  });

  it('2. Renders Neighborhood Direct Banner with trust badge', () => {
    const html = renderToString(
      <CartView
        cartData={{
          items: [{ cart_item_id: '1', product_name: 'Rice', sell_price: 100, quantity: 1 }],
          summary: { subtotal: 100 }
        }}
      />
    );

    expect(html).toContain('id="cartFull"');
    expect(html).toContain('Neighborhood Shop Direct');
    expect(html).toContain('Orders are packed fresh and dispatched straight from local stores.');
    expect(html).toContain('fa-shield-halved');
    expect(html).toContain('100% Genuine');
  });

  it('3. Renders Multi-Seller Visual Grouping with store headers, avatar initials, and store subtotals', () => {
    const multiSellerData = {
      stores: [
        {
          store_id: 'store_a',
          store_name: 'Shri Balaji Supermarket',
          category: 'Grocery',
          store_subtotal: 240,
          items: [
            { cart_item_id: 'item_a1', product_name: 'Moong Dal 1kg', sell_price: 120, quantity: 2 }
          ]
        },
        {
          store_id: 'store_b',
          store_name: 'Kailash Dairy & Sweets',
          category: 'Dairy',
          store_subtotal: 130,
          items: [
            { cart_item_id: 'item_b1', product_name: 'Pure Amul Butter 500g', sell_price: 130, quantity: 1 }
          ]
        }
      ],
      items: [
        { cart_item_id: 'item_a1', product_name: 'Moong Dal 1kg', sell_price: 120, quantity: 2 },
        { cart_item_id: 'item_b1', product_name: 'Pure Amul Butter 500g', sell_price: 130, quantity: 1 }
      ],
      summary: { subtotal: 370 }
    };

    const html = renderToString(<CartView cartData={multiSellerData} />);

    // Store A
    expect(html).toContain('Shri Balaji Supermarket');
    expect(html).toContain('SB');
    expect(html).toContain('Grocery');
    expect(html).toContain('₹240');

    // Store B
    expect(html).toContain('Kailash Dairy &amp; Sweets');
    expect(html).toContain('KD');
    expect(html).toContain('Dairy');
    expect(html).toContain('₹130');
  });

  it('4. Renders Item Rows & Quantity Controls with product details and qty-ctrl', () => {
    const html = renderToString(
      <CartView
        cartData={{
          items: [
            {
              cart_item_id: 'item_1',
              product_name: 'Moong Dal 1kg',
              sell_price: 120,
              quantity: 2,
              effective_stock: 5
            }
          ],
          summary: { subtotal: 240 }
        }}
      />
    );

    expect(html).toContain('Moong Dal 1kg');
    expect(html).toContain('₹240');
    expect(html).toContain('(₹120 each)');
    expect(html).toContain('qty-ctrl');
    expect(html).toContain('−');
    expect(html).toContain('+');
  });

  it('5. Renders Live Order Summary / Bill Card with dynamic delivery fee, coupon savings, and grand total', () => {
    const html = renderToString(
      <CartView
        cartData={{
          cart: { coupon_code: 'BALAJI15' },
          items: [{ cart_item_id: '1', product_name: 'Item', sell_price: 370, quantity: 1 }],
          summary: {
            subtotal: 370,
            delivery_fee: 29,
            discount: 55,
            coupon_code: 'BALAJI15',
            grand_total: 344,
            estimated_reward_points: 3
          }
        }}
      />
    );

    expect(html).toContain('Order Summary');
    expect(html).toContain('Items Subtotal');
    expect(html).toContain('₹370');
    expect(html).toContain('Estimated Delivery Fee');
    expect(html).toContain('₹29');
    expect(html).toContain('Coupon Savings');
    expect(html).toContain('BALAJI15');
    expect(html).toContain('-₹55');
    expect(html).toContain('Remove');
    expect(html).toContain('border-dashed');
    expect(html).toContain('To Pay');
    expect(html).toContain('₹344');
    expect(html).toContain('ADAB Points Earned');
    expect(html).toContain('+3 pts');
  });

  it('6. Unlocks FREE delivery badge when order subtotal is >= 499', () => {
    const html = renderToString(
      <CartView
        cartData={{
          items: [{ cart_item_id: '1', product_name: 'Item', sell_price: 600, quantity: 1 }],
          summary: {
            subtotal: 600,
            delivery_fee: 0,
            grand_total: 600
          }
        }}
      />
    );

    expect(html).toContain('FREE');
    expect(html).toContain('You&#x27;ve unlocked FREE Delivery');
  });

  it('7. Renders Delivery Address Preview Strip with verified badge and Change action', () => {
    const html = renderToString(
      <CartView
        cartData={{
          items: [{ cart_item_id: '1', product_name: 'Item', sell_price: 100, quantity: 1 }],
          summary: { subtotal: 100 }
        }}
      />
    );

    expect(html).toContain('Delivering to Home');
    expect(html).toContain('Flat 402, Green Valley Apt, Ring Road, Surat');
    expect(html).toContain('Verified');
    expect(html).toContain('Change');
  });
});

describe('Day 2 Frontend Task 2: Coupon Application Flow', () => {
  it('8. Renders Coupon Input Field & Apply Action Button when no coupon is applied', () => {
    const html = renderToString(
      <CartView
        cartData={{
          items: [{ cart_item_id: '1', product_name: 'Item', sell_price: 250, quantity: 1 }],
          summary: { subtotal: 250, grand_total: 279, delivery_fee: 29 }
        }}
      />
    );

    expect(html).toContain('id="couponInput"');
    expect(html).toContain('placeholder="Enter coupon (e.g. DIWALI50, NAVRATRI)"');
    expect(html).toContain('Apply');
    expect(html).toContain('fa-ticket');
  });

  it('9. Renders Applied Coupon Celebration Banner with coupon chip, savings text, and Remove action', () => {
    const html = renderToString(
      <CartView
        cartData={{
          cart: { coupon_code: 'BALAJI15' },
          items: [{ cart_item_id: '1', product_name: 'Rice', sell_price: 200, quantity: 1 }],
          summary: {
            subtotal: 200,
            discount: 30,
            coupon_code: 'BALAJI15',
            grand_total: 199,
            delivery_fee: 29
          }
        }}
      />
    );

    // Applied Celebration Card
    expect(html).toContain('Coupon Applied:');
    expect(html).toContain('BALAJI15');
    expect(html).toContain('You saved ₹30 with this code!');
    expect(html).toContain('Remove');

    // Bill Summary
    expect(html).toContain('Coupon Savings (BALAJI15)');
    expect(html).toContain('-₹30');
    expect(html).toContain('Saved ₹30');
  });

  it('10. Renders Available Offers & Coupons list toggle with coupon tags', () => {
    const html = renderToString(
      <CartView
        cartData={{
          items: [{ cart_item_id: '1', product_name: 'Rice', sell_price: 150, quantity: 1 }],
          summary: { subtotal: 150, grand_total: 179 }
        }}
      />
    );

    expect(html).toContain('Available Offers &amp; Coupons') || expect(html).toContain('Available Offers & Coupons');
    expect(html).toContain('fa-gift');
  });
});

describe('Day 2 Frontend Task 3: Pre-Checkout Stock & Price Validation Trigger', () => {
  it('11. Renders Pre-Checkout Stock & Price Validation Alert banner when validation issues are detected', () => {
    const issues = [
      {
        listing_id: 'item_1',
        name: 'Moong Dal 1kg',
        issue: 'OUT_OF_STOCK',
        message: '"Moong Dal 1kg" is out of stock'
      },
      {
        listing_id: 'item_2',
        name: 'Pure Amul Butter 500g',
        issue: 'PRICE_CHANGED',
        current_price: 140,
        message: 'Price for "Pure Amul Butter 500g" has changed from ₹130 to ₹140'
      }
    ];

    const html = renderToString(
      <CartView
        cartData={{
          items: [
            { cart_item_id: 'item_1', listing_id: 'item_1', product_name: 'Moong Dal 1kg', sell_price: 120, quantity: 1 },
            { cart_item_id: 'item_2', listing_id: 'item_2', product_name: 'Pure Amul Butter 500g', sell_price: 140, quantity: 1 }
          ],
          summary: { subtotal: 260, grand_total: 289 }
        }}
        validationIssues={issues}
      />
    );

    // Pre-checkout alert box
    expect(html).toContain('id="preCheckoutAlert"');
    expect(html).toContain('Stock &amp; Price Adjustment Required') || expect(html).toContain('Stock & Price Adjustment Required');
    expect(html).toContain('2 items in your cart updated by the store');
    expect(html).toContain('Out of Stock');
    expect(html).toContain('₹140');
  });

  it('12. Renders item-level alert badges for OUT OF STOCK and PRICE CHANGED items', () => {
    const issues = [
      {
        listing_id: 'item_1',
        name: 'Moong Dal 1kg',
        issue: 'OUT_OF_STOCK',
        message: '"Moong Dal 1kg" is out of stock'
      }
    ];

    const html = renderToString(
      <CartView
        cartData={{
          items: [
            { cart_item_id: 'item_1', listing_id: 'item_1', product_name: 'Moong Dal 1kg', sell_price: 120, quantity: 1 }
          ],
          summary: { subtotal: 120, grand_total: 149 }
        }}
        validationIssues={issues}
      />
    );

    expect(html).toContain('OUT OF STOCK');
    expect(html).toContain('Remove Out-of-Stock Items to Checkout');
  });

  it('13. Disables Checkout button when out of stock items are present in cart', () => {
    const issues = [
      {
        listing_id: 'item_1',
        name: 'Moong Dal 1kg',
        issue: 'OUT_OF_STOCK',
        message: '"Moong Dal 1kg" is out of stock'
      }
    ];

    const html = renderToString(
      <CartView
        cartData={{
          items: [
            { cart_item_id: 'item_1', listing_id: 'item_1', product_name: 'Moong Dal 1kg', sell_price: 120, quantity: 1 }
          ],
          summary: { subtotal: 120, grand_total: 149 }
        }}
        validationIssues={issues}
      />
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain('Remove Out-of-Stock Items to Checkout');
  });
});
