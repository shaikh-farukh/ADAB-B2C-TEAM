const assert = require('assert');
const crypto = require('crypto');
const RazorpayAdapter = require('../services/razorpayAdapter');
const paymentService = require('../services/paymentService');

async function runBackendSecurityTests() {
  console.log('\n======================================================');
  console.log('🔒 RUNNING RAZORPAY TEST MODE BACKEND SECURITY TESTS');
  console.log('======================================================\n');

  const testKeyId = 'rzp_test_sec_demo12345';
  const testKeySecret = 'test_secret_xyz789ABCDEF1234567890';
  const testWebhookSecret = 'test_webhook_secret_999888777';

  let passedCount = 0;
  let totalCount = 0;

  function runTest(name, fn) {
    totalCount++;
    try {
      fn();
      console.log(`✅ [PASS] Test ${totalCount}: ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`❌ [FAIL] Test ${totalCount}: ${name}\n   Error: ${err.message}`);
    }
  }

  async function runAsyncTest(name, fn) {
    totalCount++;
    try {
      await fn();
      console.log(`✅ [PASS] Test ${totalCount}: ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`❌ [FAIL] Test ${totalCount}: ${name}\n   Error: ${err.message}`);
    }
  }

  // TEST 1: Missing credentials error handling
  runTest('Unconfigured Razorpay instance throws descriptive error and never fakes success', () => {
    const unconfigured = new RazorpayAdapter({ keyId: null, keySecret: null });
    assert.strictEqual(unconfigured.isConfigured(), false);
    assert.rejects(async () => {
      await unconfigured.createPaymentIntent({ amount: 100 });
    }, /Razorpay credentials are not configured/);
  });

  // TEST 2: Valid signature generation and constant-time verification
  await runAsyncTest('Valid payment signature passes constant-time verification', async () => {
    const orderId = 'order_test_1001';
    const paymentId = 'pay_test_2002';
    const validSignature = crypto
      .createHmac('sha256', testKeySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const mockPayments = {
      fetch: async (id) => {
        assert.strictEqual(id, paymentId);
        return {
          id: paymentId,
          order_id: orderId,
          amount: 50000, // 500.00 INR in paise
          currency: 'INR',
          status: 'captured',
          method: 'upi'
        };
      }
    };

    const adapter = new RazorpayAdapter({
      keyId: testKeyId,
      keySecret: testKeySecret,
      instance: {
        payments: mockPayments
      }
    });

    const result = await adapter.verifyPayment({
      orderId,
      paymentId,
      signature: validSignature,
      expectedAmount: 500,
      expectedCurrency: 'INR'
    });

    assert.strictEqual(result.verified, true);
    assert.strictEqual(result.status, 'SUCCESS');
    assert.strictEqual(result.transaction_id, paymentId);
  });

  // TEST 3: Invalid signature rejected
  await runAsyncTest('Invalid / forged payment signature is rejected immediately', async () => {
    const orderId = 'order_test_1001';
    const paymentId = 'pay_test_2002';
    const forgedSignature = 'forged_deadbeef1234567890abcdef1234567890abcdef1234567890abcdef1234';

    const adapter = new RazorpayAdapter({
      keyId: testKeyId,
      keySecret: testKeySecret,
      instance: {
        payments: { fetch: async () => ({}) }
      }
    });

    const result = await adapter.verifyPayment({
      orderId,
      paymentId,
      signature: forgedSignature,
      expectedAmount: 500
    });

    assert.strictEqual(result.verified, false);
    assert.strictEqual(result.status, 'FAILED');
    assert.match(result.error_message, /Signature verification failed/i);
  });

  // TEST 4: Tampered amount rejected
  await runAsyncTest('Tampered amount mismatch between order and gateway is rejected', async () => {
    const orderId = 'order_test_1001';
    const paymentId = 'pay_test_2002';
    const signature = crypto
      .createHmac('sha256', testKeySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const adapter = new RazorpayAdapter({
      keyId: testKeyId,
      keySecret: testKeySecret,
      instance: {
        payments: {
          fetch: async () => ({
            id: paymentId,
            order_id: orderId,
            amount: 10000, // Paid only ₹100 instead of ₹500
            currency: 'INR',
            status: 'captured',
            method: 'upi'
          })
        }
      }
    });

    const result = await adapter.verifyPayment({
      orderId,
      paymentId,
      signature,
      expectedAmount: 500, // Expected ₹500
      expectedCurrency: 'INR'
    });

    assert.strictEqual(result.verified, false);
    assert.strictEqual(result.status, 'FAILED');
    assert.match(result.error_message, /amount mismatch/i);
  });

  // TEST 5: Currency mismatch rejected
  await runAsyncTest('Currency mismatch is rejected', async () => {
    const orderId = 'order_test_1001';
    const paymentId = 'pay_test_2002';
    const signature = crypto
      .createHmac('sha256', testKeySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const adapter = new RazorpayAdapter({
      keyId: testKeyId,
      keySecret: testKeySecret,
      instance: {
        payments: {
          fetch: async () => ({
            id: paymentId,
            order_id: orderId,
            amount: 50000,
            currency: 'USD', // Mismatched currency
            status: 'captured',
            method: 'card'
          })
        }
      }
    });

    const result = await adapter.verifyPayment({
      orderId,
      paymentId,
      signature,
      expectedAmount: 500,
      expectedCurrency: 'INR'
    });

    assert.strictEqual(result.verified, false);
    assert.strictEqual(result.status, 'FAILED');
    assert.match(result.error_message, /currency mismatch/i);
  });

  // TEST 6: Uncaptured / pending payments cannot mark order paid
  await runAsyncTest('Uncaptured / failed payment status from gateway cannot mark order as paid', async () => {
    const orderId = 'order_test_1001';
    const paymentId = 'pay_test_2002';
    const signature = crypto
      .createHmac('sha256', testKeySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const adapter = new RazorpayAdapter({
      keyId: testKeyId,
      keySecret: testKeySecret,
      instance: {
        payments: {
          fetch: async () => ({
            id: paymentId,
            order_id: orderId,
            amount: 50000,
            currency: 'INR',
            status: 'failed', // Failed at bank
            method: 'card'
          })
        }
      }
    });

    const result = await adapter.verifyPayment({
      orderId,
      paymentId,
      signature,
      expectedAmount: 500,
      expectedCurrency: 'INR'
    });

    assert.strictEqual(result.verified, false);
    assert.strictEqual(result.status, 'FAILED');
    assert.match(result.error_message, /unverified state|failed/i);
  });

  // TEST 7: Cross-order Razorpay order ID substitution rejected
  await runAsyncTest('Payment belonging to a different Razorpay order is rejected', async () => {
    const orderId = 'order_test_1001';
    const otherOrderId = 'order_victim_9999';
    const paymentId = 'pay_test_2002';
    const signature = crypto
      .createHmac('sha256', testKeySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const adapter = new RazorpayAdapter({
      keyId: testKeyId,
      keySecret: testKeySecret,
      instance: {
        payments: {
          fetch: async () => ({
            id: paymentId,
            order_id: otherOrderId, // Belongs to different order!
            amount: 50000,
            currency: 'INR',
            status: 'captured',
            method: 'upi'
          })
        }
      }
    });

    const result = await adapter.verifyPayment({
      orderId,
      paymentId,
      signature,
      expectedAmount: 500,
      expectedCurrency: 'INR'
    });

    assert.strictEqual(result.verified, false);
    assert.strictEqual(result.status, 'FAILED');
    assert.match(result.error_message, /order mismatch/i);
  });

  // TEST 8: Webhook valid signature verification
  runTest('Razorpay webhook HMAC signature verification accepts genuine webhook payload', () => {
    const adapter = new RazorpayAdapter({
      keyId: testKeyId,
      keySecret: testKeySecret,
      webhookSecret: testWebhookSecret
    });

    const rawPayload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_hook_123',
            amount: 25000,
            currency: 'INR',
            status: 'captured'
          }
        }
      }
    });

    const validSignature = crypto
      .createHmac('sha256', testWebhookSecret)
      .update(rawPayload)
      .digest('hex');

    const isValid = adapter.verifyWebhookSignature({
      rawBody: rawPayload,
      signature: validSignature
    });

    assert.strictEqual(isValid, true);
  });

  // TEST 9: Webhook forged signature rejected
  runTest('Razorpay webhook forged signature is rejected with constant-time comparison', () => {
    const adapter = new RazorpayAdapter({
      keyId: testKeyId,
      keySecret: testKeySecret,
      webhookSecret: testWebhookSecret
    });

    const rawPayload = JSON.stringify({ event: 'payment.captured' });
    const forgedSignature = 'forged_webhook_signature_abcdef1234567890';

    const isValid = adapter.verifyWebhookSignature({
      rawBody: rawPayload,
      signature: forgedSignature
    });

    assert.strictEqual(isValid, false);
  });

  // TEST 10: Secret Leakage Check in Adapter payload responses
  await runAsyncTest('Razorpay order creation response never exposes keySecret or internal tokens', async () => {
    const adapter = new RazorpayAdapter({
      keyId: testKeyId,
      keySecret: testKeySecret,
      instance: {
        orders: {
          create: async (opts) => ({
            id: 'order_test_created',
            amount: opts.amount,
            currency: opts.currency,
            receipt: opts.receipt,
            created_at: 1700000000
          })
        }
      }
    });

    const intent = await adapter.createPaymentIntent({
      amount: 250,
      currency: 'INR',
      receipt: 'test_rcpt_1'
    });

    assert.strictEqual(intent.intent_id, 'order_test_created');
    assert.strictEqual(intent.key_id, testKeyId);
    assert.strictEqual(intent.keySecret, undefined);
    assert.strictEqual(intent.key_secret, undefined);
    assert.strictEqual(intent.secret, undefined);
  });

  console.log('\n------------------------------------------------------');
  console.log(`📊 RESULTS: ${passedCount}/${totalCount} tests passed.`);
  console.log('------------------------------------------------------\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runBackendSecurityTests();
