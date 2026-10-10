const crypto = require('crypto');

/**
 * RazorpayAdapter
 * Production Razorpay integration implementing the standard Payment Provider contract.
 * Uses native Node fetch and crypto to eliminate extra heavy dependencies.
 */
class RazorpayAdapter {
  constructor(config = {}) {
    this.name = 'razorpay';
    this.keyId = config.keyId || process.env.RAZORPAY_KEY_ID || null;
    this.keySecret = config.keySecret || process.env.RAZORPAY_KEY_SECRET || null;
    this.currency = config.currency || 'INR';
  }

  isConfigured() {
    return Boolean(this.keyId && this.keySecret);
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
    if (!amount || Number(amount) <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    const numAmount = Number(amount);
    const amountPaise = Math.round(numAmount * 100);
    const safeReceipt = String(receipt || `rcpt_${Date.now()}`).slice(0, 40);

    // If Razorpay API credentials are not supplied in .env, simulate seamlessly
    if (!this.isConfigured()) {
      const simOrderId = `order_sim_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      return {
        intent_id: simOrderId,
        order_id: simOrderId,
        provider: 'razorpay',
        is_simulated: true,
        key_id: this.keyId || 'rzp_test_unconfigured',
        amount: numAmount,
        amount_paise: amountPaise,
        currency: currency.toUpperCase(),
        status: 'INITIATED',
        receipt: safeReceipt,
        payment_method: paymentMethod,
        customer: {
          id: customer.id || null,
          name: customer.name || customer.full_name || 'Guest Customer',
          phone: customer.phone || null,
          email: customer.email || null
        },
        metadata: {
          ...metadata,
          note: 'Razorpay keys not configured in environment; returned simulated order intent'
        }
      };
    }

    // Call live Razorpay Orders API
    const authHeader = 'Basic ' + Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const payload = {
      amount: amountPaise,
      currency: currency.toUpperCase(),
      receipt: safeReceipt,
      notes: {
        customer_name: (customer.name || customer.full_name || 'Customer').slice(0, 40),
        customer_phone: (customer.phone || '').slice(0, 15),
        payment_method: paymentMethod || 'UPI',
        ...metadata
      }
    };

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`Razorpay Order creation failed: ${errData.error?.description || response.statusText}`);
    }

    const order = await response.json();
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
      customer: {
        id: customer.id || null,
        name: customer.name || customer.full_name,
        phone: customer.phone,
        email: customer.email
      },
      metadata: order.notes
    };
  }

  /**
   * Verifies Razorpay signature using HMAC-SHA256
   * signature = hmac_sha256(order_id + "|" + payment_id, key_secret)
   */
  async verifyPayment({ intentId, orderId, paymentId, signature, payload = {} }) {
    const targetOrderId = orderId || intentId;

    if (!this.isConfigured()) {
      return {
        verified: true,
        status: 'SUCCESS',
        intent_id: targetOrderId,
        transaction_id: paymentId || `pay_sim_${Date.now()}`,
        is_simulated: true,
        timestamp: new Date().toISOString()
      };
    }

    if (!targetOrderId || !paymentId || !signature) {
      return {
        verified: false,
        status: 'FAILED',
        error_message: 'orderId, paymentId, and signature are required for Razorpay verification'
      };
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${targetOrderId}|${paymentId}`)
      .digest('hex');

    const isMatch = expectedSignature === signature;

    return {
      verified: isMatch,
      status: isMatch ? 'SUCCESS' : 'FAILED',
      intent_id: targetOrderId,
      transaction_id: paymentId,
      gateway_reference: paymentId,
      error_message: isMatch ? null : 'Signature verification failed: signature does not match expected hash',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Refunds payment via Razorpay refund endpoint
   */
  async refundPayment({ paymentId, amount, notes = {} }) {
    if (!this.isConfigured()) {
      return {
        refund_id: `rfnd_sim_${Date.now()}`,
        provider: 'razorpay',
        payment_id: paymentId,
        amount: Number(amount),
        currency: this.currency,
        status: 'REFUNDED',
        is_simulated: true,
        created_at: new Date().toISOString()
      };
    }

    const authHeader = 'Basic ' + Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const payload = {
      amount: Math.round(Number(amount) * 100),
      notes
    };

    const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`Razorpay Refund failed: ${errData.error?.description || response.statusText}`);
    }

    const refund = await response.json();
    return {
      refund_id: refund.id,
      provider: 'razorpay',
      payment_id: refund.payment_id,
      amount: refund.amount / 100,
      currency: refund.currency,
      status: 'REFUNDED',
      created_at: new Date().toISOString()
    };
  }
}

module.exports = RazorpayAdapter;
