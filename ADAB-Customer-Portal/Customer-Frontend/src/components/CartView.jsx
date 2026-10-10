import React, { useState, useEffect } from 'react';
import { CartAPI, CustomerAPI } from '../services/api';

/**
 * Shopping Cart Screen (sec-cart) Component
 * Matches project arch/unified-customer-portal-demo.html
 * Day 2 Frontend: Cart UI, Coupon Flow & Pre-Checkout Stock & Price Validation Trigger
 */
export default function CartView({
  cartData = { items: [], stores: [], summary: {} },
  onUpdateQty,
  onApplyCoupon,
  onRemoveCoupon,
  onStartShopping,
  onProceedToCheckout,
  onChangeAddress,
  selectedDeliveryAddress,
  onSelectAddress,
  validationIssues = [],
  onClearValidationIssues,
  loading = false
}) {
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState(null);
  const [couponSuccessMessage, setCouponSuccessMessage] = useState(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [showCouponsList, setShowCouponsList] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Available coupons fetched live from backend
  const [availableCoupons, setAvailableCoupons] = useState([]);

  // Address selection state - loaded live from database with reliable default
  const [addressList, setAddressList] = useState([
    { id: 'addr_default', type: 'Home', full_address: 'Flat 402, Green Valley Apt, Ring Road, Surat', is_verified: true }
  ]);
  const [selectedAddressId, setSelectedAddressId] = useState(selectedDeliveryAddress?.id || 'addr_default');
  const [showAddressPicker, setShowAddressPicker] = useState(false);

  // Keep selected ID in sync if parent passes or updates selectedDeliveryAddress
  useEffect(() => {
    if (selectedDeliveryAddress?.id) {
      setSelectedAddressId(selectedDeliveryAddress.id);
    }
  }, [selectedDeliveryAddress?.id]);

  // Load real customer addresses from database
  useEffect(() => {
    let isMounted = true;
    CustomerAPI.getAddresses()
      .then((res) => {
        if (isMounted && res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const formatted = res.data.map((a) => ({
            id: a.id,
            type: a.label || a.type || 'Home',
            full_address: [
              a.address_line || a.address,
              a.landmark,
              a.city || 'Surat',
              a.pincode || a.zip
            ].filter(Boolean).join(', '),
            city: a.city || 'Surat',
            state: a.state || 'Gujarat',
            pincode: a.pincode || a.zip || '',
            is_verified: true,
            raw: a
          }));
          setAddressList(formatted);
          if (!selectedDeliveryAddress && formatted.length > 0) {
            setSelectedAddressId(formatted[0].id);
          }
        }
      })
      .catch((err) => {
        console.debug('Using fallback addresses list in CartView:', err.message);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const items = cartData.items || [];
  const summary = cartData.summary || {};
  const isCartEmpty = items.length === 0;

  const appliedCoupon = summary.coupon_code || (cartData.cart && cartData.cart.coupon_code);
  const discountAmount = Number(summary.discount || 0);
  const subtotal = Number(summary.subtotal || 0);

  // Check if any out of stock issue exists in validation results
  const hasOutOfStockIssue = (validationIssues || []).some(
    (iss) => iss.issue === 'OUT_OF_STOCK' || iss.type === 'OUT_OF_STOCK'
  );

  // Fetch live coupons from backend
  useEffect(() => {
    let isMounted = true;
    CartAPI.getCoupons()
      .then((res) => {
        if (isMounted && res.status === 'success' && res.data?.coupons?.length > 0) {
          setAvailableCoupons(res.data.coupons);
        }
      })
      .catch((err) => {
        console.debug('Using fallback coupons list:', err.message);
      });
    return () => {
      isMounted = false;
    };
  }, [subtotal]);

  // Multi-seller stores: prefer pre-grouped stores from backend (Day 2 Task 2), or fallback to client grouping
  const storesToRender = (cartData.stores && cartData.stores.length > 0)
    ? cartData.stores
    : Object.values(
        items.reduce((acc, item) => {
          const storeId = item.store_id || item.seller_id || 'default_store';
          if (!acc[storeId]) {
            acc[storeId] = {
              store_id: storeId,
              store_name: item.store_name || item.seller_name || item.store || 'ADAB Local Store',
              category: item.store_category || item.category || 'Grocery',
              rating: item.store_rating || 4.8,
              items: [],
              store_subtotal: 0
            };
          }
          acc[storeId].items.push(item);
          acc[storeId].store_subtotal += Number(item.sell_price || item.price || 0) * Number(item.quantity || 1);
          return acc;
        }, {})
      );

  // Generate dynamic store initials and color
  const getStoreInitials = (name = '') => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name.slice(0, 2) || 'ST').toUpperCase();
  };

  const getStoreColor = (name = '') => {
    const palette = ['#047857', '#0284C7', '#7C3AED', '#D97706', '#059669', '#E11D48', '#4F46E5'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
  };

  // Product emoji fallback mapper
  const getProductEmoji = (item) => {
    const name = (item.product_name || item.name || '').toLowerCase();
    if (name.includes('dal') || name.includes('pulse')) return '🌾';
    if (name.includes('chip') || name.includes('snack') || name.includes('wafers')) return '🍿';
    if (name.includes('oil') || name.includes('ghee')) return '🫒';
    if (name.includes('milk') || name.includes('dairy') || name.includes('paneer')) return '🥛';
    if (name.includes('butter') || name.includes('cheese')) return '🧈';
    if (name.includes('rice') || name.includes('basmati')) return '🍚';
    if (name.includes('kurti') || name.includes('cloth') || name.includes('shirt')) return '👗';
    if (name.includes('salt') || name.includes('sugar') || name.includes('spice')) return '🧂';
    if (name.includes('tea') || name.includes('coffee')) return '☕';
    if (name.includes('bread') || name.includes('bakery') || name.includes('toast')) return '🍞';
    return '📦';
  };

  // Handle atomic quantity change
  const handleQtyChange = async (itemId, delta) => {
    if (updatingItemId || loading) return;
    setUpdatingItemId(itemId);
    try {
      if (onUpdateQty) {
        await onUpdateQty(itemId, delta);
      }
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Parse structured error from server response
  const parseCouponError = (err, code) => {
    const msg = err.message || '';
    let title = 'Invalid Coupon';
    let shortfall = 0;

    if (err.code === 'MIN_ORDER_NOT_MET' || msg.toLowerCase().includes('minimum order')) {
      title = 'Minimum Order Threshold Not Met';
      const match = msg.match(/₹(\d+).*?₹(\d+)/);
      if (match) {
        shortfall = Math.max(0, Number(match[1]) - Number(match[2]));
      }
    } else if (err.code === 'EXPIRED' || msg.toLowerCase().includes('expired')) {
      title = 'Coupon Expired';
    } else if (err.code === 'INACTIVE' || msg.toLowerCase().includes('inactive')) {
      title = 'Coupon Inactive';
    } else if (err.code === 'NOT_FOUND' || msg.toLowerCase().includes('does not exist')) {
      title = 'Coupon Not Found';
    } else if (err.code === 'NOT_YET_ACTIVE' || msg.toLowerCase().includes('not active yet')) {
      title = 'Coupon Not Active Yet';
    }

    return {
      title,
      message: msg || `Coupon "${code}" could not be applied.`,
      code,
      shortfall
    };
  };

  // Handle coupon application via form submit
  const handleApplyCoupon = async (e) => {
    if (e) e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError({
        title: 'Empty Coupon Code',
        message: 'Please enter a coupon code before clicking Apply.'
      });
      return;
    }
    setCouponError(null);
    setCouponSuccessMessage(null);
    setApplyingCoupon(true);
    try {
      if (onApplyCoupon) {
        await onApplyCoupon(code);
      }
      setCouponInput('');
      setCouponSuccessMessage(`🎉 Coupon ${code} applied successfully!`);
    } catch (err) {
      setCouponError(parseCouponError(err, code));
    } finally {
      setApplyingCoupon(false);
    }
  };

  // Quick-apply coupon chip or card click
  const handleQuickCoupon = (code) => {
    setCouponInput(code);
    setCouponError(null);
    setCouponSuccessMessage(null);
    setApplyingCoupon(true);
    if (onApplyCoupon) {
      onApplyCoupon(code)
        .then(() => {
          setCouponInput('');
          setCouponSuccessMessage(`🎉 Coupon ${code} applied successfully!`);
        })
        .catch((err) => {
          setCouponError(parseCouponError(err, code));
        })
        .finally(() => setApplyingCoupon(false));
    }
  };

  // Remove applied coupon
  const handleRemoveCouponClick = async () => {
    setCouponError(null);
    setCouponSuccessMessage(null);
    try {
      if (onRemoveCoupon) {
        await onRemoveCoupon();
      }
    } catch (err) {
      setCouponError({
        title: 'Remove Failed',
        message: err.message || 'Could not remove coupon'
      });
    }
  };

  // Handle proceed to checkout with active validating spinner
  const handleCheckoutClick = async () => {
    if (isValidating || loading) return;
    setIsValidating(true);
    try {
      if (onProceedToCheckout) {
        await onProceedToCheckout();
      }
    } finally {
      setIsValidating(false);
    }
  };

  // Dynamic delivery fee rule: free above 499 or by tier
  const isFreeDelivery = subtotal >= 499 || summary.delivery_fee === 0;
  const deliveryFee = isFreeDelivery ? 0 : Number(summary.delivery_fee !== undefined ? summary.delivery_fee : 29);
  const grandTotal = Number(summary.grand_total !== undefined ? summary.grand_total : Math.max(0, subtotal + deliveryFee - discountAmount));
  const freeDeliveryShortfall = Math.max(0, 499 - subtotal);

  const selectedAddress = (() => {
    if (selectedDeliveryAddress) {
      return {
        id: selectedDeliveryAddress.id || selectedAddressId,
        type: selectedDeliveryAddress.label || selectedDeliveryAddress.type || 'Home',
        full_address: selectedDeliveryAddress.full_address || [
          selectedDeliveryAddress.address_line || selectedDeliveryAddress.address,
          selectedDeliveryAddress.landmark,
          selectedDeliveryAddress.city || 'Surat',
          selectedDeliveryAddress.pincode || selectedDeliveryAddress.zip
        ].filter(Boolean).join(', '),
        city: selectedDeliveryAddress.city || 'Surat',
        state: selectedDeliveryAddress.state || 'Gujarat',
        pincode: selectedDeliveryAddress.pincode || selectedDeliveryAddress.zip || '',
        is_verified: true,
        raw: selectedDeliveryAddress
      };
    }
    const found = addressList.find((a) => a.id === selectedAddressId);
    if (found) return found;
    if (addressList.length > 0) return addressList[0];
    return {
      id: 'addr_default',
      type: 'Home',
      full_address: 'Flat 402, Green Valley Apt, Ring Road, Surat',
      city: 'Surat',
      pincode: '395002',
      is_verified: true
    };
  })();

  // 1. EMPTY CART STATE
  if (isCartEmpty) {
    return (
      <section id="sec-cart" className="pt-2 pb-6">
        <div id="cartEmpty" className="text-center py-16 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 animate-bounce">
            <i className="fa-solid fa-basket-shopping"></i>
          </div>
          <div className="font-extrabold text-xl text-gray-900">Your basket is empty</div>
          <p className="text-xs text-gray-500 mt-1.5 max-w-xs mx-auto">
            Explore local shops in your area and add fresh groceries, dairy, or fashion items.
          </p>
          <button
            type="button"
            onClick={onStartShopping}
            className="green-btn mt-6 max-w-xs mx-auto text-sm py-3.5 flex items-center justify-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-compass mr-1"></i>
            <span>Start Shopping</span>
          </button>
        </div>
      </section>
    );
  }

  // 2. ACTIVE CART STATE
  return (
    <section id="sec-cart" className="pt-2 pb-6">
      <div id="cartFull" className="space-y-4">
        {/* 2.1 Neighborhood Direct Banner */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-3.5 border border-emerald-200/70 text-xs shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-sm">
            <i className="fa-solid fa-shield-halved text-sm"></i>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-emerald-950 flex items-center gap-1.5">
              <span>Neighborhood Shop Direct</span>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded-full uppercase">100% Genuine</span>
            </div>
            <div className="text-emerald-800 text-[11px] mt-0.5">
              Orders are packed fresh and dispatched straight from local stores.
            </div>
          </div>
        </div>

      {/* 2.15 PRE-CHECKOUT STOCK & PRICE VALIDATION ALERT (Day 2 Frontend Task 3) */}
      {validationIssues && validationIssues.length > 0 && (
        <div
          id="preCheckoutAlert"
          className="bg-red-50/95 border-2 border-red-300 rounded-3xl p-4 shadow-sm space-y-3 animate-shake"
        >
          <div className="flex items-center justify-between pb-2 border-b border-red-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-black shrink-0 text-sm shadow-xs">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div>
                <div className="font-black text-sm text-red-950">
                  Stock & Price Adjustment Required
                </div>
                <div className="text-[10px] text-red-700 font-semibold">
                  {`${validationIssues.length} item${validationIssues.length > 1 ? 's' : ''} in your cart updated by the store`}
                </div>
              </div>
            </div>
            {onClearValidationIssues && (
              <button
                type="button"
                onClick={onClearValidationIssues}
                className="text-red-400 hover:text-red-700 text-xs font-bold p-1 cursor-pointer"
                aria-label="Dismiss alert"
              >
                ✕
              </button>
            )}
          </div>

          {/* Issues breakdown list */}
          <div className="space-y-2">
            {validationIssues.map((iss, idx) => {
              const isOutOfStock = iss.issue === 'OUT_OF_STOCK' || iss.type === 'OUT_OF_STOCK';
              const isInsufficient = iss.issue === 'INSUFFICIENT_STOCK' || iss.type === 'INSUFFICIENT_STOCK';
              const isPriceChanged = iss.issue === 'PRICE_CHANGED' || iss.type === 'PRICE_CHANGED';
              const name = iss.name || iss.product_name || 'Item';

              return (
                <div
                  key={idx}
                  className="bg-white rounded-xl p-2.5 border border-red-100 flex items-center justify-between text-xs shadow-2xs gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-gray-900 truncate">{name}</div>
                    <div className="text-[11px] text-gray-600 mt-0.5">{iss.message}</div>
                  </div>
                  <div className="shrink-0">
                    {isOutOfStock ? (
                      <span className="bg-red-100 text-red-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase border border-red-200">
                        Out of Stock
                      </span>
                    ) : isInsufficient ? (
                      <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase border border-amber-200">
                        {`Max ${iss.available_stock || iss.available_quantity || 0}`}
                      </span>
                    ) : isPriceChanged ? (
                      <span className="bg-blue-100 text-blue-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-blue-200">
                        {`₹${iss.current_price || iss.new_price}`}
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Updated
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-red-800 font-medium bg-red-100/60 p-2.5 rounded-xl flex items-center gap-2">
            <i className="fa-solid fa-circle-info text-red-600 shrink-0"></i>
            <span>We've automatically synchronized your basket. Please adjust quantities or remove unavailable items to proceed.</span>
          </div>
        </div>
      )}

      {/* 2.2 Multi-Seller Visual Grouping */}
      <div id="cartItems" className="space-y-3.5">
        {storesToRender.map((storeGroup) => {
          const storeSubtotal = storeGroup.store_subtotal !== undefined
            ? Number(storeGroup.store_subtotal)
            : storeGroup.items.reduce(
                (sum, it) => sum + Number(it.sell_price || it.price || 0) * Number(it.quantity || 1),
                0
              );

          const storeColor = getStoreColor(storeGroup.store_name);
          const storeInitials = getStoreInitials(storeGroup.store_name);

          return (
            <div
              key={storeGroup.store_id}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
            >
              {/* Store Dedicated Header */}
              <div className="px-4 py-3 bg-gray-50/90 flex items-center gap-2.5 border-b border-gray-100">
                {/* Store Avatar Initials */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0 shadow-xs"
                  style={{ backgroundColor: storeColor }}
                >
                  {storeInitials}
                </div>

                {/* Store Name & Category Tag */}
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm text-gray-900 truncate">
                    {storeGroup.store_name}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="store-chip !text-[9px] !py-0.5 !px-1.5">
                      {storeGroup.category || 'Local Shop'}
                    </span>
                    <span className="text-[10px] text-gray-500 font-semibold">
                      · Direct dispatch
                    </span>
                  </div>
                </div>

                {/* Store Subtotal */}
                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 inline-block shadow-2xs">
                    {`₹${storeSubtotal}`}
                  </span>
                </div>
              </div>

              {/* Item Rows & Quantity Controls */}
              <div className="p-3.5 space-y-3 divide-y divide-gray-50">
                {storeGroup.items.map((item) => {
                  const itemId = item.cart_item_id || item.id;
                  const itemUnitPrice = Number(item.sell_price || item.price || 0);
                  const itemQuantity = Number(item.quantity || 1);
                  const itemTotalPrice = itemUnitPrice * itemQuantity;
                  const isUpdating = updatingItemId === itemId;
                  const isLowStock = item.effective_stock !== undefined && item.effective_stock > 0 && item.effective_stock <= 3;
                  const isOutOfStock = item.effective_stock !== undefined && item.effective_stock === 0;

                  // Match validation issues specifically for this item
                  const matchedIssue = (validationIssues || []).find(
                    (iss) =>
                      (iss.listing_id && (iss.listing_id === item.listing_id || iss.listing_id === item.id)) ||
                      (iss.name && iss.name.toLowerCase() === (item.product_name || item.name || '').toLowerCase())
                  );

                  return (
                    <div
                      key={itemId}
                      className={`pt-2 first:pt-0 flex gap-3 items-center justify-between rounded-xl p-1.5 transition ${
                        matchedIssue
                          ? (matchedIssue.issue === 'OUT_OF_STOCK' || matchedIssue.type === 'OUT_OF_STOCK'
                              ? 'bg-red-50/50 border border-red-200'
                              : 'bg-amber-50/40 border border-amber-200')
                          : ''
                      }`}
                    >
                      {/* Product Image / Emoji Graphic */}
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.product_name || item.name}
                          className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-100"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-green-50/80 flex items-center justify-center text-xl shrink-0 border border-green-100/50">
                          {getProductEmoji(item)}
                        </div>
                      )}

                      {/* Product Details (Title, Unit Price, Calculated Row Price) */}
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="font-bold text-sm text-gray-900 truncate">
                          {item.product_name || item.name}
                        </div>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="font-extrabold text-brand-dark text-xs">
                            {`₹${itemTotalPrice}`}
                          </span>
                          <span className="text-[10px] font-normal text-gray-400">
                            {`(₹${itemUnitPrice} each)`}
                          </span>
                        </div>

                        {/* General Stock Indicators */}
                        {isLowStock && !matchedIssue && (
                          <div className="text-[10px] text-amber-600 font-bold flex items-center gap-1 mt-0.5">
                            <i className="fa-solid fa-triangle-exclamation text-[9px]"></i>
                            <span>Only {item.effective_stock} left</span>
                          </div>
                        )}
                        {isOutOfStock && !matchedIssue && (
                          <div className="text-[10px] text-red-600 font-extrabold flex items-center gap-1 mt-0.5">
                            <i className="fa-solid fa-circle-exclamation text-[9px]"></i>
                            <span>Out of stock</span>
                          </div>
                        )}

                        {/* Real-time Validation Issue Badges (Task 3) */}
                        {matchedIssue && (
                          <div className="mt-1">
                            {(matchedIssue.issue === 'OUT_OF_STOCK' || matchedIssue.type === 'OUT_OF_STOCK') && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-md border border-red-200">
                                <i className="fa-solid fa-circle-xmark text-[9px]"></i> OUT OF STOCK
                              </span>
                            )}
                            {(matchedIssue.issue === 'INSUFFICIENT_STOCK' || matchedIssue.type === 'INSUFFICIENT_STOCK') && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200">
                                <i className="fa-solid fa-triangle-exclamation text-[9px]"></i>
                                {`Only ${matchedIssue.available_stock || matchedIssue.available_quantity} available`}
                              </span>
                            )}
                            {(matchedIssue.issue === 'PRICE_CHANGED' || matchedIssue.type === 'PRICE_CHANGED') && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md border border-blue-200">
                                <i className="fa-solid fa-circle-info text-[9px]"></i>
                                {`Price updated to ₹${matchedIssue.current_price || matchedIssue.new_price}`}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Interactive Quantity Controllers (qty-ctrl with + and -) */}
                      <div className="qty-ctrl shrink-0 shadow-sm">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(itemId, -1)}
                          disabled={loading || isUpdating}
                          aria-label="Decrease quantity"
                          className="hover:scale-110 active:scale-90 transition-transform disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {itemQuantity === 1 ? (
                            <i className="fa-solid fa-trash text-[11px] text-red-200 hover:text-red-100"></i>
                          ) : (
                            '−'
                          )}
                        </button>

                        <span className="min-w-[18px] text-center font-extrabold select-none">
                          {isUpdating ? (
                            <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                          ) : (
                            itemQuantity
                          )}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleQtyChange(itemId, 1)}
                          disabled={
                            loading ||
                            isUpdating ||
                            (item.effective_stock !== undefined && itemQuantity >= item.effective_stock)
                          }
                          aria-label="Increase quantity"
                          className="hover:scale-110 active:scale-90 transition-transform disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2.3 Free Delivery Threshold / Progress Tip */}
      {freeDeliveryShortfall > 0 ? (
        <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-2xl p-3 flex items-center justify-between text-xs text-emerald-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-truck-fast text-emerald-600 text-sm"></i>
            <div>
              <span>{`Add `}<b>{`₹${freeDeliveryShortfall}`}</b>{` more for `}</span>
              <span className="font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">FREE Delivery</span>
            </div>
          </div>
          <div className="w-20 bg-emerald-200/50 rounded-full h-2 overflow-hidden shrink-0 ml-2">
            <div
              className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.round((subtotal / 499) * 100))}%` }}
            ></div>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-2.5 text-xs text-emerald-800 font-bold flex items-center gap-2 shadow-2xs">
          <i className="fa-solid fa-circle-check text-emerald-600 text-sm"></i>
          <span>🎉 You've unlocked FREE Delivery on this order!</span>
        </div>
      )}

      {/* 2.4 Live Order Summary / Bill Card */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
          <span className="font-extrabold text-sm text-gray-900">Order Summary</span>
          <span
            className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200"
            id="cartSavingsBadge"
          >
            {discountAmount > 0
              ? `Saved ₹${discountAmount}`
              : (isFreeDelivery ? 'Free Delivery Applied' : 'Guaranteed Best Price')}
          </span>
        </div>

        {/* Items Subtotal */}
        <div className="bill-row">
          <span>Items Subtotal</span>
          <span id="cartSubtotal" className="font-bold text-gray-900">
            {`₹${subtotal}`}
          </span>
        </div>

        {/* Estimated Delivery Fee (dynamic: free above ₹499 or by delivery tier) */}
        <div className="bill-row">
          <span>Estimated Delivery Fee</span>
          <span id="cartDelivery" className="font-bold text-gray-900">
            {isFreeDelivery ? (
              <span className="text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full text-xs border border-emerald-200">
                FREE
              </span>
            ) : (
              `₹${deliveryFee}`
            )}
          </span>
        </div>

        {/* Applied Coupon Savings line with a "Remove" action */}
        {discountAmount > 0 && (
          <div className="bill-row flex items-center justify-between" id="cartDiscountRow">
            <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
              <i className="fa-solid fa-ticket text-xs"></i>
              <span>{`Coupon Savings ${appliedCoupon ? `(${appliedCoupon})` : ''}`}</span>
            </span>
            <div className="flex items-center gap-2">
              <span id="cartDiscount" className="font-extrabold text-emerald-700">
                {`-₹${discountAmount}`}
              </span>
              <button
                type="button"
                onClick={handleRemoveCouponClick}
                disabled={loading}
                className="text-[11px] text-red-500 hover:text-red-700 hover:bg-red-50 px-1.5 py-0.5 rounded font-bold transition cursor-pointer"
                title="Remove applied coupon"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {/* Dashed divider line and Grand Total */}
        <div className="bill-row border-t border-dashed border-gray-200 pt-3 mt-1 flex justify-between items-center">
          <div>
            <span className="font-black text-gray-900 text-base">To Pay</span>
            <div className="text-[10px] text-gray-400 font-medium">Inclusive of all local taxes</div>
          </div>
          <span id="cartTotal" className="font-black text-emerald-800 text-xl tracking-tight">
            {`₹${grandTotal}`}
          </span>
        </div>

        {/* Estimated Reward Points strip inside summary card */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-amber-800 font-bold bg-amber-50/70 -mx-5 -mb-5 px-5 py-2.5 rounded-b-3xl">
          <span className="flex items-center gap-1.5">
            <i className="fa-solid fa-coins text-amber-500"></i>
            <span>ADAB Points Earned</span>
          </span>
          <span className="bg-amber-100/80 text-amber-900 px-2 py-0.5 rounded-full font-black">
            {`+${summary.estimated_reward_points || Math.floor(grandTotal / 100)} pts`}
          </span>
        </div>
      </div>

      {/* 2.5 COUPON APPLICATION FLOW */}
      <div className="space-y-2.5" id="couponSection">
        {/* Case A: Active Applied Coupon Celebration Banner */}
        {appliedCoupon && discountAmount > 0 ? (
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-sm">
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs text-gray-900">
                    Coupon Applied:
                  </span>
                  <span className="font-mono font-black text-xs bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-300">
                    {appliedCoupon}
                  </span>
                </div>
                <div className="text-emerald-800 text-xs font-bold mt-0.5 truncate">
                  {`🎉 You saved ₹${discountAmount} with this code!`}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveCouponClick}
              disabled={loading}
              className="text-xs font-bold text-red-600 hover:text-red-700 bg-white hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl shadow-2xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Remove coupon"
            >
              <i className="fa-solid fa-trash-can text-[11px]"></i>
              <span>Remove</span>
            </button>
          </div>
        ) : (
          /* Case B: Coupon Input Field and Apply Button */
          <div className="space-y-2">
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <div className="relative flex-1">
                <i className="fa-solid fa-ticket absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                <input
                  type="text"
                  id="couponInput"
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value);
                    setCouponError(null);
                  }}
                  placeholder="Enter coupon (e.g. DIWALI50, NAVRATRI)"
                  className={`w-full pl-10 pr-8 py-3 rounded-2xl border text-xs font-bold uppercase tracking-wider outline-none bg-white shadow-2xs transition ${
                    couponError
                      ? 'border-red-400 focus:border-red-500 bg-red-50/10'
                      : 'border-gray-200 focus:border-emerald-600'
                  }`}
                />
                {couponInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setCouponInput('');
                      setCouponError(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={loading || applyingCoupon || !couponInput.trim()}
                className="coral-btn !py-3 !px-5 !text-xs shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {applyingCoupon ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    <span>Applying</span>
                  </>
                ) : (
                  <span>Apply</span>
                )}
              </button>
            </form>

            {/* Error Message Feedback for invalid / expired / minimum order threshold */}
            {couponError && (
              <div
                id="couponErrorAlert"
                className="bg-red-50 border border-red-200/90 rounded-2xl p-3 text-xs text-red-800 shadow-2xs flex items-start justify-between gap-2.5 animate-shake"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <i className="fa-solid fa-circle-exclamation text-red-500 text-sm mt-0.5 shrink-0"></i>
                  <div className="min-w-0">
                    <div className="font-extrabold text-red-900">
                      {couponError.title || 'Could Not Apply Coupon'}
                    </div>
                    <div className="text-[11px] text-red-700 mt-0.5 font-medium leading-relaxed">
                      {couponError.message || couponError}
                    </div>
                    {couponError.shortfall > 0 && (
                      <div className="mt-1 text-[11px] text-amber-800 font-bold flex items-center gap-1">
                        <i className="fa-solid fa-cart-plus text-[10px]"></i>
                        <span>{`Add ₹${couponError.shortfall} more items to your cart to use this code.`}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCouponError(null)}
                  className="text-red-400 hover:text-red-700 text-sm font-bold shrink-0 p-0.5 cursor-pointer"
                  aria-label="Dismiss error"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Success notification banner (if applied) */}
            {couponSuccessMessage && !couponError && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-2.5 text-xs text-emerald-800 font-bold flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-600"></i>
                  <span>{couponSuccessMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCouponSuccessMessage(null)}
                  className="text-emerald-600 hover:text-emerald-800 text-xs"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Available Coupons Drawer Toggle & List */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setShowCouponsList(!showCouponsList)}
                className="w-full text-left py-2 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200/80 flex items-center justify-between text-xs font-bold text-gray-700 transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-gift text-brand-coral"></i>
                  <span>Available Offers & Coupons ({availableCoupons.length})</span>
                </div>
                <i className={`fa-solid fa-chevron-${showCouponsList ? 'up' : 'down'} text-[10px] text-gray-400`}></i>
              </button>

              {showCouponsList && (
                <div className="mt-2 space-y-2 max-h-72 overflow-y-auto pr-1">
                  {availableCoupons.map((c) => {
                    const isEligible = subtotal >= Number(c.min_order_value || 0) && !c.is_expired && c.is_active !== false;
                    const shortfall = Math.max(0, Number(c.min_order_value || 0) - subtotal);
                    const isAlreadyApplied = appliedCoupon === c.code;

                    return (
                      <div
                        key={c.code}
                        className={`p-3 rounded-2xl border transition ${
                          isAlreadyApplied
                            ? 'border-emerald-300 bg-emerald-50/50'
                            : isEligible
                            ? 'border-emerald-200 bg-white hover:border-emerald-400'
                            : 'border-gray-200 bg-gray-50/70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-xs px-2 py-0.5 rounded border border-dashed border-emerald-600 bg-emerald-50 text-emerald-800 tracking-wider">
                                {c.code}
                              </span>
                              {c.is_expired ? (
                                <span className="text-[9px] bg-red-100 text-red-700 font-extrabold px-1.5 py-0.2 rounded">Expired</span>
                              ) : isEligible ? (
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded">Eligible</span>
                              ) : (
                                <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.2 rounded">
                                  {`Min ₹${c.min_order_value}`}
                                </span>
                              )}
                            </div>
                            <div className="font-bold text-xs text-gray-900 mt-1">
                              {c.description || `${c.discount_value}${c.discount_type === 'PERCENTAGE' ? '% OFF' : ' OFF'}`}
                            </div>
                            {Number(c.min_order_value) > 0 && (
                              <div className="text-[10px] text-gray-500 mt-0.5">
                                {`Valid on orders above ₹${c.min_order_value}`}
                              </div>
                            )}
                            {!isEligible && shortfall > 0 && !c.is_expired && (
                              <div className="text-[10px] text-amber-700 font-bold mt-1">
                                {`Add ₹${shortfall} more to unlock this discount`}
                              </div>
                            )}
                          </div>

                          <div className="shrink-0 ml-2">
                            {isAlreadyApplied ? (
                              <span className="text-xs font-black text-emerald-700 flex items-center gap-1">
                                <i className="fa-solid fa-check"></i> Applied
                              </span>
                            ) : isEligible ? (
                              <button
                                type="button"
                                onClick={() => handleQuickCoupon(c.code)}
                                disabled={applyingCoupon || loading}
                                className="coral-btn !py-1.5 !px-3 !text-[11px] cursor-pointer"
                              >
                                Apply
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleQuickCoupon(c.code)}
                                disabled={applyingCoupon || loading}
                                className="text-[11px] font-bold text-gray-400 bg-gray-100 border border-gray-200 px-2.5 py-1.5 rounded-xl cursor-not-allowed"
                                title={`Requires min order of ₹${c.min_order_value}`}
                              >
                                Apply
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2.6 Delivery Address Preview Strip */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 flex gap-3 items-center shadow-sm relative">
        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 text-lg shadow-2xs">
          <i className="fa-solid fa-location-dot"></i>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs text-gray-900">
              {`Delivering to ${selectedAddress.type}`}
            </span>
            {selectedAddress.is_verified && (
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200">
                <i className="fa-solid fa-check text-[8px] mr-0.5"></i> Verified
              </span>
            )}
          </div>
          <div className="text-[11px] text-gray-500 truncate mt-0.5">
            {selectedAddress.full_address}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (onChangeAddress) onChangeAddress();
            else setShowAddressPicker(!showAddressPicker);
          }}
          className="text-emerald-700 text-xs font-bold hover:underline shrink-0 p-1 cursor-pointer"
        >
          Change
        </button>
      </div>

      {/* Inline Address Switcher Dropdown (when Change is clicked) */}
      {showAddressPicker && (
        <div className="bg-white rounded-2xl p-3 border border-emerald-200 shadow-md space-y-2 -mt-2">
          <div className="flex items-center justify-between px-1">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Choose Delivery Location
            </div>
            {onChangeAddress && (
              <button
                type="button"
                onClick={onChangeAddress}
                className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                + Add / Manage
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {(addressList.length > 0 ? addressList : [selectedAddress]).map((addr) => (
              <button
                key={addr.id}
                type="button"
                onClick={() => {
                  setSelectedAddressId(addr.id);
                  if (onSelectAddress && addr.raw) {
                    onSelectAddress(addr.raw);
                  }
                  setShowAddressPicker(false);
                }}
                className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                  selectedAddress.id === addr.id
                    ? 'border-brand-green bg-emerald-50/60'
                    : 'border-gray-100 hover:bg-gray-50'
                }`}
              >
                <div>
                  <div className="font-extrabold text-xs text-gray-900 flex items-center gap-1.5">
                    <span>{addr.type}</span>
                    {addr.is_verified && (
                      <span className="text-[9px] text-emerald-700 font-bold">✓ Verified</span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate">{addr.full_address}</div>
                </div>
                {selectedAddress.id === addr.id && (
                  <i className="fa-solid fa-circle-check text-emerald-600 text-sm"></i>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2.7 Proceed to Checkout Action CTA (with Pre-Checkout Validation) */}
      <button
        type="button"
        id="cartCheckoutBtn"
        onClick={handleCheckoutClick}
        disabled={loading || isValidating || hasOutOfStockIssue}
        className={`green-btn text-sm font-extrabold py-4 shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition ${
          hasOutOfStockIssue ? '!bg-gray-400 !cursor-not-allowed !shadow-none' : ''
        }`}
      >
        {isValidating ? (
          <>
            <i className="fa-solid fa-circle-notch fa-spin"></i>
            <span>Validating Stock & Prices...</span>
          </>
        ) : hasOutOfStockIssue ? (
          <>
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span>Remove Out-of-Stock Items to Checkout</span>
          </>
        ) : (
          <>
            <span>Proceed to Checkout</span>
            <i className="fa-solid fa-arrow-right"></i>
          </>
        )}
      </button>
      </div>
    </section>
  );
}
