const Razorpay = require('razorpay');
const crypto = require('crypto');

/**
 * RazorpayAdapter
 * Production-ready Razorpay Test Mode integration implementing the standard Payment Provider contract.
 * Uses official Razorpay SDK, secure HMAC-SHA256 constant-time signature verification,
 * and server-side payment capture validation.
 */
class RazorpayAdapter {
  constructor(config = {}) {
    this.name = 'razorpay';
    this._customConfig = config.keyId !== undefined || config.keySecret !== undefined || config.instance !== undefined;
    this.keyId = config.keyId !== undefined ? config.keyId : (process.env.RAZORPAY_KEY_ID || null);
    this.keySecret = config.keySecret !== undefined ? config.keySecret : (process.env.RAZORPAY_KEY_SECRET || null);
    this.webhookSecret = config.webhookSecret !== undefined ? config.webhookSecret : (process.env.RAZORPAY_WEBHOOK_SECRET || null);
    this.currency = config.currency || 'INR';

    // Allow injecting custom instance for testing/mocking
    if (config.instance) {
      this.instance = config.instance;
    } else if (this.keyId && this.keySecret) {
      this.instance = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret
      });
    } else {
      this.instance = null;
    }
  }

  /**
   * Lazily reloads environment variables from .env if credentials were not set at instantiation
   */
  _refreshCredentials() {
    if (!this._customConfig && (!this.keyId || !this.keySecret || !this.instance)) {
      try {
        const path = require('path');
        require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });
      } catch (e) {
        // ignore load errors
      }
      this.keyId = this.keyId || process.env.RAZORPAY_KEY_ID || null;
      this.keySecret = this.keySecret || process.env.RAZORPAY_KEY_SECRET || null;
      this.webhookSecret = this.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || null;

      if (this.keyId && this.keySecret && !this.instance) {
        this.instance = new Razorpay({
          key_id: this.keyId,
          key_secret: this.keySecret
        });
      }
    }
  }

  isConfigured() {
    this._refreshCredentials();
    return Boolean(this.keyId && this.keySecret && this.instance);
  }

  /**
   * Initializes a Razorpay order intent session
   * @param {Object} params
   * @param {number} params.amount - Total amount in INR
   * @param {string} [params.currency='INR']
   * @param {string} [params.receipt] - Receipt string (max 40 chars)
   * @param {string} [params.paymentMethod] - Method
   * @param {Object} [params.customer]
   * @param {Object} [params.metadata]
   */
  async createPaymentIntent({
    amount,
    currency = 'INR',
    receipt,
    paymentMethod = 'UPI',
    customer = {},
    metadata = {}
  }) {
    if (!this.isConfigured()) {
      throw new Error(
        'Razorpay credentials are not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the server environment.'
      );
    }

    if (!amount || Number(amount) <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    const numAmount = Number(amount);
    const amountPaise = Math.round(numAmount * 100);
    const safeReceipt = String(receipt || `rcpt_${Date.now()}`).slice(0, 40);

    const orderOptions = {
      amount: amountPaise,
      currency: currency.toUpperCase(),
      receipt: safeReceipt,
      notes: {
        order_id: metadata.order_id ? String(metadata.order_id).slice(0, 40) : undefined,
        order_number: metadata.order_number ? String(metadata.order_number).slice(0, 40) : undefined,
        customer_id: customer.id ? String(customer.id).slice(0, 40) : undefined,
        payment_method: paymentMethod || 'UPI'
      }
    };

    // Clean undefined notes
    Object.keys(orderOptions.notes).forEach(
      (k) => orderOptions.notes[k] === undefined && delete orderOptions.notes[k]
    );

    const order = await this.instance.orders.create(orderOptions);

    return {
      intent_id: order.id,
      order_id: order.id,
      provider: 'razorpay',
      key_id: this.keyId,
      amount: order.amount / 100,
      amount_paise: order.amount,
      currency: order.currency,
      status: 'INITIATED',
      receipt: order.receipt,
      created_at: order.created_at
    };
  }

  /**
   * Verifies Razorpay payment signature using HMAC-SHA256 with constant-time comparison
   * and verifies server-side payment capture status from Razorpay API.
   *
   * @param {Object} params
   * @param {string} params.intentId - Razorpay Order ID
   * @param {string} params.orderId - Razorpay Order ID (alias)
   * @param {string} params.paymentId - Razorpay Payment ID (e.g. pay_xxx)
   * @param {string} params.signature - Razorpay Payment Signature
   * @param {number} [params.expectedAmount] - Expected amount in INR
   * @param {string} [params.expectedCurrency='INR'] - Expected currency
   */
  async verifyPayment({
    intentId,
    orderId,
    paymentId,
    signature,
    expectedAmount,
    expectedCurrency = 'INR'
  }) {
    if (!this.isConfigured()) {
      throw new Error(
        'Razorpay credentials are not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the server environment.'
      );
    }

    const targetOrderId = orderId || intentId;

    if (!targetOrderId || !paymentId || !signature) {
      return {
        verified: false,
        status: 'FAILED',
        error_message: 'orderId, paymentId, and signature are required for Razorpay verification'
      };
    }

    // 1. Signature Verification: HMAC-SHA256(order_id + "|" + payment_id, key_secret)
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${targetOrderId}|${paymentId}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const signatureBuf = Buffer.from(String(signature), 'utf8');

    const isSignatureMatch =
      expectedBuf.length === signatureBuf.length &&
      crypto.timingSafeEqual(expectedBuf, signatureBuf);

    if (!isSignatureMatch) {
      return {
        verified: false,
        status: 'FAILED',
        intent_id: targetOrderId,
        transaction_id: paymentId,
        error_message: 'Signature verification failed: signature does not match expected cryptographic hash'
      };
    }

    // 2. Authoritative Verification via Razorpay API: Fetch payment details
    try {
      const payment = await this.instance.payments.fetch(paymentId);

      // Verify payment belongs to this Razorpay order
      if (payment.order_id && payment.order_id !== targetOrderId) {
        return {
          verified: false,
          status: 'FAILED',
          intent_id: targetOrderId,
          transaction_id: paymentId,
          error_message: `Payment order mismatch: payment belongs to order ${payment.order_id}, expected ${targetOrderId}`
        };
      }

      // Verify amount in paise if expectedAmount is provided
      if (expectedAmount !== undefined && expectedAmount !== null) {
        const expectedPaise = Math.round(Number(expectedAmount) * 100);
        if (Number(payment.amount) !== expectedPaise) {
          return {
            verified: false,
            status: 'FAILED',
            intent_id: targetOrderId,
            transaction_id: paymentId,
            error_message: `Payment amount mismatch: received ₹${payment.amount / 100}, expected ₹${expectedAmount}`
          };
        }
      }

      // Verify currency
      if (expectedCurrency && payment.currency.toUpperCase() !== expectedCurrency.toUpperCase()) {
        return {
          verified: false,
          status: 'FAILED',
          intent_id: targetOrderId,
          transaction_id: paymentId,
          error_message: `Payment currency mismatch: received ${payment.currency}, expected ${expectedCurrency}`
        };
      }

      // Verify captured status (Only fulfilled orders must have captured payment)
      if (payment.status !== 'captured') {
        // If authorized, attempt auto-capture if permitted or flag as uncaptured
        if (payment.status === 'authorized') {
          try {
            const capturedPayment = await this.instance.payments.capture(
              paymentId,
              payment.amount,
              payment.currency
            );
            if (capturedPayment.status !== 'captured') {
              return {
                verified: false,
                status: 'FAILED',
                intent_id: targetOrderId,
                transaction_id: paymentId,
                error_message: `Payment authorized but capture failed with status: ${capturedPayment.status}`
              };
            }
          } catch (captureErr) {
            return {
              verified: false,
              status: 'FAILED',
              intent_id: targetOrderId,
              transaction_id: paymentId,
              error_message: `Payment authorized but capture failed: ${captureErr.message}`
            };
          }
        } else {
          return {
            verified: false,
            status: 'FAILED',
            intent_id: targetOrderId,
            transaction_id: paymentId,
            error_message: `Payment is in unverified state: ${payment.status}. Fulfillments require captured status.`
          };
        }
      }

      return {
        verified: true,
        status: 'SUCCESS',
        intent_id: targetOrderId,
        transaction_id: paymentId,
        gateway_reference: paymentId,
        payment_mode: payment.method,
        amount: payment.amount / 100,
        currency: payment.currency,
        timestamp: new Date().toISOString()
      };
    } catch (apiErr) {
      return {
        verified: false,
        status: 'FAILED',
        intent_id: targetOrderId,
        transaction_id: paymentId,
        error_message: `Razorpay API verification failed: ${apiErr.message}`
      };
    }
  }

  /**
   * Verifies Razorpay Webhook signature using constant-time comparison
   * @param {Object} params
   * @param {Buffer|string} params.rawBody
   * @param {string} params.signature - Value from x-razorpay-signature header
   * @param {string} [params.secret] - Optional webhook secret override
   */
  verifyWebhookSignature({ rawBody, signature, secret = null }) {
    const webhookSecret = secret || this.webhookSecret;
    if (!webhookSecret) {
      throw new Error('Razorpay Webhook Secret is not configured.');
    }

    if (!rawBody || !signature) {
      return false;
    }

    const payload = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const signatureBuf = Buffer.from(String(signature), 'utf8');

    return (
      expectedBuf.length === signatureBuf.length &&
      crypto.timingSafeEqual(expectedBuf, signatureBuf)
    );
  }

  /**
   * Refunds payment via Razorpay refund endpoint
   */
  async refundPayment({ paymentId, amount, notes = {} }) {
    if (!this.isConfigured()) {
      throw new Error('Razorpay credentials are not configured.');
    }

    const refundOptions = {
      amount: Math.round(Number(amount) * 100),
      notes
    };

    const refund = await this.instance.payments.refund(paymentId, refundOptions);

    return {
      refund_id: refund.id,
      provider: 'razorpay',
      payment_id: refund.payment_id,
      amount: refund.amount / 100,
      currency: refund.currency,
      status: refund.status === 'processed' ? 'REFUNDED' : refund.status,
      created_at: new Date().toISOString()
    };
  }
}

module.exports = RazorpayAdapter;
