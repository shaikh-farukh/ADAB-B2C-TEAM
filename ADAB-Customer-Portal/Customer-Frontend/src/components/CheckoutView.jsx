import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import AddressModal from './AddressModal';
import { CustomerAPI, CheckoutAPI, PaymentAPI, generateIdempotencyKey } from '../services/api';

/**
 * Checkout Screen Component (sec-checkout)
 * Matches unified-customer-portal-demo.html
 */
export default function CheckoutView({
  cartData = { items: [], summary: {} },
  onPlaceOrder,
  onBackToCart,
  loading = false,
  selectedDeliveryAddress = null,
  onSelectDeliveryAddress = null
}) {
  const [deliverySpeed, setDeliverySpeed] = useState('fast'); // 'fast', 'same', 'pickup'
  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi', 'card', 'bnpl', 'cod'
  
  // Real database-backed saved addresses
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  
  // Modal / Drawer state matching unified-customer-portal-demo.html
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [modalView, setModalView] = useState('list'); // 'list' | 'add' | 'edit'
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressModalError, setAddressModalError] = useState(null);
  
  // Selected delivery address for this checkout session
  const [address, setAddress] = useState({
    id: null,
    label: 'Home',
    full_name: '',
    phone: '',
    address_line: '',
    landmark: '',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395002',
    is_default: false
  });

  // Form state for adding/editing an address
  const [addressForm, setAddressForm] = useState({
    id: null,
    label: 'Home',
    recipient_name: '',
    phone: '',
    address_line: '',
    landmark: '',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395002',
    is_default: false
  });

  const [errorMessage, setErrorMessage] = useState(null);

  // Delivery Slots state (Day 3 Frontend Task 2)
  const [deliverySlots, setDeliverySlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotDateFilter, setSlotDateFilter] = useState('today'); // 'today' | 'tomorrow'

  // Serviceability state (Day 3 Frontend Task 2)
  const [serviceability, setServiceability] = useState(null);
  const [loadingServiceability, setLoadingServiceability] = useState(false);
  const [showPincodeChecker, setShowPincodeChecker] = useState(false);
  const [customPincodeInput, setCustomPincodeInput] = useState('');
  const [customPincodeResult, setCustomPincodeResult] = useState(null);

  // Dynamic server-backed checkout preview state
  const [serverPreview, setServerPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Payment Method Detail States (Day 3 Frontend Task 3)
  const [savedCards, setSavedCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [cardCvv, setCardCvv] = useState('123');
  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [newCardData, setNewCardData] = useState({
    number: '',
    name: 'Pooja Sharma',
    expiry: '12/28',
    cvv: '123',
    save_card: true
  });

  // UPI Sub-options (GPay, PhonePe, Paytm, VPA, QR)
  const [upiSubMethod, setUpiSubMethod] = useState('apps'); // 'apps' | 'vpa' | 'qr'
  const [upiApp, setUpiApp] = useState('gpay'); // 'gpay' | 'phonepe' | 'paytm'
  const [upiVpa, setUpiVpa] = useState('pooja@okhdfcbank');
  const [vpaVerified, setVpaVerified] = useState(true);

  // ADAB 0% Pay Later & Digital Wallet states
  const [walletData, setWalletData] = useState({ balance: 500, bnpl_limit: 10000, bnpl_available: 8450 });
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [useWalletBalance, setUseWalletBalance] = useState(false);

  // Payment Processing, Failure, Retry & Cancellation States (Day 3 Frontend Task 4)
  const [paymentProcessing, setPaymentProcessing] = useState({
    isOpen: false,
    step: 'idle', // 'idle' | 'initiating' | 'authorizing' | 'paid' | 'failed' | 'cancelled'
    intentId: null,
    error: null,
    failureReason: null,
    retryCount: 0,
    isRetrying: false
  });
  const [paymentNotice, setPaymentNotice] = useState(null); // Non-blocking inline banner for switch method / cancellation
  const [simulateFailure, setSimulateFailure] = useState(false); // QA simulation toggle
  const [simulateCancellation, setSimulateCancellation] = useState(false); // QA simulation toggle

  // Double-Click & Rapid-Tap Synchronous Lock References (Day 3 Frontend Task 5)
  const isSubmittingRef = useRef(false);
  const isRetryingRef = useRef(false);

  // Load real customer addresses from database
  const fetchSavedAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const res = await CustomerAPI.getAddresses();
      if (res && res.status === 'success' && Array.isArray(res.data) && res.data.length > 0) {
        setSavedAddresses(res.data);
        const currentMatch = selectedAddressId
          ? res.data.find((a) => a.id === selectedAddressId)
          : null;
        const defaultAddr = res.data.find((a) => a.is_default) || res.data[0];
        selectAddress(currentMatch || defaultAddr);
      } else {
        setSavedAddresses([]);
      }
    } catch (err) {
      console.warn('Could not load saved addresses from database:', err.message);
    } finally {
      setLoadingAddresses(false);
    }
  };

  // Check checkout serviceability for the selected address / pincode
  const runServiceabilityCheck = async (targetPincode, targetAddressLine) => {
    try {
      setLoadingServiceability(true);
      const pin = targetPincode || address.pincode || '395002';
      const addr = targetAddressLine || address.address_line || '';
      const res = await CheckoutAPI.checkServiceability({
        pincode: pin,
        address_line: addr
      });
      if (res && res.status === 'success' && res.data) {
        setServiceability(res.data);
        if (!res.data.is_serviceable && (deliverySpeed === 'fast' || deliverySpeed === 'same')) {
          setDeliverySpeed('pickup');
        }
      }
    } catch (err) {
      console.warn('Serviceability check failed:', err.message);
    } finally {
      setLoadingServiceability(false);
    }
  };

  // Inspect available delivery slots from database
  const fetchDeliverySlots = async () => {
    try {
      setLoadingSlots(true);
      const res = await CheckoutAPI.getDeliverySlots();
      if (res && res.status === 'success' && Array.isArray(res.data)) {
        setDeliverySlots(res.data);
        if (!selectedSlot && res.data.length > 0) {
          const firstAvailable = res.data.find((s) => s.is_available) || res.data[0];
          setSelectedSlot(firstAvailable);
        }
      }
    } catch (err) {
      console.warn('Could not fetch delivery slots:', err.message);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Load saved payment methods and customer wallet from DB
  const fetchPaymentMethodsAndWallet = async () => {
    try {
      setLoadingCards(true);
      setLoadingWallet(true);
      const [cardsRes, walletRes] = await Promise.all([
        CustomerAPI.getPaymentMethods().catch(() => ({ data: [] })),
        CustomerAPI.getWallet().catch(() => ({ data: { balance: 500, bnpl_limit: 10000, bnpl_available: 8450 } }))
      ]);

      if (cardsRes?.data && Array.isArray(cardsRes.data)) {
        setSavedCards(cardsRes.data);
        const defaultCard = cardsRes.data.find((c) => c.is_default) || cardsRes.data[0];
        if (defaultCard) setSelectedCardId(defaultCard.id);
      }
      if (walletRes?.data) {
        setWalletData(walletRes.data);
      }
    } catch (err) {
      console.warn('Could not load payment methods / wallet:', err.message);
    } finally {
      setLoadingCards(false);
      setLoadingWallet(false);
    }
  };

  // Map internal speeds to backend DB constraints
  const getBackendDeliverySpeed = (speed = deliverySpeed) => {
    if (speed === 'same') return 'SAME_DAY';
    if (speed === 'pickup') return 'STORE_PICKUP';
    return 'EXPRESS_30M';
  };

  // Map internal payment methods to backend DB constraints
  const getBackendPaymentMethod = (method = paymentMethod) => {
    if (method === 'cod') return 'CASH_ON_DELIVERY';
    if (method === 'card') return 'CARD';
    if (method === 'bnpl') return 'ADAB_PAY_LATER';
    return 'UPI';
  };

  // Resolve active coupon code from cart or server preview
  const appliedCouponCode =
    cartData.cart?.coupon_code ||
    cartData.summary?.coupon_code ||
    cartData.summary?.pricing?.coupon_code ||
    serverPreview?.pricing?.coupon_code ||
    serverPreview?.coupon_code ||
    null;

  // Fetch authoritative preview from server when speed or coupon changes
  const fetchServerPreview = async (speedToPreview) => {
    try {
      setLoadingPreview(true);
      const bSpeed = getBackendDeliverySpeed(speedToPreview);
      const res = await CheckoutAPI.preview(bSpeed, appliedCouponCode);
      if (res && res.status === 'success' && res.data) {
        setServerPreview(res.data);
      }
    } catch (err) {
      console.warn('Dynamic preview refresh note:', err.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    fetchSavedAddresses();
    fetchDeliverySlots();
    fetchPaymentMethodsAndWallet();
  }, []);

  // Whenever selected address changes, trigger serviceability verification
  useEffect(() => {
    if (address && address.pincode) {
      runServiceabilityCheck(address.pincode, address.address_line);
    }
  }, [address.pincode, address.address_line]);

  // Whenever delivery speed or coupon changes, refresh authoritative backend preview
  useEffect(() => {
    fetchServerPreview(deliverySpeed);
  }, [deliverySpeed, appliedCouponCode, cartData.summary?.subtotal, cartData.summary?.discount]);

  // If parent provided a selected delivery address, use it
  useEffect(() => {
    if (selectedDeliveryAddress && selectedDeliveryAddress.id) {
      selectAddress(selectedDeliveryAddress);
    }
  }, [selectedDeliveryAddress?.id]);

  const selectAddress = (addr) => {
    if (!addr) return;
    setSelectedAddressId(addr.id);
    const chosen = {
      id: addr.id,
      label: addr.label || 'Home',
      full_name: addr.recipient_name || addr.full_name || 'Customer',
      phone: addr.phone || '',
      address_line: addr.address_line || addr.address || '',
      landmark: addr.landmark || '',
      city: addr.city || 'Surat',
      state: addr.state || 'Gujarat',
      pincode: addr.pincode || addr.zip || '395002',
      is_default: !!addr.is_default
    };
    setAddress(chosen);
    if (onSelectDeliveryAddress) {
      onSelectDeliveryAddress(chosen);
    }
  };

  const handleOpenAddAddress = () => {
    setAddressForm({
      id: null,
      label: 'Home',
      recipient_name: address.full_name || 'Pooja Sharma',
      phone: address.phone || '+91 98765 12340',
      address_line: '',
      landmark: '',
      city: 'Surat',
      state: 'Gujarat',
      pincode: '395002',
      is_default: savedAddresses.length === 0
    });
    setAddressModalError(null);
    setModalView('add');
    setIsAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addrToEdit) => {
    setAddressForm({
      id: addrToEdit.id,
      label: addrToEdit.label || 'Home',
      recipient_name: addrToEdit.recipient_name || addrToEdit.full_name || '',
      phone: addrToEdit.phone || '',
      address_line: addrToEdit.address_line || addrToEdit.address || '',
      landmark: addrToEdit.landmark || '',
      city: addrToEdit.city || 'Surat',
      state: addrToEdit.state || 'Gujarat',
      pincode: addrToEdit.pincode || addrToEdit.zip || '395002',
      is_default: !!addrToEdit.is_default
    });
    setAddressModalError(null);
    setModalView('edit');
    setIsAddressModalOpen(true);
  };

  const handleSaveAddressSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!addressForm.recipient_name.trim() || !addressForm.phone.trim() || !addressForm.address_line.trim()) {
      setAddressModalError('Please provide recipient name, phone number, and street address.');
      return;
    }

    setSavingAddress(true);
    setAddressModalError(null);
    try {
      let savedRecord = null;
      if (modalView === 'edit' && addressForm.id) {
        const res = await CustomerAPI.updateAddress(addressForm.id, addressForm);
        savedRecord = res.data;
      } else {
        const res = await CustomerAPI.addAddress(addressForm);
        savedRecord = res.data;
      }

      const freshRes = await CustomerAPI.getAddresses();
      if (freshRes && freshRes.status === 'success' && Array.isArray(freshRes.data)) {
        setSavedAddresses(freshRes.data);
        const newlySelected = savedRecord
          ? freshRes.data.find((a) => a.id === savedRecord.id)
          : null;
        selectAddress(newlySelected || freshRes.data[0]);
      }

      setIsAddressModalOpen(false);
      setModalView('list');
    } catch (err) {
      setAddressModalError(err.message || 'Failed to save address to database.');
    } finally {
      setSavingAddress(false);
    }
  };

  // Custom standalone pincode checker handler
  const handleCheckCustomPincode = async (e) => {
    if (e) e.preventDefault();
    if (!customPincodeInput.trim()) return;
    try {
      setCustomPincodeResult({ loading: true });
      const res = await CheckoutAPI.checkServiceability({
        pincode: customPincodeInput.trim()
      });
      setCustomPincodeResult(res.data);
    } catch (err) {
      setCustomPincodeResult({ error: err.message });
    }
  };

  const items = cartData.items || [];
  const summary = cartData.summary || {};

  // Dynamic fee calculation wired to server preview with client fallback
  let fee = 29;
  if (serverPreview?.pricing?.delivery_fee !== undefined) {
    fee = Number(serverPreview.pricing.delivery_fee);
  } else {
    if (deliverySpeed === 'same') fee = 19;
    if (deliverySpeed === 'pickup') fee = 0;
    if ((summary.subtotal || 0) >= 499 && deliverySpeed !== 'pickup') fee = 0;
  }

  const discount = serverPreview?.pricing?.discount !== undefined
    ? Number(serverPreview.pricing.discount)
    : (Number(summary.discount) || Number(summary.pricing?.discount) || 0);

  const subtotal = serverPreview?.pricing?.subtotal !== undefined
    ? Number(serverPreview.pricing.subtotal)
    : (Number(summary.subtotal) || Number(summary.pricing?.subtotal) || 0);

  const rawTotalPayable = serverPreview?.pricing?.grand_total !== undefined
    ? Number(serverPreview.pricing.grand_total)
    : Math.max(0, subtotal + fee - discount);

  // Digital Wallet balance deduction calculation
  const walletAvailable = Number(walletData?.balance || 0);
  const walletDeduction = useWalletBalance ? Math.min(walletAvailable, rawTotalPayable) : 0;
  const totalPayable = Math.max(0, rawTotalPayable - walletDeduction);

  const pointsEarned = Math.floor(rawTotalPayable / 100);

  // Comprehensive Payment Intent Initiation & Order Submission Flow (Day 3 Frontend Task 3 & Task 5)
  const handlePlaceOrderSubmit = async (overrideMethod = null) => {
    // SYNCHRONOUS DOUBLE-CLICK GUARD (Day 3 Frontend Task 5)
    if (isSubmittingRef.current || loading || paymentProcessing.isOpen) {
      console.warn('Prevented duplicate order submission: rapid click or double-click ignored.');
      return;
    }
    isSubmittingRef.current = true;

    try {
      const activeMethod = overrideMethod || paymentMethod;

      if (items.length === 0) {
        setErrorMessage('Your cart is empty. Add items before placing an order.');
        return;
      }

      if (!address.address_line || !address.address_line.trim()) {
        setErrorMessage('Please select or add a valid delivery address before placing an order.');
        setIsAddressModalOpen(true);
        return;
      }

      // Guard: Prevent placing unserviceable delivery speed
      if (serviceability && !serviceability.is_serviceable && deliverySpeed !== 'pickup') {
        setErrorMessage('Selected pincode is outside delivery radius. Please switch to Self Pickup or choose a serviceable address.');
        return;
      }

      // Guard: UPI validation
      if (activeMethod === 'upi' && upiSubMethod === 'vpa' && !upiVpa.includes('@')) {
        setErrorMessage('Please enter a valid UPI ID (e.g. yourname@okhdfcbank).');
        return;
      }

      // Guard: Card validation
      if (activeMethod === 'card' && showAddCardForm) {
        const cleanCard = (newCardData.number || '').replace(/\s+/g, '');
        if (cleanCard.length < 15) {
          setErrorMessage('Please enter a valid 16-digit card number.');
          return;
        }
        if (!newCardData.cvv || newCardData.cvv.length < 3) {
          setErrorMessage('Please enter a valid 3-digit CVV.');
          return;
        }
      }

      setErrorMessage(null);
      setPaymentNotice(null);

      // If new card was added with save_card checked, persist it in payment_methods table
      if (activeMethod === 'card' && showAddCardForm && newCardData.save_card) {
        try {
          const rawNum = newCardData.number.replace(/\s+/g, '');
          const last4 = rawNum.slice(-4) || '1234';
          const brand = rawNum.startsWith('4') ? 'Visa' : rawNum.startsWith('5') ? 'Mastercard' : 'RuPay';
          await CustomerAPI.addPaymentMethod({
            provider: `${newCardData.name || 'Personal'} ${brand}`,
            last4,
            expiry_month: parseInt((newCardData.expiry || '12/28').split('/')[0], 10) || 12,
            expiry_year: 2000 + (parseInt((newCardData.expiry || '12/28').split('/')[1], 10) || 28),
            is_default: false
          });
        } catch (saveCardErr) {
          console.warn('Could not save card to payment_methods:', saveCardErr.message);
        }
      }

      // STEP 1: ANIMATED STATUS -> 'initiating'
      setPaymentProcessing({
        isOpen: true,
        step: 'initiating',
        intentId: null,
        error: null,
        failureReason: null,
        isRetrying: false,
        retryCount: 0
      });

      const intentPayload = {
        cart_id: cartData.cart ? cartData.cart.id : undefined,
        amount: totalPayable,
        currency: 'INR',
        delivery_speed: getBackendDeliverySpeed(),
        payment_method: getBackendPaymentMethod(activeMethod),
        coupon_code: appliedCouponCode || summary.coupon_code || null,
        customer_name: address.full_name,
        customer_phone: address.phone,
        customer_email: 'customer@adab.com',
        payment_details: {
          method: activeMethod,
          upi_sub_method: upiSubMethod,
          upi_app: upiApp,
          upi_vpa: upiVpa,
          card_id: selectedCardId,
          wallet_applied: walletDeduction > 0,
          wallet_deduction: walletDeduction
        }
      };

      // Client-side unique idempotency key generation (Day 3 Frontend Task 5)
      const intentKey = generateIdempotencyKey('pi');
      const intentRes = await CheckoutAPI.createPaymentIntent(intentPayload, intentKey);
      const createdIntent = intentRes?.data || {};
      const intentId = createdIntent.intent_id || createdIntent.id;

      // STEP 2: ANIMATED STATUS -> 'authorizing'
      setPaymentProcessing((prev) => ({
        ...prev,
        step: 'authorizing',
        intentId
      }));

      // Check QA simulation triggers
      if (simulateCancellation) {
        await new Promise((r) => setTimeout(r, 650));
        setPaymentProcessing((prev) => ({
          ...prev,
          step: 'cancelled',
          error: 'Transaction cancelled by customer.',
          failureReason: 'Payment authorization aborted at customer request.'
        }));
        return;
      }

      if (simulateFailure) {
        await new Promise((r) => setTimeout(r, 700));
        throw new Error('Bank Gateway 402: Card transaction declined by issuing bank (Simulated Test).');
      }

      // Gateway verification handshake for digital payments
      if (activeMethod !== 'cod') {
        await new Promise((r) => setTimeout(r, 750));
      }

      // STEP 3: ANIMATED STATUS -> 'paid'
      setPaymentProcessing((prev) => ({
        ...prev,
        step: 'paid'
      }));

      // Short delay for visual completion
      await new Promise((r) => setTimeout(r, 500));

      // FINAL STEP: ORDER SUBMISSION WITH UNIQUE CLIENT IDEMPOTENCY KEY (Day 3 Frontend Task 5)
      const orderIdempotencyKey = generateIdempotencyKey('ord');
      await onPlaceOrder({
        cart_id: cartData.cart ? cartData.cart.id : undefined,
        customer_name: address.full_name,
        customer_phone: address.phone,
        customer_email: 'customer@adab.com',
        delivery_address: {
          ...address,
          delivery_slot: deliverySpeed === 'same' ? selectedSlot : null,
          delivery_slot_id: deliverySpeed === 'same' ? selectedSlot?.id : null
        },
        delivery_speed: getBackendDeliverySpeed(),
        payment_method: getBackendPaymentMethod(activeMethod),
        payment_intent_id: intentId,
        coupon_code: appliedCouponCode || summary.coupon_code || null,
        idempotency_key: orderIdempotencyKey
      });

      setPaymentProcessing({
        isOpen: false,
        step: 'idle',
        intentId: null,
        error: null,
        failureReason: null,
        isRetrying: false,
        retryCount: 0
      });
    } catch (err) {
      console.error('Payment intent / order error:', err);
      setPaymentProcessing((prev) => ({
        ...prev,
        step: 'failed',
        error: err.message || 'Payment processing declined',
        failureReason: err.message || 'Gateway declined the transaction.',
        isRetrying: false
      }));
    } finally {
      isSubmittingRef.current = false;
    }
  };

  // DAY 3 FRONTEND TASK 4 & TASK 5: RETRY HANDLER WITH IDEMPOTENCY KEY & DOUBLE-CLICK GUARD
  const handleRetryPayment = async () => {
    // SYNCHRONOUS DOUBLE-CLICK GUARD FOR RETRY
    if (isRetryingRef.current || paymentProcessing.isRetrying) {
      console.warn('Prevented duplicate retry click.');
      return;
    }
    isRetryingRef.current = true;

    const currentIntentId = paymentProcessing.intentId;
    setPaymentProcessing((prev) => ({
      ...prev,
      isRetrying: true,
      error: null
    }));

    try {
      // 1. Hit backend retry endpoint with unique retry idempotency key: POST /api/v1/payments/:id/retry
      const retryKey = generateIdempotencyKey('retry');
      if (currentIntentId) {
        try {
          await PaymentAPI.retry(
            currentIntentId,
            {
              payment_method: getBackendPaymentMethod(),
              payment_gateway: 'mock',
              customer_notes: 'Retried from customer checkout UI'
            },
            retryKey
          );
        } catch (retryApiErr) {
          console.warn('Backend retry notice:', retryApiErr.message);
        }
      }

      // Turn off simulateFailure if it was on so retry succeeds
      if (simulateFailure) {
        setSimulateFailure(false);
      }

      // 2. Transition back to authorizing
      setPaymentProcessing((prev) => ({
        ...prev,
        step: 'authorizing',
        retryCount: prev.retryCount + 1
      }));

      await new Promise((r) => setTimeout(r, 700));

      // 3. Transition to paid
      setPaymentProcessing((prev) => ({
        ...prev,
        step: 'paid',
        isRetrying: false
      }));

      await new Promise((r) => setTimeout(r, 500));

      // 4. Place order atomically with distinct retry order idempotency key
      const orderRetryKey = generateIdempotencyKey('ord_retry');
      await onPlaceOrder({
        cart_id: cartData.cart ? cartData.cart.id : undefined,
        customer_name: address.full_name,
        customer_phone: address.phone,
        customer_email: 'customer@adab.com',
        delivery_address: {
          ...address,
          delivery_slot: deliverySpeed === 'same' ? selectedSlot : null,
          delivery_slot_id: deliverySpeed === 'same' ? selectedSlot?.id : null
        },
        delivery_speed: getBackendDeliverySpeed(),
        payment_method: getBackendPaymentMethod(),
        payment_intent_id: currentIntentId || ('retry_' + Date.now()),
        coupon_code: appliedCouponCode || summary.coupon_code || null,
        idempotency_key: orderRetryKey
      });

      setPaymentProcessing({
        isOpen: false,
        step: 'idle',
        intentId: null,
        error: null,
        failureReason: null,
        isRetrying: false,
        retryCount: 0
      });
    } catch (retryErr) {
      console.error('Payment retry failed:', retryErr);
      setPaymentProcessing((prev) => ({
        ...prev,
        step: 'failed',
        error: retryErr.message || 'Retry attempt was declined.',
        failureReason: 'Retry attempt # ' + (prev.retryCount + 1) + ' failed.',
        isRetrying: false
      }));
    } finally {
      isRetryingRef.current = false;
    }
  };

  // DAY 3 FRONTEND TASK 4: SWITCH METHOD WITHOUT LOSING CART OR ENTERED ADDRESS
  const handleSwitchPaymentMethod = () => {
    const prevError = paymentProcessing.error || 'Previous payment attempt was unsuccessful.';
    setPaymentProcessing({
      isOpen: false,
      step: 'idle',
      intentId: null,
      error: null,
      failureReason: null,
      isRetrying: false,
      retryCount: 0
    });
    setPaymentNotice({
      type: 'warning',
      message: `Your basket and address are safely preserved. ${prevError} Choose another payment method below.`
    });
    const el = document.getElementById('sec-payment-method');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // DAY 3 FRONTEND TASK 4: 1-CLICK FALLBACK TO CASH ON DELIVERY
  const handleFallbackToCOD = () => {
    setPaymentMethod('cod');
    setPaymentNotice({
      type: 'info',
      message: 'Switched to Cash on Delivery. Pay at your doorstep with cash or rider UPI QR.'
    });
    setPaymentProcessing({
      isOpen: false,
      step: 'idle',
      intentId: null,
      error: null,
      failureReason: null,
      isRetrying: false,
      retryCount: 0
    });
    setTimeout(() => {
      handlePlaceOrderSubmit('cod');
    }, 120);
  };

  // DAY 3 FRONTEND TASK 4: GRACEFUL PAYMENT CANCELLATION HANDLER
  const handleCancelPayment = () => {
    setPaymentProcessing((prev) => ({
      ...prev,
      step: 'cancelled',
      error: 'Transaction cancelled by customer.',
      failureReason: 'Payment aborted by user during authorization.'
    }));
  };

  // Resume checkout from cancelled state
  const handleResumeFromCancelled = () => {
    setPaymentProcessing({
      isOpen: false,
      step: 'idle',
      intentId: null,
      error: null,
      failureReason: null,
      isRetrying: false,
      retryCount: 0
    });
    setPaymentNotice({
      type: 'info',
      message: 'Payment was cancelled. Your basket and delivery details are preserved so you can resume whenever ready.'
    });
    const el = document.getElementById('sec-payment-method');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };



  // Helper for label badge styling
  const renderLabelBadge = (label = 'Home') => {
    const l = label.toLowerCase();
    if (l === 'work' || l === 'office') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
          <i className="fa-solid fa-briefcase text-[9px]"></i>
          <span>Work</span>
        </span>
      );
    }
    if (l === 'other') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-700 border border-purple-200 inline-flex items-center gap-1">
          <i className="fa-solid fa-location-dot text-[9px]"></i>
          <span>Other</span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
        <i className="fa-solid fa-house text-[9px]"></i>
        <span>Home</span>
      </span>
    );
  };

  return (
    <div id="sec-checkout" className="space-y-4">
      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-2">
          <i className="fa-solid fa-triangle-exclamation text-base shrink-0"></i>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Delivery Destination Card */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
          <div className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
            <i className="fa-solid fa-location-dot text-brand-coral"></i>
            <span>Delivery Destination</span>
          </div>
          {savedAddresses.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setModalView('list');
                setIsAddressModalOpen(true);
              }}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition"
            >
              <span>Change</span>
              <i className="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenAddAddress}
              className="text-xs font-bold text-brand-green hover:underline cursor-pointer flex items-center gap-1"
            >
              <i className="fa-solid fa-plus text-[10px]"></i>
              <span>Add Address</span>
            </button>
          )}
        </div>

        {/* Loading state skeleton */}
        {loadingAddresses ? (
          <div className="animate-pulse flex items-start gap-3 pt-1">
            <div className="w-10 h-10 rounded-2xl bg-gray-200 shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-3 bg-gray-100 rounded w-3/4"></div>
              <div className="h-3 bg-gray-100 rounded w-1/4"></div>
            </div>
          </div>
        ) : address && address.address_line ? (
          /* Active Address Preview */
          <div
            onClick={() => {
              setModalView('list');
              setIsAddressModalOpen(true);
            }}
            className="flex items-start gap-3 pt-1 cursor-pointer group"
          >
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg shrink-0 transition group-hover:scale-105 ${
                address.label?.toLowerCase() === 'work' || address.label?.toLowerCase() === 'office'
                  ? 'bg-blue-50 text-blue-600'
                  : address.label?.toLowerCase() === 'other'
                  ? 'bg-purple-50 text-purple-600'
                  : 'bg-emerald-50 text-brand-green'
              }`}
            >
              <i
                className={
                  address.label?.toLowerCase() === 'work' || address.label?.toLowerCase() === 'office'
                    ? 'fa-solid fa-briefcase'
                    : address.label?.toLowerCase() === 'other'
                    ? 'fa-solid fa-location-dot'
                    : 'fa-solid fa-house'
                }
              ></i>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm text-gray-900">
                  {address.full_name}
                </span>
                {renderLabelBadge(address.label)}
                {address.is_default && (
                  <span className="text-[9px] font-extrabold bg-gray-900 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Default
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                {address.address_line}
                {address.landmark ? `, Near ${address.landmark}` : ''}, {address.city} {address.pincode}
              </div>
              <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1.5">
                <i className="fa-solid fa-phone text-[10px] text-gray-400"></i>
                <span>{address.phone}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-2">
            <div className="text-xs font-bold text-amber-900">
              No delivery address selected for this order.
            </div>
            <button
              type="button"
              onClick={handleOpenAddAddress}
              className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
            >
              <i className="fa-solid fa-plus text-xs"></i>
              <span>Add Delivery Address</span>
            </button>
          </div>
        )}
      </div>

      {/* Serviceability Status Card (Day 3 Frontend Task 2) */}
      <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {loadingServiceability ? (
              <div className="w-5 h-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
            ) : serviceability?.is_serviceable ? (
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs">
                <i className="fa-solid fa-circle-check"></i>
              </span>
            ) : (
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </span>
            )}
            <div>
              <div className="font-extrabold text-xs text-gray-900 flex items-center gap-1.5">
                <span>Checkout Serviceability</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                  PIN: {address.pincode || '395002'}
                </span>
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                {loadingServiceability ? (
                  'Verifying delivery zone coverage...'
                ) : serviceability?.is_serviceable ? (
                  <span className="text-emerald-700 font-semibold">
                    ✓ Serviceable by {serviceability.store?.name || 'Local Store'} (within {serviceability.store?.radius_km || 10} km)
                  </span>
                ) : (
                  <span className="text-amber-700 font-semibold">
                    ⚠️ Beyond 10 km rider radius. Express &amp; Same-Day delivery unavailable.
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPincodeChecker(!showPincodeChecker)}
            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition"
          >
            {showPincodeChecker ? 'Hide Checker' : 'Check PIN'}
          </button>
        </div>

        {/* Inline Pincode Coverage Inspector */}
        {showPincodeChecker && (
          <div className="pt-2 border-t border-gray-100 mt-2 space-y-2">
            <form onSubmit={handleCheckCustomPincode} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter 6-digit pincode (e.g. 395007, 400001)"
                value={customPincodeInput}
                onChange={(e) => setCustomPincodeInput(e.target.value)}
                maxLength={6}
                className="flex-1 px-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition cursor-pointer"
              >
                Inspect
              </button>
            </form>

            {customPincodeResult && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                  customPincodeResult.is_serviceable
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-amber-50 text-amber-900 border border-amber-200'
                }`}
              >
                <i
                  className={`mt-0.5 text-xs ${
                    customPincodeResult.is_serviceable
                      ? 'fa-solid fa-circle-check text-emerald-600'
                      : 'fa-solid fa-triangle-exclamation text-amber-600'
                  }`}
                ></i>
                <div className="flex-1">
                  <div className="font-extrabold">
                    {customPincodeResult.is_serviceable
                      ? 'Pincode Serviceable!'
                      : 'Limited Serviceability'}
                  </div>
                  <div className="text-[11px] mt-0.5">{customPincodeResult.message}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 1: Choose Delivery Speed (Day 3 Frontend Task 2) */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
        <div className="font-extrabold text-sm text-gray-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">
              1
            </span>
            <span>Choose Delivery Speed</span>
          </div>
          {loadingPreview && (
            <span className="text-[10px] text-gray-400 flex items-center gap-1 font-normal">
              <i className="fa-solid fa-spinner fa-spin text-emerald-600"></i> Calculating fees...
            </span>
          )}
        </div>

        {subtotal >= 499 && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-bold flex items-center gap-1.5">
            <i className="fa-solid fa-gift text-brand-coral"></i>
            <span>🎉 Free Delivery unlocked! Your order is over ₹499.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Fast Express (14–45 min) */}
          <button
            type="button"
            disabled={serviceability && !serviceability.is_serviceable}
            onClick={() => setDeliverySpeed('fast')}
            className={`p-3.5 rounded-2xl text-left flex justify-between items-center transition cursor-pointer relative ${
              serviceability && !serviceability.is_serviceable
                ? 'opacity-50 cursor-not-allowed border border-gray-200 bg-gray-50'
                : deliverySpeed === 'fast'
                ? 'border-2 border-brand-green bg-green-50 shadow-sm'
                : 'border border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div>
              <div className="font-extrabold text-xs text-gray-900 flex items-center">
                <i className="fa-solid fa-bolt text-amber-500 mr-1.5"></i>
                Express (14–45 min)
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                {serviceability && !serviceability.is_serviceable
                  ? 'Unavailable for this pincode'
                  : 'Dispatched instantly by store rider'}
              </div>
            </div>
            <div className="text-right shrink-0">
              {subtotal >= 499 ? (
                <div className="flex items-center gap-1">
                  <span className="line-through text-gray-400 text-[10px]">₹29</span>
                  <span className="font-extrabold text-xs text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                    FREE
                  </span>
                </div>
              ) : (
                <span className="font-extrabold text-xs text-emerald-800">₹29</span>
              )}
            </div>
          </button>

          {/* Same Day (Flexible Slot) */}
          <button
            type="button"
            disabled={serviceability && !serviceability.is_serviceable}
            onClick={() => setDeliverySpeed('same')}
            className={`p-3.5 rounded-2xl text-left flex justify-between items-center transition cursor-pointer ${
              serviceability && !serviceability.is_serviceable
                ? 'opacity-50 cursor-not-allowed border border-gray-200 bg-gray-50'
                : deliverySpeed === 'same'
                ? 'border-2 border-brand-green bg-green-50 shadow-sm'
                : 'border border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div>
              <div className="font-extrabold text-xs text-gray-900 flex items-center">
                <i className="fa-solid fa-clock text-blue-500 mr-1.5"></i>
                Same Day (by 8 PM)
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                {selectedSlot
                  ? `${selectedSlot.date_label} · ${selectedSlot.label}`
                  : 'Flexible scheduled slot'}
              </div>
            </div>
            <div className="text-right shrink-0">
              {subtotal >= 499 ? (
                <div className="flex items-center gap-1">
                  <span className="line-through text-gray-400 text-[10px]">₹19</span>
                  <span className="font-extrabold text-xs text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                    FREE
                  </span>
                </div>
              ) : (
                <span className="font-extrabold text-xs text-gray-700">₹19</span>
              )}
            </div>
          </button>

          {/* Self Pickup */}
          <button
            type="button"
            onClick={() => setDeliverySpeed('pickup')}
            className={`p-3.5 rounded-2xl text-left flex justify-between items-center transition cursor-pointer sm:col-span-2 ${
              deliverySpeed === 'pickup'
                ? 'border-2 border-brand-green bg-green-50 shadow-sm'
                : 'border border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div>
              <div className="font-extrabold text-xs text-gray-900 flex items-center">
                <i className="fa-solid fa-store text-emerald-600 mr-1.5"></i>
                Self Pickup from Shop
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                Ready in 10 mins · Zero queue at counter
              </div>
            </div>
            <span className="font-extrabold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              FREE
            </span>
          </button>
        </div>

        {/* Delivery Slot Inspection & Picker (when Same-Day speed is chosen) */}
        {deliverySpeed === 'same' && (
          <div className="pt-3 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-extrabold text-xs text-gray-900 flex items-center gap-1.5">
                <i className="fa-solid fa-calendar-days text-emerald-700"></i>
                <span>Inspect &amp; Select Delivery Slot</span>
              </div>
              <div className="flex gap-1 bg-gray-100 p-0.5 rounded-xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setSlotDateFilter('today')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    slotDateFilter === 'today'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setSlotDateFilter('tomorrow')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    slotDateFilter === 'tomorrow'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Tomorrow
                </button>
              </div>
            </div>

            {loadingSlots ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="animate-pulse p-3 rounded-2xl bg-gray-100 h-16"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {deliverySlots
                  .filter((s) => (slotDateFilter === 'today' ? s.is_today : s.is_tomorrow))
                  .map((slot) => {
                    const isSelected = selectedSlot && selectedSlot.id === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={!slot.is_available}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-3 rounded-2xl text-left border transition cursor-pointer flex justify-between items-center ${
                          !slot.is_available
                            ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-200'
                            : isSelected
                            ? 'border-2 border-brand-green bg-emerald-50/70 shadow-xs'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div>
                          <div className="font-extrabold text-xs text-gray-900 flex items-center gap-1.5">
                            <span>{slot.label}</span>
                            {isSelected && (
                              <i className="fa-solid fa-circle-check text-emerald-600 text-xs"></i>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-2">
                            <span>{slot.date_label}</span>
                            <span>•</span>
                            <span
                              className={`font-semibold ${
                                slot.is_filling_fast ? 'text-amber-600' : 'text-emerald-700'
                              }`}
                            >
                              {slot.is_filling_fast ? 'Filling Fast' : 'Available'}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </span>
                      </button>
                    );
                  })}
              </div>
            )}

            {selectedSlot && (
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900 flex items-center gap-2">
                <i className="fa-solid fa-truck-fast text-blue-600"></i>
                <span>
                  Confirmed delivery window: <strong>{selectedSlot.date_label} ({selectedSlot.label})</strong>. Dispatch rider assigned at slot start.
                </span>
              </div>
            )}
          </div>
        )}
      </div>


      {/* Step 2: Payment Method */}
      <div id="sec-payment-method" className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
        <div className="font-extrabold text-sm text-gray-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">
              2
            </span>
            Payment Method
          </div>
          <span className="text-[11px] text-purple-700 font-bold">
            <i className="fa-solid fa-shield-halved mr-1"></i> 100% Secure
          </span>
        </div>

        {/* Non-blocking Failure / Cancellation Alert Banner */}
        {paymentNotice && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-start justify-between gap-3 animate-fade-in ${
              paymentNotice.type === 'warning'
                ? 'bg-amber-50 border border-amber-200 text-amber-900'
                : 'bg-blue-50 border border-blue-200 text-blue-900'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <i
                className={`fa-solid ${
                  paymentNotice.type === 'warning'
                    ? 'fa-triangle-exclamation text-amber-600'
                    : 'fa-circle-info text-blue-600'
                } text-base mt-0.5 shrink-0`}
              ></i>
              <div>
                <div className="font-black">
                  {paymentNotice.type === 'warning' ? 'Payment Not Completed' : 'Payment Status'}
                </div>
                <div className="text-[11px] leading-relaxed mt-0.5">
                  {paymentNotice.message}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPaymentNotice(null)}
              className="text-gray-400 hover:text-gray-700 text-xs cursor-pointer p-1"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}

        {/* QA Gateway Simulation Bar (Dev & Test Feature) */}
        <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-gray-700 font-bold">
            <i className="fa-solid fa-flask text-purple-600"></i>
            <span>Payment Simulation:</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-gray-600 hover:text-gray-900">
              <input
                type="checkbox"
                checked={simulateFailure}
                onChange={(e) => {
                  setSimulateFailure(e.target.checked);
                  if (e.target.checked) setSimulateCancellation(false);
                }}
                className="w-3.5 h-3.5 text-red-600 rounded border-gray-300 focus:ring-red-500"
              />
              <span className="font-bold text-red-700">Simulate Failure</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-gray-600 hover:text-gray-900">
              <input
                type="checkbox"
                checked={simulateCancellation}
                onChange={(e) => {
                  setSimulateCancellation(e.target.checked);
                  if (e.target.checked) setSimulateFailure(false);
                }}
                className="w-3.5 h-3.5 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
              />
              <span className="font-bold text-amber-700">Simulate Cancel</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* UPI */}
          <button
            type="button"
            onClick={() => setPaymentMethod('upi')}
            className={`p-3.5 rounded-2xl font-bold text-xs text-left transition flex items-center gap-3 cursor-pointer ${
              paymentMethod === 'upi'
                ? 'border-2 border-brand-green bg-green-50 shadow-sm'
                : 'border border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg shrink-0">
              <i className="fa-solid fa-mobile-screen"></i>
            </div>
            <div>
              <div className="text-gray-900 font-extrabold">UPI Instant</div>
              <div className="text-[10px] text-gray-500 font-normal">GPay / PhonePe / Paytm</div>
            </div>
          </button>

          {/* Cards */}
          <button
            type="button"
            onClick={() => setPaymentMethod('card')}
            className={`p-3.5 rounded-2xl font-bold text-xs text-left transition flex items-center gap-3 cursor-pointer ${
              paymentMethod === 'card'
                ? 'border-2 border-brand-green bg-green-50 shadow-sm'
                : 'border border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-lg shrink-0">
              <i className="fa-solid fa-credit-card"></i>
            </div>
            <div>
              <div className="text-gray-900 font-extrabold">Credit / Debit Card</div>
              <div className="text-[10px] text-gray-500 font-normal">Visa, Mastercard, RuPay</div>
            </div>
          </button>

          {/* ADAB Pay Later */}
          <button
            type="button"
            onClick={() => setPaymentMethod('bnpl')}
            className={`p-3.5 rounded-2xl font-bold text-xs text-left transition flex items-center gap-3 cursor-pointer ${
              paymentMethod === 'bnpl'
                ? 'border-2 border-brand-green bg-green-50 shadow-sm'
                : 'border border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-lg shrink-0">
              <i className="fa-solid fa-calendar-check"></i>
            </div>
            <div>
              <div className="text-gray-900 font-extrabold">ADAB Pay Later</div>
              <div className="text-[10px] text-purple-700 font-normal">0% Interest · 14 Days</div>
            </div>
          </button>

          {/* Cash on Delivery */}
          <button
            type="button"
            onClick={() => setPaymentMethod('cod')}
            className={`p-3.5 rounded-2xl font-bold text-xs text-left transition flex items-center gap-3 cursor-pointer ${
              paymentMethod === 'cod'
                ? 'border-2 border-brand-green bg-green-50 shadow-sm'
                : 'border border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg shrink-0">
              <i className="fa-solid fa-money-bill-wave"></i>
            </div>
            <div>
              <div className="text-gray-900 font-extrabold">Cash on Delivery</div>
              <div className="text-[10px] text-gray-500 font-normal">Pay rider at door</div>
            </div>
          </button>
        </div>

        {/* --- EXPANDED PAYMENT METHOD SUB-PANELS (Day 3 Frontend Task 3) --- */}

        {/* 1. UPI Details Sub-panel */}
        {paymentMethod === 'upi' && (
          <div className="pt-3 border-t border-gray-100 space-y-3 animate-fade-in">
            {/* Sub-method tabs */}
            <div className="flex bg-gray-100 p-1 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setUpiSubMethod('apps')}
                className={`flex-1 py-1.5 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  upiSubMethod === 'apps' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <i className="fa-solid fa-mobile-screen-button text-[11px]"></i>
                <span>UPI Apps</span>
              </button>
              <button
                type="button"
                onClick={() => setUpiSubMethod('vpa')}
                className={`flex-1 py-1.5 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  upiSubMethod === 'vpa' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <i className="fa-solid fa-at text-[11px]"></i>
                <span>UPI ID / VPA</span>
              </button>
              <button
                type="button"
                onClick={() => setUpiSubMethod('qr')}
                className={`flex-1 py-1.5 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  upiSubMethod === 'qr' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <i className="fa-solid fa-qrcode text-[11px]"></i>
                <span>Scan &amp; Pay QR</span>
              </button>
            </div>

            {/* Sub-tab 1: UPI Apps */}
            {upiSubMethod === 'apps' && (
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold text-gray-500">Select preferred UPI app for instant approval:</div>
                <div className="grid grid-cols-3 gap-2">
                  {/* GPay */}
                  <div
                    onClick={() => setUpiApp('gpay')}
                    className={`p-3 rounded-2xl border text-center cursor-pointer transition flex flex-col items-center gap-1.5 ${
                      upiApp === 'gpay'
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-600'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-white shadow-xs border border-gray-100 flex items-center justify-center font-black text-sm">
                      <span className="tracking-tight"><span className="text-blue-500">G</span><span className="text-red-500">P</span><span className="text-yellow-500">a</span><span className="text-green-500">y</span></span>
                    </div>
                    <span className="text-xs font-extrabold text-gray-900">Google Pay</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 font-bold">Fast</span>
                  </div>

                  {/* PhonePe */}
                  <div
                    onClick={() => setUpiApp('phonepe')}
                    className={`p-3 rounded-2xl border text-center cursor-pointer transition flex flex-col items-center gap-1.5 ${
                      upiApp === 'phonepe'
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-600'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#5f259f] text-white shadow-xs flex items-center justify-center font-black text-xs">
                      Pe
                    </div>
                    <span className="text-xs font-extrabold text-gray-900">PhonePe</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 font-bold">Instant</span>
                  </div>

                  {/* Paytm */}
                  <div
                    onClick={() => setUpiApp('paytm')}
                    className={`p-3 rounded-2xl border text-center cursor-pointer transition flex flex-col items-center gap-1.5 ${
                      upiApp === 'paytm'
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-600'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#002e6e] text-[#00baf2] shadow-xs flex items-center justify-center font-black text-xs">
                      Paytm
                    </div>
                    <span className="text-xs font-extrabold text-gray-900">Paytm UPI</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-100 text-cyan-800 font-bold">Direct</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-[11px] text-gray-600 flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-600 shrink-0"></i>
                  <span>UPI request will be dispatched directly to your mobile app for secure PIN authorization.</span>
                </div>
              </div>
            )}

            {/* Sub-tab 2: UPI VPA */}
            {upiSubMethod === 'vpa' && (
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold text-gray-600 block">Enter your Virtual Payment Address (VPA)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={upiVpa}
                      onChange={(e) => {
                        setUpiVpa(e.target.value);
                        setVpaVerified(false);
                      }}
                      placeholder="e.g. mobile@okhdfcbank"
                      className="w-full pl-3.5 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                    />
                    {vpaVerified && (
                      <span className="absolute right-2.5 top-2.5 text-emerald-600 text-xs">
                        <i className="fa-solid fa-circle-check"></i>
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (upiVpa.includes('@')) {
                        setVpaVerified(true);
                      } else {
                        setErrorMessage('Please include a valid handle (e.g. @upi) in your VPA.');
                      }
                    }}
                    className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-xl transition cursor-pointer border border-emerald-200"
                  >
                    {vpaVerified ? 'Verified ✓' : 'Verify'}
                  </button>
                </div>

                {/* Quick Suffix Badges */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-gray-400 font-medium mr-1">Quick handle:</span>
                  {['@okhdfcbank', '@okicici', '@okaxis', '@paytm', '@ybl', '@upi'].map((suffix) => (
                    <button
                      key={suffix}
                      type="button"
                      onClick={() => {
                        const prefix = upiVpa.split('@')[0] || 'customer';
                        setUpiVpa(`${prefix}${suffix}`);
                        setVpaVerified(true);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 font-bold border border-gray-200 transition cursor-pointer"
                    >
                      {suffix}
                    </button>
                  ))}
                </div>

                {vpaVerified && (
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2">
                    <i className="fa-solid fa-shield-check text-emerald-600"></i>
                    <span>Verified Customer VPA linked to HDFC Bank Ltd.</span>
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 3: QR Code */}
            {upiSubMethod === 'qr' && (
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center space-y-3">
                <div className="inline-block p-3 bg-white rounded-2xl shadow-sm border border-gray-200 relative group">
                  <div className="w-36 h-36 mx-auto relative flex items-center justify-center bg-gray-900 rounded-xl overflow-hidden p-2">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current">
                      <path d="M0,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z" />
                      <path d="M70,0 h30 v30 h-30 z M80,10 h10 v10 h-10 z" />
                      <path d="M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z" />
                      <rect x="35" y="5" width="8" height="8" />
                      <rect x="50" y="5" width="12" height="6" />
                      <rect x="35" y="20" width="10" height="15" />
                      <rect x="52" y="22" width="12" height="8" />
                      <rect x="5" y="38" width="18" height="8" />
                      <rect x="28" y="42" width="8" height="18" />
                      <rect x="42" y="42" width="16" height="16" fill="#10b981" />
                      <rect x="64" y="38" width="12" height="10" />
                      <rect x="80" y="42" width="15" height="16" />
                      <rect x="38" y="65" width="24" height="8" />
                      <rect x="70" y="68" width="25" height="10" />
                      <rect x="38" y="80" width="12" height="15" />
                      <rect x="56" y="80" width="14" height="15" />
                      <rect x="75" y="84" width="20" height="11" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shadow-lg border-2 border-white">
                        ADAB
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-black text-gray-900">
                    Scan &amp; Pay <span className="text-emerald-700">₹{totalPayable}</span>
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Scan using Google Pay, PhonePe, Paytm, BHIM, or any UPI banking app.
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-800">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>Dynamic QR expires in 09:59 minutes</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Card Details Sub-panel */}
        {paymentMethod === 'card' && (
          <div className="pt-3 border-t border-gray-100 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-gray-800">
                Saved Cards ({savedCards.length})
              </span>
              <button
                type="button"
                onClick={() => setShowAddCardForm(!showAddCardForm)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer flex items-center gap-1"
              >
                <i className={`fa-solid ${showAddCardForm ? 'fa-minus' : 'fa-plus'} text-[10px]`}></i>
                <span>{showAddCardForm ? 'Show Saved Cards' : 'Add New Card'}</span>
              </button>
            </div>

            {/* Saved Cards List */}
            {!showAddCardForm && (
              <div className="space-y-2">
                {loadingCards ? (
                  <div className="p-4 text-center text-xs text-gray-400">
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i> Loading saved cards...
                  </div>
                ) : savedCards.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-gray-50 text-center text-xs text-gray-500">
                    No saved cards found. Click "Add New Card" below.
                  </div>
                ) : (
                  savedCards.map((card) => {
                    const isSelected = selectedCardId === card.id;
                    const isVisa = (card.provider || '').toLowerCase().includes('visa') || card.last4 === '4242';
                    return (
                      <div
                        key={card.id}
                        onClick={() => setSelectedCardId(card.id)}
                        className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-2 border-emerald-600 bg-emerald-50/50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-7 rounded-lg bg-gray-900 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                            {isVisa ? (
                              <span className="text-white italic tracking-wider font-serif">VISA</span>
                            ) : (
                              <span className="text-amber-400 text-[10px]">MC</span>
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-black text-gray-900 flex items-center gap-2">
                              <span>{card.provider || 'Bank Card'}</span>
                              <span className="text-gray-500 font-mono text-[11px]">•••• {card.last4}</span>
                              {card.is_default && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              Expires {String(card.expiry_month).padStart(2, '0')}/{card.expiry_year}
                            </div>
                          </div>
                        </div>

                        {isSelected ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-gray-500">CVV</span>
                            <input
                              type="password"
                              maxLength={4}
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value)}
                              placeholder="•••"
                              className="w-14 px-2 py-1 bg-white border border-gray-300 rounded-lg text-center text-xs font-mono tracking-widest focus:border-emerald-600 focus:outline-none"
                            />
                          </div>
                        ) : (
                          <span className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center">
                            <span className="w-2.5 h-2.5 rounded-full bg-transparent"></span>
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Add New Card Form */}
            {showAddCardForm && (
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-900">New Card Information</span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCardData({
                        number: '4242 4242 4242 4242',
                        name: 'Pooja Sharma',
                        expiry: '12/28',
                        cvv: '123',
                        save_card: true
                      });
                    }}
                    className="text-[10px] px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold transition cursor-pointer"
                  >
                    Auto-fill Test Card
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Card Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={19}
                      value={newCardData.number}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
                        setNewCardData({ ...newCardData, number: val });
                      }}
                      placeholder="4242 •••• •••• 4242"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-mono focus:border-emerald-600 focus:outline-none"
                    />
                    <div className="absolute right-3 top-2.5 text-gray-400 text-sm">
                      <i className="fa-solid fa-credit-card"></i>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    value={newCardData.name}
                    onChange={(e) => setNewCardData({ ...newCardData, name: e.target.value })}
                    placeholder="Name on card"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">Valid Thru (MM/YY)</label>
                    <input
                      type="text"
                      maxLength={5}
                      value={newCardData.expiry}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2, 4);
                        setNewCardData({ ...newCardData, expiry: val });
                      }}
                      placeholder="MM/YY"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono text-center focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">CVV / CVC</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={newCardData.cvv}
                      onChange={(e) => setNewCardData({ ...newCardData, cvv: e.target.value })}
                      placeholder="123"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono text-center focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={newCardData.save_card}
                    onChange={(e) => setNewCardData({ ...newCardData, save_card: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] text-gray-700 font-medium">
                    Save this card securely for future purchases (PCI-DSS tokenized)
                  </span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* 3. ADAB Pay Later & Wallet Sub-panel */}
        {paymentMethod === 'bnpl' && (
          <div className="pt-3 border-t border-gray-100 space-y-3 animate-fade-in">
            {/* BNPL Credit Line Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50 via-fuchsia-50/40 to-pink-50 border border-purple-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-700 text-white flex items-center justify-center text-xs font-bold">
                    0%
                  </div>
                  <div>
                    <div className="text-xs font-black text-purple-950">ADAB Pay Later Credit Line</div>
                    <div className="text-[10px] text-purple-700 font-bold">Pre-approved · No Interest for 14 Days</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-purple-900">
                    ₹{Number(walletData?.bnpl_available || 8450).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[9px] text-purple-600 font-medium">
                    of ₹{Number(walletData?.bnpl_limit || 10000).toLocaleString('en-IN')} limit
                  </div>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white/80 border border-purple-100 text-[10px] text-purple-900 space-y-1">
                <div className="flex items-center gap-1.5">
                  <i className="fa-solid fa-check text-purple-700"></i>
                  <span>Pay anytime on or before the 24th of this month with 0% interest charges.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <i className="fa-solid fa-check text-purple-700"></i>
                  <span>Instant one-tap approval with zero collateral or paper KYC required.</span>
                </div>
              </div>
            </div>

            {/* Digital Wallet Card */}
            <div className="p-3.5 rounded-2xl bg-white border border-gray-200 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-base shrink-0">
                  <i className="fa-solid fa-wallet"></i>
                </div>
                <div>
                  <div className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                    <span>ADAB Digital Wallet</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 font-extrabold">
                      ₹{Number(walletData?.balance || 500).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {useWalletBalance
                      ? `Applied ₹${walletDeduction.toFixed(2)} balance to this order`
                      : 'Use available cashback balance towards this purchase'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setUseWalletBalance(!useWalletBalance)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer shrink-0 ${
                  useWalletBalance
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {useWalletBalance ? 'Applied ✓' : 'Apply'}
              </button>
            </div>
          </div>
        )}

        {/* 4. Cash on Delivery Sub-panel */}
        {paymentMethod === 'cod' && (
          <div className="pt-3 border-t border-gray-100 space-y-2 animate-fade-in">
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-950 text-xs space-y-1.5">
              <div className="font-extrabold flex items-center gap-2 text-amber-900">
                <i className="fa-solid fa-hand-holding-dollar text-base"></i>
                <span>Pay ₹{totalPayable} at Your Doorstep</span>
              </div>
              <div className="text-[11px] text-amber-800 leading-relaxed">
                Our verified delivery partner will collect the exact amount. You can pay via <strong>Cash</strong> or scan the rider's <strong>Doorstep UPI QR</strong> code upon delivery.
              </div>
              <div className="pt-1 flex items-center gap-2 text-[10px] text-amber-700 font-bold">
                <span className="px-1.5 py-0.5 rounded-md bg-white border border-amber-200">
                  <i className="fa-solid fa-shield-halved mr-1 text-emerald-600"></i> Zero Handling Fee
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-white border border-amber-200">
                  <i className="fa-solid fa-receipt mr-1 text-blue-600"></i> Instant Digital Receipt
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 3: Order Review & Final Bill */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
        <div className="font-extrabold text-sm text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
          <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">
            3
          </span>
          Review Items &amp; Total
        </div>

        {/* Final Items List */}
        <div className="space-y-2 text-xs divide-y divide-gray-50 max-h-48 overflow-y-auto hide-scroll">
          {items.map((it) => (
            <div key={it.cart_item_id || it.id} className="flex justify-between items-center py-2 text-xs">
              <div className="min-w-0 pr-2">
                <div className="font-extrabold text-gray-900 truncate">
                  {it.product_name || it.name}
                </div>
                <div className="text-[10px] text-gray-500">
                  {it.store_name || it.store || 'Store'} · Qty: {it.quantity} × ₹{it.sell_price || it.price}
                </div>
              </div>
              <span className="font-extrabold text-gray-900 shrink-0">
                ₹{Number(it.sell_price || it.price) * Number(it.quantity)}
              </span>
            </div>
          ))}
        </div>

        {/* Breakdown Rows */}
        <div className="pt-2 space-y-1.5 text-xs text-gray-600 border-t border-gray-100">
          <div className="bill-row">
            <span>Items Subtotal</span>
            <span className="font-bold text-gray-900">₹{subtotal}</span>
          </div>
          <div className="bill-row">
            <span className="flex items-center gap-1.5">
              <span>
                Delivery Fee ({deliverySpeed === 'fast' ? 'Express 14–45m' : deliverySpeed === 'same' ? 'Same-Day Van' : 'Store Pickup'})
              </span>
              {fee === 0 && deliverySpeed !== 'pickup' && (
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md font-bold">
                  ₹499+ Free
                </span>
              )}
            </span>
            <span className="font-bold text-gray-900">
              {fee === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : `₹${fee}`}
            </span>
          </div>
          {deliverySpeed === 'same' && selectedSlot && (
            <div className="bill-row text-[11px] text-blue-800 bg-blue-50/60 p-1.5 rounded-lg">
              <span className="flex items-center gap-1">
                <i className="fa-solid fa-clock text-blue-600"></i>
                <span>Scheduled Slot Window</span>
              </span>
              <span className="font-extrabold text-blue-900">
                {selectedSlot.date_label} ({selectedSlot.label})
              </span>
            </div>
          )}
          {discount > 0 && (
            <div className="bill-row text-emerald-700 font-medium">
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-tag text-xs text-emerald-600"></i>
                <span>Coupon Savings {appliedCouponCode ? `(${appliedCouponCode})` : ''}</span>
              </span>
              <span className="font-bold">-₹{discount}</span>
            </div>
          )}
          {walletDeduction > 0 && (
            <div className="bill-row text-purple-700 bg-purple-50/70 p-1.5 rounded-lg">
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-wallet text-purple-600"></i>
                <span>ADAB Wallet Balance Applied</span>
              </span>
              <span className="font-extrabold">-₹{walletDeduction.toFixed(2)}</span>
            </div>
          )}
          <div className="bill-row border-t border-dashed pt-2.5">
            <span className="font-black text-gray-900 text-sm">Total Payable</span>
            <span className="font-black text-emerald-800 text-lg">₹{totalPayable}</span>
          </div>
        </div>

        {/* Reward Points Banner */}
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
          <i className="fa-solid fa-star text-amber-500"></i>
          <span>
            You will earn <strong className="font-bold">{pointsEarned}</strong> ADAB reward points on this order!
          </span>
        </div>
      </div>

      {/* Action Buttons with Double-Click Guard (Day 3 Frontend Task 5) */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => handlePlaceOrderSubmit()}
          disabled={loading || items.length === 0 || isSubmittingRef.current || paymentProcessing.isOpen}
          className="green-btn text-base font-extrabold py-4 shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading || paymentProcessing.isOpen ? (
            <>
              <i className="fa-solid fa-spinner fa-spin"></i>
              <span>Processing Order...</span>
            </>
          ) : (
            <>
              <i className="fa-solid fa-lock"></i>
              <span>Place Order · Pay ₹{totalPayable}</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onBackToCart}
          className="w-full text-center text-xs font-bold text-gray-500 hover:text-gray-800 py-2 cursor-pointer"
        >
          ← Return to Basket
        </button>
      </div>

      {/* Address Selector Drawer / Modal */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        selectedAddressId={selectedAddressId}
        onSelectAddress={selectAddress}
      />

      {paymentProcessing.isOpen && (typeof document !== 'undefined' ? createPortal(
        <div
          id="paymentProcessingModal"
          className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 animate-fade-in"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 99999,
            backgroundColor: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)'
          }}
        >
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 text-center space-y-5 animate-scale-up border border-gray-100 overflow-hidden">
            {/* Top Security & Method Badge */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 text-[11px]">
              <span className="font-extrabold text-emerald-800 flex items-center gap-1.5">
                <i className="fa-solid fa-lock text-xs"></i>
                <span>256-Bit SSL Encrypted</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-extrabold uppercase text-[10px]">
                {getBackendPaymentMethod()}
              </span>
            </div>

            {/* --- STATE 1, 2, 3: INITIATING / AUTHORIZING / PAID --- */}
            {paymentProcessing.step !== 'failed' && paymentProcessing.step !== 'cancelled' && (
              <div className="space-y-4">
                {/* Visual Animated Center */}
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  {paymentProcessing.step === 'paid' ? (
                    <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center text-4xl shadow-lg shadow-emerald-200 animate-scale-up">
                      <i className="fa-solid fa-check"></i>
                    </div>
                  ) : (
                    <>
                      <div className="absolute inset-0 rounded-full border-4 border-emerald-100 animate-ping opacity-25"></div>
                      <div className="w-18 h-18 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin flex items-center justify-center"></div>
                      <div className="absolute inset-0 flex items-center justify-center text-emerald-700 text-2xl">
                        {paymentProcessing.step === 'initiating' ? (
                          <i className="fa-solid fa-bolt"></i>
                        ) : (
                          <i className="fa-solid fa-shield-halved animate-pulse"></i>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Status Heading & Subtext */}
                <div className="space-y-1">
                  <h3 className="font-black text-lg text-gray-900 leading-tight">
                    {paymentProcessing.step === 'initiating' && 'Initiating Secure Payment...'}
                    {paymentProcessing.step === 'authorizing' && 'Authorizing with Gateway...'}
                    {paymentProcessing.step === 'paid' && 'Payment Authorized Successfully!'}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {paymentProcessing.step === 'initiating' && 'Allocating intent session & creating security token'}
                    {paymentProcessing.step === 'authorizing' &&
                      `Validating payment for ₹${totalPayable} with bank provider`}
                    {paymentProcessing.step === 'paid' &&
                      'Finalizing order & committing multi-seller inventory split'}
                  </p>
                </div>

                {/* Animated 3-Step Timeline (Initiating -> Authorizing -> Paid) */}
                <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2.5 text-left text-xs">
                  {/* Step 1: Initiating */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {paymentProcessing.step === 'initiating' ? (
                        <i className="fa-solid fa-spinner fa-spin text-emerald-600"></i>
                      ) : (
                        <i className="fa-solid fa-circle-check text-emerald-600"></i>
                      )}
                      <span
                        className={
                          paymentProcessing.step === 'initiating'
                            ? 'font-black text-gray-900'
                            : 'text-gray-600 font-semibold'
                        }
                      >
                        1. Payment Intent Initiation
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {paymentProcessing.intentId
                        ? `#${paymentProcessing.intentId.slice(0, 10)}...`
                        : 'Creating...'}
                    </span>
                  </div>

                  {/* Step 2: Authorizing */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {paymentProcessing.step === 'initiating' ? (
                        <i className="fa-regular fa-circle text-gray-300"></i>
                      ) : paymentProcessing.step === 'authorizing' ? (
                        <i className="fa-solid fa-spinner fa-spin text-emerald-600"></i>
                      ) : (
                        <i className="fa-solid fa-circle-check text-emerald-600"></i>
                      )}
                      <span
                        className={
                          paymentProcessing.step === 'authorizing'
                            ? 'font-black text-gray-900'
                            : 'text-gray-600 font-semibold'
                        }
                      >
                        2. Bank / Gateway Authorization
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {paymentProcessing.step === 'initiating'
                        ? 'Pending'
                        : paymentProcessing.step === 'authorizing'
                        ? 'Validating'
                        : 'Approved ✓'}
                    </span>
                  </div>

                  {/* Step 3: Paid */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {paymentProcessing.step === 'paid' ? (
                        <i className="fa-solid fa-circle-check text-emerald-600"></i>
                      ) : (
                        <i className="fa-regular fa-circle text-gray-300"></i>
                      )}
                      <span
                        className={
                          paymentProcessing.step === 'paid'
                            ? 'font-black text-emerald-800'
                            : 'text-gray-400 font-medium'
                        }
                      >
                        3. Order Confirmed &amp; Paid
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {paymentProcessing.step === 'paid' ? 'Completed ✓' : 'Awaiting'}
                    </span>
                  </div>
                </div>

                {/* Graceful Cancel Option during Authorizing */}
                {paymentProcessing.step === 'authorizing' && (
                  <button
                    type="button"
                    onClick={handleCancelPayment}
                    className="text-xs font-bold text-gray-400 hover:text-red-600 cursor-pointer transition pt-1"
                  >
                    <i className="fa-solid fa-xmark mr-1"></i> Cancel Payment
                  </button>
                )}
              </div>
            )}

            {/* --- STATE 4: PAYMENT FAILURE & RETRY OPTIONS --- */}
            {paymentProcessing.step === 'failed' && (
              <div className="space-y-4 animate-fade-in">
                {/* Warning Icon */}
                <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-3xl mx-auto shadow-sm">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                </div>

                <div className="space-y-1">
                  <h3 className="font-black text-lg text-gray-900">Payment Authorization Failed</h3>
                  <p className="text-xs text-red-700 font-medium bg-red-50 p-2.5 rounded-xl border border-red-200">
                    {paymentProcessing.error || 'Your bank or card issuer declined the transaction.'}
                  </p>
                </div>

                {/* Preserved State Notice */}
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] text-gray-600 text-left space-y-1">
                  <div className="font-extrabold text-gray-900 flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-check text-emerald-600"></i>
                    <span>Your cart and delivery address are 100% saved!</span>
                  </div>
                  <div>No amount was deducted. You can retry with this method or switch to another option.</div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-1">
                  {/* Option 1: Retry Payment */}
                  <button
                    type="button"
                    disabled={paymentProcessing.isRetrying}
                    onClick={handleRetryPayment}
                    className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:bg-gray-400"
                  >
                    {paymentProcessing.isRetrying ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        <span>Retrying Payment ({paymentProcessing.retryCount + 1})...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-rotate-right"></i>
                        <span>
                          Retry Payment ({getBackendPaymentMethod()})
                          {paymentProcessing.retryCount > 0 ? ` · Try #${paymentProcessing.retryCount + 1}` : ''}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Option 2: 1-Click Fallback to Cash on Delivery */}
                  {paymentMethod !== 'cod' && (
                    <button
                      type="button"
                      onClick={handleFallbackToCOD}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-amber-950 font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <i className="fa-solid fa-money-bill-wave"></i>
                      <span>Pay via Cash on Delivery Instead (Zero Hassle)</span>
                    </button>
                  )}

                  {/* Option 3: Switch Payment Method */}
                  <button
                    type="button"
                    onClick={handleSwitchPaymentMethod}
                    className="w-full py-2.5 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-100 transition cursor-pointer"
                  >
                    Switch to Another Payment Method
                  </button>
                </div>
              </div>
            )}

            {/* --- STATE 5: PAYMENT CANCELLED GRACEFULLY --- */}
            {paymentProcessing.step === 'cancelled' && (
              <div className="space-y-4 animate-fade-in">
                {/* Cancellation Icon */}
                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-3xl mx-auto shadow-sm">
                  <i className="fa-solid fa-ban"></i>
                </div>

                <div className="space-y-1">
                  <h3 className="font-black text-lg text-gray-900">Payment Cancelled</h3>
                  <p className="text-xs text-gray-500 font-medium">
                    You chose to cancel the payment authorization. No money was deducted from your account.
                  </p>
                </div>

                {/* Assurance Card */}
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-[11px] text-emerald-900 text-left flex items-start gap-2">
                  <i className="fa-solid fa-shield-halved text-emerald-600 text-sm mt-0.5 shrink-0"></i>
                  <div>
                    <span className="font-extrabold">All items and delivery address preserved:</span>
                    <div className="text-emerald-800 text-[10px] mt-0.5">
                      Your basket is ready and your slot is held. You can complete payment at any time.
                    </div>
                  </div>
                </div>

                {/* Cancellation Actions */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleRetryPayment}
                    className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <i className="fa-solid fa-play"></i>
                    <span>Resume &amp; Try Payment Again</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResumeFromCancelled}
                    className="w-full py-2.5 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-100 transition cursor-pointer"
                  >
                    Change Payment Method
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentProcessing({
                        isOpen: false,
                        step: 'idle',
                        intentId: null,
                        error: null,
                        failureReason: null,
                        isRetrying: false,
                        retryCount: 0
                      });
                      onBackToCart();
                    }}
                    className="w-full text-center text-xs text-gray-400 hover:text-gray-700 py-1 cursor-pointer font-semibold"
                  >
                    ← Return to Basket
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      ) : null)}
    </div>
  );
}
