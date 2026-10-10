const MockPaymentGateway = require('./mockGateway');
const RazorpayAdapter = require('./razorpayAdapter');

/**
 * PaymentAdapter
 * Clean Payment Provider Abstraction Layer.
 * Decouples controllers and services from specific payment providers.
 * Any gateway (Razorpay, Stripe, Mock, Cashfree, Paytm) can be plugged in seamlessly.
 */
class PaymentAdapter {
  constructor() {
    this.providers = new Map();

    // Register standard out-of-the-box providers
    this.registerProvider('mock', new MockPaymentGateway());
    this.registerProvider('razorpay', new RazorpayAdapter());

    // Auto-detect or read preferred gateway from environment
    this.defaultProvider = (
      process.env.PAYMENT_GATEWAY_PROVIDER ||
      (process.env.RAZORPAY_KEY_ID ? 'razorpay' : 'mock')
    ).toLowerCase();
  }

  /**
   * Register a new or custom payment gateway provider
   * @param {string} name - Unique identifier for the provider (e.g. 'stripe', 'cashfree')
   * @param {Object} providerInstance - Instance implementing createPaymentIntent, verifyPayment, refundPayment
   */
  registerProvider(name, providerInstance) {
    if (!name || typeof name !== 'string') {
      throw new Error('Provider name must be a non-empty string');
    }
    if (!providerInstance || typeof providerInstance.createPaymentIntent !== 'function') {
      throw new Error(`Provider "${name}" must implement createPaymentIntent() method`);
    }
    this.providers.set(name.toLowerCase(), providerInstance);
  }

  /**
   * Retrieve a registered provider instance
   * @param {string} [name] - Provider identifier. Defaults to active default provider.
   * @returns {Object} Provider instance
   */
  getProvider(name) {
    const target = (name || this.defaultProvider).toLowerCase();
    const provider = this.providers.get(target);
    if (!provider) {
      const available = Array.from(this.providers.keys()).join(', ');
      throw new Error(`Payment provider "${target}" is not registered. Available providers: ${available}`);
    }
    return provider;
  }

  /**
   * Set default active provider at runtime
   * @param {string} name
   */
  setDefaultProvider(name) {
    const target = name.toLowerCase();
    if (!this.providers.has(target)) {
      throw new Error(`Cannot set default: provider "${target}" is not registered.`);
    }
    this.defaultProvider = target;
  }

  /**
   * List names of all registered providers
   * @returns {string[]}
   */
  listProviders() {
    return Array.from(this.providers.keys());
  }

  /**
   * Universal Create Payment Intent
   * Initializes a payment session through the active or specified provider.
   * @param {Object} params - Standard payment parameters
   * @param {string} [providerName] - Optional provider override
   * @returns {Promise<Object>} Standardized payment intent payload
   */
  async createPaymentIntent(params, providerName = null) {
    const provider = this.getProvider(providerName);
    return await provider.createPaymentIntent(params);
  }

  /**
   * Universal Verify Payment
   * Verifies callback signature and payment validity through the active provider.
   * @param {Object} params - Verification parameters (intentId, paymentId, signature, etc.)
   * @param {string} [providerName] - Optional provider override
   * @returns {Promise<Object>} Verification result with status: 'SUCCESS' | 'FAILED'
   */
  async verifyPayment(params, providerName = null) {
    const provider = this.getProvider(providerName);
    return await provider.verifyPayment(params);
  }

  /**
   * Universal Refund Payment
   * Issues refund through the active or specified provider.
   * @param {Object} params - Refund parameters
   * @param {string} [providerName] - Optional provider override
   * @returns {Promise<Object>} Refund response
   */
  async refundPayment(params, providerName = null) {
    const provider = this.getProvider(providerName);
    return await provider.refundPayment(params);
  }
}

// Export singleton instance
module.exports = new PaymentAdapter();
