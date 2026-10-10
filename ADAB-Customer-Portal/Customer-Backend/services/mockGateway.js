const crypto = require('crypto');

/**
 * MockPaymentGateway
 * Simulated production-grade payment provider for local development, testing, and offline modes.
 * Implements the standard Payment Provider contract.
 */
class MockPaymentGateway {
  constructor(config = {}) {
    this.name = 'mock';
    this.currency = config.currency || 'INR';
  }

  /**
   * Initializes a simulated payment intent / session
   * @param {Object} params
   * @param {number} params.amount - Total amount in base currency (INR)
   * @param {string} [params.currency='INR'] - 3-letter currency code
   * @param {string} [params.receipt] - Unique merchant receipt / reference ID
   * @param {string} [params.paymentMethod='UPI'] - Requested payment method
   * @param {Object} [params.customer] - Customer metadata { id, name, phone, email }
   * @param {Object} [params.metadata] - Arbitrary additional metadata
   * @returns {Promise<Object>} Standardized payment intent payload
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
    const randomHex = crypto.randomBytes(8).toString('hex');
    const intentId = `mock_pi_${Date.now()}_${randomHex}`;
    const clientSecret = `mock_sec_${crypto.randomBytes(16).toString('hex')}`;
    const receiptId = receipt || `rcpt_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      intent_id: intentId,
      provider: 'mock',
      amount: Math.round(numAmount * 100) / 100,
      amount_paise: Math.round(numAmount * 100),
      currency: currency.toUpperCase(),
      status: 'INITIATED',
      receipt: receiptId,
      client_secret: clientSecret,
      payment_method: paymentMethod,
      customer: {
        id: customer.id || null,
        name: customer.name || customer.full_name || 'Guest Customer',
        phone: customer.phone || null,
        email: customer.email || null
      },
      metadata: {
        ...metadata,
        simulated: true,
        created_at: new Date().toISOString()
      }
    };
  }

  /**
   * Verifies payment completion signature or status
   * @param {Object} params
   * @param {string} params.intentId - ID returned during createPaymentIntent
   * @param {string} [params.paymentId] - Gateway transaction ID
   * @param {string} [params.signature] - Gateway signature hash
   * @param {Object} [params.payload] - Additional callback or simulation payload
   */
  async verifyPayment({ intentId, paymentId, signature, payload = {} }) {
    if (!intentId) {
      throw new Error('intentId is required for payment verification');
    }

    // Support simulated failure scenarios for testing retry/failure flows
    if (payload.simulate_failure === true || payload.status === 'FAILED') {
      return {
        verified: false,
        status: 'FAILED',
        intent_id: intentId,
        error_message: payload.failure_reason || 'Simulated payment failure (insufficient funds or bank declined)'
      };
    }

    const txId = paymentId || `mock_tx_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

    return {
      verified: true,
      status: 'SUCCESS',
      intent_id: intentId,
      transaction_id: txId,
      gateway_reference: `REF_${txId.toUpperCase()}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Simulates payment refund
   * @param {Object} params
   * @param {string} params.paymentId - Transaction identifier
   * @param {number} params.amount - Refund amount
   * @param {Object} [params.notes] - Refund reason or audit metadata
   */
  async refundPayment({ paymentId, amount, notes = {} }) {
    if (!paymentId) {
      throw new Error('paymentId is required to process refund');
    }

    const refundId = `mock_rfnd_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

    return {
      refund_id: refundId,
      provider: 'mock',
      payment_id: paymentId,
      amount: Number(amount),
      currency: this.currency,
      status: 'REFUNDED',
      notes,
      created_at: new Date().toISOString()
    };
  }
}

module.exports = MockPaymentGateway;
