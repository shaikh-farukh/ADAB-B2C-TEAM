import React, { useState } from 'react';

/**
 * Checkout Screen Component (sec-checkout)
 * Matches unified-customer-portal-demo.html
 */
export default function CheckoutView({
  cartData = { items: [], summary: {} },
  onPlaceOrder,
  onBackToCart,
  loading = false
}) {
  const [deliverySpeed, setDeliverySpeed] = useState('fast'); // 'fast', 'same', 'pickup'
  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi', 'card', 'cod', 'wallet', 'bnpl'
  const [address, setAddress] = useState({
    full_name: 'Pooja Sharma',
    phone: '+91 98765 12340',
    address_line: 'Flat 402, Green Valley Apt, Ring Road',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395002'
  });
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const items = cartData.items || [];
  const summary = cartData.summary || {};

  // Calculate dynamic delivery fee based on selected speed
  let fee = 29;
  if (deliverySpeed === 'same') fee = 19;
  if (deliverySpeed === 'pickup') fee = 0;
  if ((summary.subtotal || 0) >= 499 && deliverySpeed !== 'pickup') fee = 0;

  const discount = summary.discount || 0;
  const subtotal = summary.subtotal || 0;
  const totalPayable = Math.max(0, subtotal + fee - discount);
  const pointsEarned = Math.floor(totalPayable / 100);

  // Map internal speeds to backend DB constraints
  const getBackendDeliverySpeed = () => {
    if (deliverySpeed === 'same') return 'SAME_DAY';
    if (deliverySpeed === 'pickup') return 'STORE_PICKUP';
    return 'EXPRESS_30M';
  };

  // Map internal payment methods to backend DB constraints
  const getBackendPaymentMethod = () => {
    if (paymentMethod === 'cod') return 'CASH_ON_DELIVERY';
    if (paymentMethod === 'card') return 'CARD';
    if (paymentMethod === 'wallet') return 'WALLET';
    if (paymentMethod === 'bnpl') return 'ADAB_PAY_LATER';
    return 'UPI';
  };

  const handlePlaceOrderSubmit = async () => {
    if (items.length === 0) {
      setErrorMessage('Your cart is empty. Add items before placing an order.');
      return;
    }

    if (!address.address_line.trim()) {
      setErrorMessage('Please provide a valid delivery address.');
      return;
    }

    setErrorMessage(null);
    try {
      await onPlaceOrder({
        cart_id: cartData.cart ? cartData.cart.id : undefined,
        customer_name: address.full_name,
        customer_phone: address.phone,
        delivery_address: address,
        delivery_speed: getBackendDeliverySpeed(),
        payment_method: getBackendPaymentMethod(),
        coupon_code: summary.coupon_code || null
      });
    } catch (err) {
      setErrorMessage(err.message || 'Failed to place order. Please try again.');
    }
  };

  return (
    <div id="sec-checkout" className="space-y-4">
      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-2">
          <i className="fa-solid fa-triangle-exclamation text-base shrink-0"></i>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Address Card */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
          <div className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
            <i className="fa-solid fa-location-dot text-brand-coral"></i>
            <span>Delivery Destination</span>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingAddress(!isEditingAddress)}
            className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
          >
            {isEditingAddress ? 'Done' : 'Change'}
          </button>
        </div>

        {isEditingAddress ? (
          <div className="space-y-2 pt-1 text-xs">
            <div>
              <label className="font-bold text-gray-600 block mb-1">Recipient Name</label>
              <input
                type="text"
                value={address.full_name}
                onChange={(e) => setAddress({ ...address, full_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-gray-600 block mb-1">Phone Number</label>
              <input
                type="text"
                value={address.phone}
                onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-gray-600 block mb-1">Street Address</label>
              <input
                type="text"
                value={address.address_line}
                onChange={(e) => setAddress({ ...address, address_line: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-gray-600 block mb-1">City</label>
                <input
                  type="text"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-gray-600 block mb-1">Pincode</label>
                <input
                  type="text"
                  value={address.pincode}
                  onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 pt-1">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-brand-coral flex items-center justify-center text-lg shrink-0">
              <i className="fa-solid fa-house"></i>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-sm text-gray-900">{address.full_name} · Home</div>
              <div className="text-xs text-gray-500 mt-0.5">{address.address_line}, {address.city} {address.pincode}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{address.phone}</div>
            </div>
          </div>
        )}
      </div>

      {/* Step 1: Choose Delivery Speed */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
        <div className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">
            1
          </span>
          Choose Delivery Speed
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Fast Express */}
          <button
            type="button"
            onClick={() => setDeliverySpeed('fast')}
            className={`p-3.5 rounded-2xl text-left flex justify-between items-center transition cursor-pointer ${
              deliverySpeed === 'fast'
                ? 'border-2 border-brand-green bg-green-50 shadow-sm'
                : 'border border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div>
              <div className="font-extrabold text-xs text-gray-900 flex items-center">
                <i className="fa-solid fa-bolt text-amber-500 mr-1.5"></i>
                Express (14–30 min)
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">Dispatched instantly by store rider</div>
            </div>
            <span className="font-extrabold text-xs text-emerald-800">₹29</span>
          </button>

          {/* Same Day */}
          <button
            type="button"
            onClick={() => setDeliverySpeed('same')}
            className={`p-3.5 rounded-2xl text-left flex justify-between items-center transition cursor-pointer ${
              deliverySpeed === 'same'
                ? 'border-2 border-brand-green bg-green-50 shadow-sm'
                : 'border border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div>
              <div className="font-extrabold text-xs text-gray-900 flex items-center">
                <i className="fa-solid fa-clock text-blue-500 mr-1.5"></i>
                Same Day (by 8 PM)
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">Flexible batch slot</div>
            </div>
            <span className="font-extrabold text-xs text-gray-700">₹19</span>
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
              <div className="text-[11px] text-gray-500 mt-0.5">Ready in 10 mins · Zero queue at counter</div>
            </div>
            <span className="font-extrabold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              FREE
            </span>
          </button>
        </div>
      </div>

      {/* Step 2: Payment Method */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
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
            <span>Delivery Fee</span>
            <span className="font-bold text-gray-900">
              {fee === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : `₹${fee}`}
            </span>
          </div>
          {discount > 0 && (
            <div className="bill-row text-emerald-700">
              <span>Coupon Discount</span>
              <span className="font-bold">-₹{discount}</span>
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

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handlePlaceOrderSubmit}
          disabled={loading || items.length === 0}
          className="green-btn text-base font-extrabold py-4 shadow-xl flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
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
    </div>
  );
}
