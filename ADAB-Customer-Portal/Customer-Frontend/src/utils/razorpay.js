/**
 * Secure Razorpay Standard Checkout Loader & Integration Helper
 * ADAB B2C Customer Portal - Test Mode
 */

export function isRazorpayLoaded() {
  return typeof window !== 'undefined' && typeof window.Razorpay === 'function';
}

export function loadRazorpaySDK() {
  return new Promise((resolve, reject) => {
    if (isRazorpayLoaded()) {
      return resolve(window.Razorpay);
    }

    if (typeof document === 'undefined') {
      return reject(new Error('Razorpay SDK can only be loaded in a browser environment'));
    }

    const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.Razorpay));
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Razorpay Checkout SDK')));
      // If already loaded before listeners attached
      if (isRazorpayLoaded()) return resolve(window.Razorpay);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      if (isRazorpayLoaded()) {
        resolve(window.Razorpay);
      } else {
        reject(new Error('Razorpay SDK script loaded, but window.Razorpay is unavailable'));
      }
    };
    script.onerror = () => {
      reject(new Error('Failed to load Razorpay Checkout SDK script from Razorpay CDN'));
    };
    document.body.appendChild(script);
  });
}

/**
 * Normalizes phone number into E.164 / Razorpay international format (+91XXXXXXXXXX)
 * @param {string|number} phone
 * @returns {string}
 */
export function formatRazorpayPhone(phone) {
  if (!phone) return '';
  const cleaned = String(phone).trim();
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (cleaned.startsWith('+')) {
    return `+${digits}`;
  }
  return digits.length > 10 ? `+${digits}` : `+91${digits}`;
}

/**
 * Opens Razorpay Standard Checkout modal
 * @param {Object} config
 * @param {string} config.key - Razorpay Public Test Key ID
 * @param {number} config.amountPaise - Amount in paise (integer)
 * @param {string} config.currency - Currency (e.g. 'INR')
 * @param {string} config.orderId - Razorpay Order ID (e.g. 'order_xxx')
 * @param {string} config.orderNumber - ADAB Order reference number
 * @param {Object} [config.prefill] - Customer display info
 * @param {Object|boolean} [config.readonly] - Readonly lock on prefilled fields (defaults to locking contact, name, email)
 * @param {Function} config.onSuccess - Callback on payment success: ({ razorpay_payment_id, razorpay_order_id, razorpay_signature })
 * @param {Function} config.onDismiss - Callback when customer dismisses/cancels checkout
 * @param {Function} config.onError - Callback on checkout failure
 */
export async function openRazorpayCheckout({
  key,
  amountPaise,
  currency = 'INR',
  orderId,
  orderNumber,
  method = null,
  prefill = {},
  readonly = null,
  config = null,
  onSuccess,
  onDismiss,
  onError
}) {
  if (!key) {
    throw new Error('Razorpay Key ID is required to open checkout modal.');
  }
  if (!orderId) {
    throw new Error('Razorpay Order ID is required to open checkout modal.');
  }

  const RazorpayConstructor = await loadRazorpaySDK();

  const formattedContact = formatRazorpayPhone(prefill.phone || prefill.contact || '');

  const options = {
    key,
    amount: amountPaise,
    currency: currency.toUpperCase(),
    name: 'ADAB',
    description: orderNumber ? `Order #${orderNumber}` : 'ADAB B2C Purchase',
    order_id: orderId,
    prefill: {
      name: prefill.name || '',
      email: prefill.email || '',
      contact: formattedContact,
      ...(method ? { method } : (prefill.method ? { method: prefill.method } : {}))
    },
    readonly: readonly !== null ? readonly : {
      contact: true,
      email: true,
      name: true
    },
    theme: {
      color: '#15803D' // ADAB brand green
    },
    modal: {
      backdropclose: false,
      escape: true,
      handleback: true,
      ondismiss: () => {
        if (typeof onDismiss === 'function') {
          onDismiss();
        }
      }
    },
    handler: function (response) {
      if (typeof onSuccess === 'function') {
        onSuccess(response);
      }
    }
  };

  // If an explicit config is passed, apply it to options.
  // Otherwise, if a specific payment method was requested (e.g. 'upi', 'card', 'netbanking', 'wallet'),
  // configure display blocks so Razorpay automatically prioritizes and opens that payment interface.
  if (config) {
    options.config = config;
  } else if (method) {
    const blockLabels = {
      upi: 'Pay via UPI / QR Code',
      card: 'Pay via Credit / Debit Card',
      netbanking: 'Pay via NetBanking',
      wallet: 'Pay via Digital Wallets'
    };

    options.config = {
      display: {
        blocks: {
          preferred: {
            name: blockLabels[method] || 'Pay Online',
            instruments: [{ method }]
          }
        },
        sequence: ['block.preferred'],
        preferences: {
          show_default_blocks: true
        }
      }
    };
  }

  const instance = new RazorpayConstructor(options);

  if (typeof onError === 'function') {
    instance.on('payment.failed', function (response) {
      onError(response.error || response);
    });
  }

  instance.open();
  return instance;
}
