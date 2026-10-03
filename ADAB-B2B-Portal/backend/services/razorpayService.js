import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key_id',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_key_secret',
});

/**
 * Creates a new Razorpay Order.
 * @param {number} amountPaise - Total amount in paise (smallest currency unit).
 * @param {string} receipt - Unique receipt identifier (e.g., checkout ID or idempotency key).
 * @returns {Promise<Object>} The Razorpay order object.
 */
export const createRazorpayOrder = async (amountPaise, receipt) => {
    const options = {
        amount: amountPaise,
        currency: 'INR',
        receipt: receipt,
    };

    try {
        const order = await razorpay.orders.create(options);
        return order;
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        throw new Error('Failed to create Razorpay order');
    }
};

/**
 * Verifies the signature from Razorpay Checkout client callback.
 * @param {string} orderId - The Razorpay order ID.
 * @param {string} paymentId - The Razorpay payment ID.
 * @param {string} signature - The signature returned by Razorpay.
 * @returns {boolean} True if the signature is valid, false otherwise.
 */
export const verifyPaymentSignature = (orderId, paymentId, signature) => {
    try {
        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret) throw new Error("RAZORPAY_KEY_SECRET is not configured");

        const body = `${orderId}|${paymentId}`;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(body.toString())
            .digest('hex');
            
        return expectedSignature === signature;
    } catch (error) {
        console.error('Error verifying payment signature:', error);
        return false;
    }
};

/**
 * Verifies the signature from a Razorpay webhook payload.
 * @param {string} rawBody - The raw request body string.
 * @param {string} signature - The signature from X-Razorpay-Signature header.
 * @returns {boolean} True if valid, false otherwise.
 */
export const verifyWebhookSignature = (rawBody, signature) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured");

        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(rawBody)
            .digest('hex');
            
        return expectedSignature === signature;
    } catch (error) {
        console.error('Error verifying webhook signature:', error);
        return false;
    }
};

/**
 * Fetches a payment directly from Razorpay to verify its actual amount, currency, and status.
 * Used for authoritative server-to-server validation, preventing amount tampering.
 * @param {string} paymentId - The Razorpay payment ID to fetch.
 * @returns {Promise<Object>} The Razorpay payment object.
 */
export const fetchPayment = async (paymentId) => {
    try {
        const payment = await razorpay.payments.fetch(paymentId);
        return payment;
    } catch (error) {
        console.error(`Error fetching Razorpay payment ${paymentId}:`, error);
        throw new Error('Failed to fetch payment details from Razorpay');
    }
};

/**
 * Fetches an order directly from Razorpay to verify its actual status.
 * @param {string} orderId - The Razorpay order ID to fetch.
 * @returns {Promise<Object>} The Razorpay order object.
 */
export const fetchOrder = async (orderId) => {
    try {
        const order = await razorpay.orders.fetch(orderId);
        return order;
    } catch (error) {
        console.error(`Error fetching Razorpay order ${orderId}:`, error);
        throw new Error('Failed to fetch order details from Razorpay');
    }
};

