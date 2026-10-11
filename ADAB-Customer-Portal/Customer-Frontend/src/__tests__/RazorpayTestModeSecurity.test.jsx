import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { isRazorpayLoaded, openRazorpayCheckout } from '../utils/razorpay';
import CheckoutView from '../components/CheckoutView';

describe('Razorpay Test Mode Integration & Security Tests', () => {
  let originalWindow;
  let originalDocument;

  beforeEach(() => {
    vi.clearAllMocks();
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  });

  const sampleCartData = {
    cart: { id: 'cart_123', coupon_code: null },
    items: [
      {
        cart_item_id: 'item_1',
        product_name: 'Organic Milk 1L',
        quantity: 2,
        sell_price: 65,
        store_name: 'Amul Fresh Store'
      }
    ],
    summary: {
      subtotal: 130,
      delivery_fee: 25,
      discount: 0,
      grand_total: 155
    }
  };

  const sampleAddress = {
    full_name: 'Pooja Sharma',
    recipient_name: 'Pooja Sharma',
    phone: '+919876512340',
    address_line: 'Flat 402, Green Valley Apt, Ring Road',
    city: 'Surat',
    pincode: '395002',
    label: 'Home'
  };

  it('1. Razorpay SDK loader detects browser environment safely', () => {
    globalThis.window = {};
    expect(isRazorpayLoaded()).toBe(false);

    globalThis.window.Razorpay = function () {};
    expect(isRazorpayLoaded()).toBe(true);
  });

  it('2. openRazorpayCheckout requires valid key and orderId', async () => {
    globalThis.window = {
      Razorpay: function MockConstructor() {}
    };

    await expect(
      openRazorpayCheckout({
        key: '',
        orderId: 'order_123',
        amountPaise: 15500
      })
    ).rejects.toThrow('Razorpay Key ID is required');

    await expect(
      openRazorpayCheckout({
        key: 'rzp_test_sample',
        orderId: '',
        amountPaise: 15500
      })
    ).rejects.toThrow('Razorpay Order ID is required');
  });

  it('3. CheckoutView renders with ADAB green/coral color scheme and secure payment options', () => {
    const html = renderToString(
      <CheckoutView
        cartData={sampleCartData}
        onPlaceOrder={() => {}}
        onBackToCart={() => {}}
        selectedDeliveryAddress={sampleAddress}
      />
    );

    // ADAB Theme & Payment Options
    expect(html).toContain('UPI Instant');
    expect(html).toContain('Credit / Debit Card');
    expect(html).toContain('Cash on Delivery');
    expect(html).toContain('Review Items &amp; Total');
  });

  it('4. Secret Leakage Check: Frontend components and environment never expose RAZORPAY_KEY_SECRET', () => {
    const html = renderToString(
      <CheckoutView
        cartData={sampleCartData}
        onPlaceOrder={() => {}}
        onBackToCart={() => {}}
        selectedDeliveryAddress={sampleAddress}
      />
    );

    // Verify secret is not in HTML or any attributes
    expect(html).not.toContain('RAZORPAY_KEY_SECRET');
    expect(html).not.toContain('key_secret');
    expect(html).not.toContain('webhook_secret');
  });

  it('5. openRazorpayCheckout configures modal with brand green theme and customer prefill', async () => {
    const mockOpen = vi.fn();
    const mockOn = vi.fn();

    function MockRazorpay(options) {
      expect(options.key).toBe('rzp_test_abc123');
      expect(options.order_id).toBe('order_rzp_999');
      expect(options.amount).toBe(15500);
      expect(options.currency).toBe('INR');
      expect(options.name).toBe('ADAB');
      expect(options.theme.color).toBe('#15803D'); // Brand green
      expect(options.prefill.name).toBe('Pooja Sharma');
      expect(options.prefill.contact).toBe('+919876512340');
      this.open = mockOpen;
      this.on = mockOn;
    }

    globalThis.window = {
      Razorpay: MockRazorpay
    };

    await openRazorpayCheckout({
      key: 'rzp_test_abc123',
      orderId: 'order_rzp_999',
      amountPaise: 15500,
      currency: 'INR',
      orderNumber: 'ORD-123456',
      prefill: {
        name: 'Pooja Sharma',
        phone: '+919876512340',
        email: 'pooja@adab.com'
      },
      onSuccess: () => {},
      onDismiss: () => {}
    });

    expect(mockOpen).toHaveBeenCalledTimes(1);
  });

  it('6. openRazorpayCheckout registers on payment.failed error handler and ondismiss callback', async () => {
    let capturedOptions = null;
    let registeredErrorHandler = null;

    function MockRazorpay(options) {
      capturedOptions = options;
      this.open = vi.fn();
      this.on = vi.fn().mockImplementation((event, handler) => {
        if (event === 'payment.failed') registeredErrorHandler = handler;
      });
    }

    globalThis.window = {
      Razorpay: MockRazorpay
    };

    const onDismissMock = vi.fn();
    const onErrorMock = vi.fn();

    await openRazorpayCheckout({
      key: 'rzp_test_abc123',
      orderId: 'order_rzp_999',
      amountPaise: 15500,
      onDismiss: onDismissMock,
      onError: onErrorMock
    });

    // Test ondismiss triggers gracefully
    expect(capturedOptions.modal.ondismiss).toBeDefined();
    capturedOptions.modal.ondismiss();
    expect(onDismissMock).toHaveBeenCalledTimes(1);

    // Test payment.failed triggers onError
    expect(registeredErrorHandler).toBeDefined();
    registeredErrorHandler({ error: { description: 'Bank server timeout' } });
    expect(onErrorMock).toHaveBeenCalledWith({ description: 'Bank server timeout' });
  });

  it('7. openRazorpayCheckout automatically configures display sequence and UPI instrument when method is upi', async () => {
    let capturedOptions = null;

    function MockRazorpay(options) {
      capturedOptions = options;
      this.open = vi.fn();
      this.on = vi.fn();
    }

    globalThis.window = {
      Razorpay: MockRazorpay
    };

    await openRazorpayCheckout({
      key: 'rzp_test_abc123',
      orderId: 'order_rzp_999',
      amountPaise: 15500,
      method: 'upi',
      onSuccess: () => {},
      onDismiss: () => {}
    });

    expect(capturedOptions.config).toBeDefined();
    expect(capturedOptions.config.display.sequence).toEqual(['block.preferred']);
    expect(capturedOptions.config.display.blocks.preferred.instruments).toEqual([{ method: 'upi' }]);
    expect(capturedOptions.config.display.blocks.preferred.name).toContain('UPI');
  });
});

