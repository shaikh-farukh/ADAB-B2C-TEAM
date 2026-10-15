import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import AddressModal from './AddressModal';
import { CustomerAPI, CheckoutAPI, PaymentAPI, RewardAPI, generateIdempotencyKey } from '../services/api';
import { openRazorpayCheckout } from '../utils/razorpay';

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
  onSelectDeliveryAddress = null,
  currentUser = null,
  pointsBalance = null,
  onPointsRedeemed = null
}) {
  const [deliverySpeed, setDeliverySpeed] = useState('fast'); // 'fast', 'same', 'pickup'
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' (Pay Online) | 'cod'
  const [selectedOnlineChannel, setSelectedOnlineChannel] = useState('card'); // 'card' | 'netbanking' | 'wallet' | 'upi'
  
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
    latitude: 21.170240,
    longitude: 72.831062,
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
    latitude: 21.170240,
    longitude: 72.831062,
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

  // Payment Method Detail States
  const [savedCards, setSavedCards] = useState([]);

  // UPI Sub-options (GPay, PhonePe, Paytm, VPA, QR)
  const [upiSubMethod, setUpiSubMethod] = useState('apps'); // 'apps' | 'vpa' | 'qr'
  const [upiApp, setUpiApp] = useState('gpay'); // 'gpay' | 'phonepe' | 'paytm'
  const [upiVpa, setUpiVpa] = useState('pooja@okhdfcbank');
  const [vpaVerified, setVpaVerified] = useState(true);

  // ADAB 0% Pay Later & Digital Wallet states
  const [walletData, setWalletData] = useState({ balance: 0, bnpl_limit: 0, bnpl_available: 0 });
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [useWalletBalance, setUseWalletBalance] = useState(false);

  // Reward Points & Loyalty Deduction States (Day 6 Frontend Task 5)
  const [rewardsAccount, setRewardsAccount] = useState({
    points_balance: typeof pointsBalance === 'number' ? pointsBalance : 0,
    lifetime_earned: 0,
    tier: 'BRONZE'
  });
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [useRewardPoints, setUseRewardPoints] = useState(false);
  const [appliedRewardPoints, setAppliedRewardPoints] = useState(0);

  // Authoritative Customer Account Profile (name & phone stored in account)
  const [accountProfile, setAccountProfile] = useState(null);

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
        try {
          const userStr = localStorage.getItem('adab_user');
          if (userStr) {
            const u = JSON.parse(userStr);
            const name = u?.name || u?.full_name || '';
            const phone = u?.phone || '';
            setAddress(prev => ({
              ...prev,
              full_name: prev.full_name || name,
              phone: prev.phone || phone
            }));
            setAddressForm(prev => ({
              ...prev,
              recipient_name: prev.recipient_name || name,
              phone: prev.phone || phone
            }));
          }
        } catch {}
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

  // Load saved payment methods, customer wallet, and rewards account from DB
  const fetchPaymentMethodsAndWallet = async () => {
    try {
      setLoadingWallet(true);
      setLoadingRewards(true);
      const [cardsRes, walletRes, rewardsRes, profileRes] = await Promise.all([
        CustomerAPI.getPaymentMethods().catch(() => ({ data: [] })),
        CustomerAPI.getWallet().catch(() => ({ data: { balance: 0, bnpl_limit: 0, bnpl_available: 0 } })),
        RewardAPI.getRewardsSummary().catch(() => ({ data: { points_balance: typeof pointsBalance === 'number' ? pointsBalance : 0, tier: 'BRONZE' } })),
        CustomerAPI.getProfile().catch(() => null)
      ]);

      if (cardsRes?.data && Array.isArray(cardsRes.data)) {
        setSavedCards(cardsRes.data);
      }
      if (walletRes?.data) {
        setWalletData(walletRes.data);
      }
      if (rewardsRes?.data) {
        setRewardsAccount(rewardsRes.data);
      }
      if (profileRes?.data) {
        setAccountProfile(profileRes.data);
      }
    } catch (err) {
      console.warn('Could not load payment methods / wallet / rewards:', err.message);
    } finally {
      setLoadingWallet(false);
      setLoadingRewards(false);
    }
  };

  // Sync external points prop if it changes
  useEffect(() => {
    if (typeof pointsBalance === 'number') {
      setRewardsAccount((prev) => ({ ...prev, points_balance: pointsBalance }));
    }
  }, [pointsBalance]);

  // Map internal speeds to backend DB constraints
  const getBackendDeliverySpeed = (speed = deliverySpeed) => {
    if (speed === 'same') return 'SAME_DAY';
    if (speed === 'pickup') return 'STORE_PICKUP';
    return 'EXPRESS_30M';
  };

  // Map internal payment methods to backend DB constraints
  const getBackendPaymentMethod = (method = paymentMethod, channel = selectedOnlineChannel) => {
    if (method === 'cod') return 'CASH_ON_DELIVERY';
    if (channel === 'netbanking') return 'NET_BANKING';
    if (channel === 'wallet') return 'WALLET';
    if (channel === 'upi') return 'UPI';
    return 'CARD';
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
    if (selectedDeliveryAddress && (selectedDeliveryAddress.id || selectedDeliveryAddress.address_line || selectedDeliveryAddress.address)) {
      selectAddress(selectedDeliveryAddress);
    }
  }, [selectedDeliveryAddress?.id, selectedDeliveryAddress?.address_line, selectedDeliveryAddress?.address]);

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
      latitude: addr.latitude !== undefined && addr.latitude !== null && !isNaN(Number(addr.latitude))
        ? Number(addr.latitude)
        : (addr.lat !== undefined && !isNaN(Number(addr.lat)) ? Number(addr.lat) : 21.170240),
      longitude: addr.longitude !== undefined && addr.longitude !== null && !isNaN(Number(addr.longitude))
        ? Number(addr.longitude)
        : (addr.lng !== undefined && !isNaN(Number(addr.lng)) ? Number(addr.lng) : 72.831062),
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

  // Available Reward Points & eligible deduction calculation (Day 6 Frontend Task 5)
  const availablePoints = Math.max(0, Number(rewardsAccount?.points_balance || 0));
  // 1 point = ₹1 off · Max 50% per order rule (matching PointsView & demo)
  const maxEligiblePoints = Math.min(availablePoints, Math.floor(rawTotalPayable * 0.5));

  const effectivePointsToRedeem = useRewardPoints
    ? Math.min(
        appliedRewardPoints > 0 ? appliedRewardPoints : maxEligiblePoints,
        maxEligiblePoints,
        rawTotalPayable
      )
    : 0;

  const rewardPointsDeduction = effectivePointsToRedeem * 1; // 1 point = ₹1 direct reduction
  const payableAfterPoints = Math.max(0, rawTotalPayable - rewardPointsDeduction);

  // Digital Wallet balance deduction calculation
  const walletAvailable = Number(walletData?.balance || 0);
  const walletDeduction = useWalletBalance ? Math.min(walletAvailable, payableAfterPoints) : 0;
  const totalPayable = Math.max(0, payableAfterPoints - walletDeduction);

  const pointsEarned = Math.floor(totalPayable / 100);

  // Comprehensive Payment Intent Initiation & Order Submission Flow (Day 3 Frontend Task 3 & Task 5)
  // Direct online payment launcher for specific Razorpay channel (card, netbanking, wallet, upi)
  const handleInitiateOnlinePayment = async (channel) => {
    setSelectedOnlineChannel(channel);
    setPaymentMethod('card');
    await handlePlaceOrderSubmit('card', channel);
  };

  const handlePlaceOrderSubmit = async (overrideMethod = null, overrideChannel = null) => {
    // SYNCHRONOUS DOUBLE-CLICK GUARD (Day 3 Frontend Task 5)
    if (isSubmittingRef.current || loading || paymentProcessing.isOpen) {
      console.warn('Prevented duplicate order submission: rapid click or double-click ignored.');
      return;
    }
    isSubmittingRef.current = true;

    try {
      const activeMethod = overrideMethod || paymentMethod;
      const activeChannel = overrideChannel || selectedOnlineChannel || 'card';

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

      setErrorMessage(null);
      setPaymentNotice(null);

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

      const userFromStorage = (() => {
        try {
          const raw = localStorage.getItem('adab_user');
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })();
      const effectiveUser = accountProfile || currentUser || userFromStorage;
      const effectiveName = effectiveUser?.name || effectiveUser?.full_name || address.recipient_name || address.full_name || 'Customer';
      const effectivePhone = effectiveUser?.phone || address.phone || '+919876512340';
      const effectiveEmail = effectiveUser?.email || address.email || 'customer@adab.com';
      const effectiveCustomerId = effectiveUser?.id || undefined;

      const orderIdempotencyKey = generateIdempotencyKey('ord');
      const orderPayload = {
        cart_id: cartData.cart ? cartData.cart.id : undefined,
        customer_id: effectiveCustomerId,
        customer_name: effectiveName,
        customer_phone: effectivePhone,
        customer_email: effectiveEmail,
        delivery_address: {
          ...address,
          delivery_slot: deliverySpeed === 'same' ? selectedSlot : null,
          delivery_slot_id: deliverySpeed === 'same' ? selectedSlot?.id : null
        },
        delivery_speed: getBackendDeliverySpeed(),
        payment_method: getBackendPaymentMethod(activeMethod, activeChannel),
        coupon_code: appliedCouponCode || summary.coupon_code || null,
        points_redeemed: effectivePointsToRedeem,
        points_discount: rewardPointsDeduction,
        idempotency_key: orderIdempotencyKey
      };

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

      // CASE 1: Cash on Delivery
      if (activeMethod === 'cod') {
        setPaymentProcessing((prev) => ({
          ...prev,
          step: 'paid'
        }));
        await new Promise((r) => setTimeout(r, 400));

        await onPlaceOrder(orderPayload);

        // Synchronize local points state (backend atomically redeemed the points in createOrderFromCart)
        if (useRewardPoints && effectivePointsToRedeem > 0) {
          const newBal = Math.max(0, (rewardsAccount.points_balance || 0) - effectivePointsToRedeem);
          setRewardsAccount((prev) => ({
            ...prev,
            points_balance: newBal
          }));
          if (onPointsRedeemed) {
            onPointsRedeemed(newBal);
          }
        }
        setPaymentProcessing({
          isOpen: false,
          step: 'idle',
          intentId: null,
          error: null,
          failureReason: null,
          isRetrying: false,
          retryCount: 0
        });
        return;
      }

      // CASE 2: Secure Razorpay Test Mode Online Payment
      // Step A & B: Place order with authoritative calculations and status PENDING
      const orderRes = await CheckoutAPI.placeOrder(orderPayload, orderIdempotencyKey);
      const placedOrder = orderRes?.data;
      if (!placedOrder || !placedOrder.order_id) {
        throw new Error(orderRes?.message || 'Failed to initialize order on server');
      }

      const razorpayOrderId = placedOrder.razorpay_order_id;
      const razorpayKeyId = placedOrder.razorpay_key_id;

      if (!razorpayKeyId || !razorpayOrderId) {
        throw new Error(
          placedOrder.payment_intent?.error ||
          'Razorpay payment credentials are not configured on the backend. Please check RAZORPAY_KEY_ID.'
        );
      }

      setPaymentProcessing((prev) => ({
        ...prev,
        step: 'authorizing',
        intentId: razorpayOrderId,
        createdOrder: placedOrder
      }));

      // Step C: Open official Razorpay Checkout modal targeting the selected method
      const resolvedCustName = placedOrder?.customer?.name || placedOrder?.customer?.full_name || effectiveName;
      const resolvedCustPhone = placedOrder?.customer?.phone || effectivePhone;
      const resolvedCustEmail = placedOrder?.customer?.email || effectiveEmail;

      await openRazorpayCheckout({
        key: razorpayKeyId,
        amountPaise: Math.round(Number(placedOrder.grand_total) * 100),
        currency: 'INR',
        orderId: razorpayOrderId,
        orderNumber: placedOrder.order_number,
        method: activeChannel,
        prefill: {
          name: resolvedCustName,
          phone: resolvedCustPhone,
          email: resolvedCustEmail,
          method: activeChannel
        },
        readonly: {
          contact: true,
          email: true,
          name: true
        },
        onSuccess: async (razorpayResponse) => {
          // Step D: Verify payment signature on backend
          setPaymentProcessing((prev) => ({
            ...prev,
            step: 'authorizing',
            message: 'Verifying payment signature with banking server...'
          }));

          try {
            const confirmRes = await PaymentAPI.confirm(
              placedOrder.payment_id || placedOrder.order_id,
              {
                gateway_transaction_id: razorpayResponse.razorpay_payment_id,
                gateway_signature: razorpayResponse.razorpay_signature,
                intent_id: razorpayResponse.razorpay_order_id,
                payment_gateway: 'razorpay',
                customer_id: placedOrder.customer_id || null
              }
            );

            // Step 3: Verified & Paid
            setPaymentProcessing((prev) => ({
              ...prev,
              step: 'paid'
            }));

            // Synchronize local points state (backend atomically redeemed the points in createOrderFromCart)
            if (useRewardPoints && effectivePointsToRedeem > 0) {
              const newBal = Math.max(0, (rewardsAccount.points_balance || 0) - effectivePointsToRedeem);
              setRewardsAccount((prev) => ({
                ...prev,
                points_balance: newBal
              }));
              if (onPointsRedeemed) {
                onPointsRedeemed(newBal);
              }
            }

            await new Promise((r) => setTimeout(r, 500));

            // Complete transition with verified order
            await onPlaceOrder(confirmRes.data?.order || placedOrder);

            setPaymentProcessing({
              isOpen: false,
              step: 'idle',
              intentId: null,
              error: null,
              failureReason: null,
              isRetrying: false,
              retryCount: 0
            });
          } catch (verifyErr) {
            console.error('Payment verification failed:', verifyErr);
            setPaymentProcessing((prev) => ({
              ...prev,
              step: 'failed',
              createdOrder: placedOrder,
              error: verifyErr.message || 'Payment signature verification failed.',
              failureReason: verifyErr.message
            }));
          }
        },
        onDismiss: () => {
          setPaymentProcessing((prev) => ({
            ...prev,
            step: 'cancelled',
            createdOrder: placedOrder,
            error: 'Checkout modal was closed before payment completion. Your order is pending payment.',
            failureReason: 'Payment window was closed.'
          }));
        },
        onError: (err) => {
          setPaymentProcessing((prev) => ({
            ...prev,
            step: 'failed',
            createdOrder: placedOrder,
            error: err.description || 'Payment declined by bank.',
            failureReason: err.reason || err.description
          }));
        }
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

  // RETRY HANDLER WITH IDEMPOTENCY KEY & DOUBLE-CLICK GUARD
  const handleRetryPayment = async () => {
    if (isRetryingRef.current || paymentProcessing.isRetrying) {
      console.warn('Prevented duplicate retry click.');
      return;
    }
    isRetryingRef.current = true;

    const currentOrder = paymentProcessing.createdOrder;
    setPaymentProcessing((prev) => ({
      ...prev,
      isRetrying: true,
      error: null
    }));

    try {
      const retryKey = generateIdempotencyKey('retry');
      const targetPaymentId = currentOrder?.payment_id || currentOrder?.order_id || paymentProcessing.intentId;

      if (!targetPaymentId) {
        await handlePlaceOrderSubmit();
        return;
      }

      const retryRes = await PaymentAPI.retry(
        targetPaymentId,
        {
          payment_method: getBackendPaymentMethod(),
          payment_gateway: 'razorpay',
          customer_notes: 'Retried from customer checkout UI'
        },
        retryKey
      );

      const retryData = retryRes?.data || {};
      const newRazorpayOrderId = retryData.razorpay_order_id || retryData.intent?.order_id;
      const newRazorpayKeyId = retryData.razorpay_key_id || retryData.intent?.key_id;

      if (!newRazorpayOrderId || !newRazorpayKeyId) {
        throw new Error('Failed to obtain new Razorpay order intent for retry.');
      }

      setPaymentProcessing((prev) => ({
        ...prev,
        step: 'authorizing',
        intentId: newRazorpayOrderId,
        retryCount: prev.retryCount + 1,
        isRetrying: false
      }));

      // Re-open Razorpay Checkout with new intent
      const retryUser = accountProfile || currentUser;
      const retryCustName = currentOrder?.customer?.name || currentOrder?.customer?.full_name || retryUser?.name || retryUser?.full_name || address.recipient_name || address.full_name || 'Customer';
      const retryCustPhone = currentOrder?.customer?.phone || retryUser?.phone || address.phone || '+919876512340';
      const retryCustEmail = currentOrder?.customer?.email || retryUser?.email || address.email || 'customer@adab.com';

      await openRazorpayCheckout({
        key: newRazorpayKeyId,
        amountPaise: Math.round(Number(retryData.payment?.amount || currentOrder.grand_total) * 100),
        currency: 'INR',
        orderId: newRazorpayOrderId,
        orderNumber: currentOrder.order_number,
        method: selectedOnlineChannel || 'upi',
        prefill: {
          name: retryCustName,
          phone: retryCustPhone,
          email: retryCustEmail,
          method: selectedOnlineChannel || 'upi'
        },
        readonly: {
          contact: true,
          email: true,
          name: true
        },
        onSuccess: async (razorpayResponse) => {
          try {
            const confirmRes = await PaymentAPI.confirm(
              targetPaymentId,
              {
                gateway_transaction_id: razorpayResponse.razorpay_payment_id,
                gateway_signature: razorpayResponse.razorpay_signature,
                intent_id: razorpayResponse.razorpay_order_id,
                payment_gateway: 'razorpay',
                customer_id: currentOrder?.customer_id || null
              }
            );

            setPaymentProcessing((prev) => ({
              ...prev,
              step: 'paid'
            }));

            await new Promise((r) => setTimeout(r, 500));
            await onPlaceOrder(confirmRes.data?.order || currentOrder);
            setPaymentProcessing({
              isOpen: false,
              step: 'idle',
              intentId: null,
              error: null,
              failureReason: null,
              isRetrying: false,
              retryCount: 0
            });
          } catch (verifyErr) {
            setPaymentProcessing((prev) => ({
              ...prev,
              step: 'failed',
              error: verifyErr.message || 'Payment signature verification failed.',
              failureReason: verifyErr.message
            }));
          }
        },
        onDismiss: () => {
          setPaymentProcessing((prev) => ({
            ...prev,
            step: 'cancelled',
            error: 'Checkout modal was closed before payment completion.',
            failureReason: 'Payment window was closed.'
          }));
        },
        onError: (err) => {
          setPaymentProcessing((prev) => ({
            ...prev,
            step: 'failed',
            error: err.description || 'Payment declined by bank.',
            failureReason: err.reason || err.description
          }));
        }
      });
    } catch (err) {
      console.error('Retry payment error:', err);
      setPaymentProcessing((prev) => ({
        ...prev,
        step: 'failed',
        error: err.message || 'Payment retry failed',
        failureReason: err.message,
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
          {/* 1. Pay Online: Cards / NetBanking / Wallets / UPI */}
          <button
            type="button"
            onClick={() => setPaymentMethod('card')}
            className={`p-3.5 rounded-2xl font-bold text-xs text-left transition flex items-center gap-3 cursor-pointer ${
              paymentMethod === 'card'
                ? 'border-2 border-emerald-600 bg-emerald-50/60 shadow-sm'
                : 'border border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg shrink-0">
              <i className="fa-solid fa-globe"></i>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-gray-900 font-extrabold flex items-center gap-1.5">
                <span>Pay Online</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold tracking-wide">
                  Razorpay
                </span>
              </div>
              <div className="text-[10px] text-gray-500 font-normal truncate">
                Credit / Debit Card · NetBanking · Wallets · UPI
              </div>
            </div>
          </button>

          {/* 2. Cash on Delivery */}
          <button
            type="button"
            onClick={() => setPaymentMethod('cod')}
            className={`p-3.5 rounded-2xl font-bold text-xs text-left transition flex items-center gap-3 cursor-pointer ${
              paymentMethod === 'cod'
                ? 'border-2 border-emerald-600 bg-emerald-50/60 shadow-sm'
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

        {/* --- EXPANDED PAYMENT METHOD SUB-PANELS --- */}

        {/* 1. Pay Online Sub-panel (Cards, NetBanking, Wallets, UPI via Razorpay) */}
        {paymentMethod === 'card' && (
          <div className="pt-3 border-t border-gray-100 space-y-3.5 animate-fade-in">
            {/* Header / Brand reassurance */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                  <span>Pay Online via Razorpay</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
                    100% Secure
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  Choose a payment channel below to open Razorpay directly.
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-600 font-bold bg-gray-50 px-2.5 py-1 rounded-xl border border-gray-200">
                <i className="fa-solid fa-shield-halved text-emerald-600"></i>
                <span>PCI-DSS Level 1 · 256-bit SSL</span>
              </div>
            </div>

            {/* Interactive Payment Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Cards */}
              <button
                type="button"
                onClick={() => handleInitiateOnlinePayment('card')}
                className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer group ${
                  selectedOnlineChannel === 'card'
                    ? 'border-2 border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500'
                    : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/20'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 transition ${
                  selectedOnlineChannel === 'card' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-blue-50 text-blue-700'
                }`}>
                  <i className="fa-solid fa-credit-card"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-gray-900 flex items-center justify-between">
                    <span>Credit / Debit Card</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-extrabold">Instant OTP</span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    Visa, Mastercard, RuPay, Maestro &amp; Diners Club
                  </div>
                  <div className="mt-2 text-[10px] font-extrabold text-emerald-700 flex items-center gap-1 group-hover:underline">
                    <span>Pay with Card via Razorpay</span>
                    <i className="fa-solid fa-arrow-right text-[9px]"></i>
                  </div>
                </div>
              </button>

              {/* NetBanking */}
              <button
                type="button"
                onClick={() => handleInitiateOnlinePayment('netbanking')}
                className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer group ${
                  selectedOnlineChannel === 'netbanking'
                    ? 'border-2 border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500'
                    : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/20'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 transition ${
                  selectedOnlineChannel === 'netbanking' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-purple-50 text-purple-700'
                }`}>
                  <i className="fa-solid fa-building-columns"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-gray-900 flex items-center justify-between">
                    <span>NetBanking</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-extrabold">50+ Banks</span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    HDFC, ICICI, SBI, Axis, Kotak &amp; all major banks
                  </div>
                  <div className="mt-2 text-[10px] font-extrabold text-emerald-700 flex items-center gap-1 group-hover:underline">
                    <span>Pay via NetBanking (Razorpay)</span>
                    <i className="fa-solid fa-arrow-right text-[9px]"></i>
                  </div>
                </div>
              </button>

              {/* Wallets */}
              <button
                type="button"
                onClick={() => handleInitiateOnlinePayment('wallet')}
                className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer group ${
                  selectedOnlineChannel === 'wallet'
                    ? 'border-2 border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500'
                    : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/20'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 transition ${
                  selectedOnlineChannel === 'wallet' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-amber-50 text-amber-700'
                }`}>
                  <i className="fa-solid fa-wallet"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-gray-900 flex items-center justify-between">
                    <span>Digital Wallets</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-extrabold">1-Click</span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    PhonePe, Paytm, Mobikwik, Freecharge, Airtel
                  </div>
                  <div className="mt-2 text-[10px] font-extrabold text-emerald-700 flex items-center gap-1 group-hover:underline">
                    <span>Pay with Wallet via Razorpay</span>
                    <i className="fa-solid fa-arrow-right text-[9px]"></i>
                  </div>
                </div>
              </button>

              {/* UPI Instant & QR */}
              <button
                type="button"
                onClick={() => handleInitiateOnlinePayment('upi')}
                className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer group ${
                  selectedOnlineChannel === 'upi'
                    ? 'border-2 border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500'
                    : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/20'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 transition ${
                  selectedOnlineChannel === 'upi' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  <i className="fa-solid fa-qrcode"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-gray-900 flex items-center justify-between">
                    <span>UPI Instant &amp; QR Code</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-extrabold">Zero Fee</span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    Google Pay, PhonePe, Paytm, CRED &amp; Scan QR
                  </div>
                  <div className="mt-2 text-[10px] font-extrabold text-emerald-700 flex items-center gap-1 group-hover:underline">
                    <span>Pay with UPI via Razorpay</span>
                    <i className="fa-solid fa-arrow-right text-[9px]"></i>
                  </div>
                </div>
              </button>
            </div>

            {/* Seamless Flow Instruction Callout */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-50/60 to-blue-50/60 border border-emerald-200/80 text-xs text-gray-700 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs shrink-0 font-bold">
                  <i className="fa-solid fa-lock"></i>
                </div>
                <div className="text-[11px] leading-tight">
                  <strong className="text-gray-900">Zero Card/Bank Details Stored:</strong> Your sensitive financial details are encrypted and processed directly by Razorpay's certified banking gateway.
                </div>
              </div>
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

        {/* ============================================================== */}
        {/* ADAB REWARD POINTS REDEMPTION (Day 6 Frontend Task 5: sec-points) */}
        {/* ============================================================== */}
        <div
          id="checkoutRewardsSection"
          data-testid="checkout-rewards-section"
          className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50/40 to-amber-50/30 border border-amber-200/80 shadow-xs space-y-2.5 my-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center text-sm shadow-xs shrink-0">
                <i className="fa-solid fa-star"></i>
              </div>
              <div>
                <div className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <span>ADAB Loyalty Points</span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-200/80 text-amber-900 font-extrabold uppercase">
                    {rewardsAccount.tier || 'BRONZE'} TIER
                  </span>
                </div>
                <div className="text-[11px] text-amber-800">
                  Balance: <strong id="checkoutAvailablePoints" data-testid="checkout-available-points" className="font-bold">{availablePoints.toLocaleString('en-IN')}</strong> pts (Worth ₹{availablePoints.toFixed(2)})
                </div>
              </div>
            </div>

            {availablePoints > 0 && maxEligiblePoints > 0 ? (
              <label className="flex items-center gap-2 cursor-pointer select-none bg-white px-3 py-1.5 rounded-xl border border-amber-300 shadow-2xs hover:bg-amber-50/50 transition">
                <input
                  type="checkbox"
                  id="useRewardPointsToggle"
                  data-testid="use-reward-points-toggle"
                  checked={useRewardPoints}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUseRewardPoints(checked);
                    if (checked && appliedRewardPoints === 0) {
                      setAppliedRewardPoints(maxEligiblePoints);
                    }
                  }}
                  className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer accent-[#18753C]"
                />
                <span className="text-xs font-extrabold text-amber-950">
                  Apply Points
                </span>
              </label>
            ) : (
              <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                {availablePoints === 0 ? '0 Points Available' : 'Max 50% Met'}
              </span>
            )}
          </div>

          {useRewardPoints && maxEligiblePoints > 0 && (
            <div className="pt-2 border-t border-amber-200/60 space-y-2 animate-fade-in text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/70 p-2.5 rounded-xl border border-amber-200/50">
                <div className="text-[11px] text-amber-900">
                  <span>Applying </span>
                  <strong className="font-extrabold text-amber-950">{effectivePointsToRedeem} pts</strong>
                  <span> = </span>
                  <strong className="font-extrabold text-emerald-700">₹{rewardPointsDeduction.toFixed(2)} off order total</strong>
                  <div className="text-[10px] text-amber-700/80 mt-0.5">
                    1 pt = ₹1 off · Max {maxEligiblePoints} pts eligible on this order (50% max)
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    id="rewardPointsInput"
                    data-testid="reward-points-input"
                    min="1"
                    max={maxEligiblePoints}
                    value={appliedRewardPoints > 0 ? appliedRewardPoints : maxEligiblePoints}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (isNaN(val) || val <= 0) {
                        setAppliedRewardPoints(0);
                      } else {
                        setAppliedRewardPoints(Math.min(val, maxEligiblePoints));
                      }
                    }}
                    className="w-20 px-2 py-1 text-xs font-mono font-bold border border-amber-300 rounded-lg text-center bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setAppliedRewardPoints(maxEligiblePoints)}
                    className="px-2 py-1 text-[10px] font-extrabold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition cursor-pointer"
                  >
                    Max
                  </button>
                </div>
              </div>
            </div>
          )}
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
          {rewardPointsDeduction > 0 && (
            <div
              id="rewardPointsBillRow"
              data-testid="reward-points-bill-row"
              className="bill-row text-amber-900 bg-amber-50/80 p-1.5 rounded-lg border border-amber-200/60"
            >
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-star text-amber-500 text-xs"></i>
                <span>Reward Points Applied (-{effectivePointsToRedeem} pts)</span>
              </span>
              <span className="font-extrabold text-amber-800">-₹{rewardPointsDeduction.toFixed(2)}</span>
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
