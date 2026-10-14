import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sellerApi } from '../api/sellerApi';

export default function BuyCartPage() {
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [creditInfo, setCreditInfo] = useState({ available_amount: 0, total_limit: 0, utilized_amount: 0 });
  const [loadingCredit, setLoadingCredit] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('shop-credit');
  const [deliveryMethod, setDeliveryMethod] = useState('porter');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const loadCart = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('adab_buy_cart') || '[]');
      setCartItems(Array.isArray(saved) ? saved : []);
    } catch (e) {
      console.error('Failed to parse cart:', e);
      setCartItems([]);
    }
  };

  const loadCredit = async () => {
    try {
      setLoadingCredit(true);
      const res = await sellerApi.getBuyerCreditBalance();
      const raw = res?.data !== undefined ? res.data : res;
      const data = raw?.data || raw || {};
      setCreditInfo({
        available_amount: Number(data.available_amount || 0),
        total_limit: Number(data.total_limit || 0),
        utilized_amount: Number(data.utilized_amount || 0)
      });
    } catch (e) {
      console.error('Failed to load credit balance:', e);
      setCreditInfo({ available_amount: 0, total_limit: 0, utilized_amount: 0 });
    } finally {
      setLoadingCredit(false);
    }
  };

  useEffect(() => {
    loadCart();
    loadCredit();

    const handleSync = () => loadCart();
    window.addEventListener('adab-cart-updated', handleSync);
    return () => window.removeEventListener('adab-cart-updated', handleSync);
  }, []);

  const saveCart = (items) => {
    setCartItems(items);
    localStorage.setItem('adab_buy_cart', JSON.stringify(items));
    window.dispatchEvent(new Event('adab-cart-updated'));
  };

  const updateQuantity = (id, delta) => {
    const updated = cartItems.map((item) => {
      if (item.id === id) {
        const minOrder = Number(item.min_order || 1);
        const newQty = (item.quantity || minOrder) + delta;
        if (newQty < minOrder) {
          showToast(`Minimum order quantity for ${item.name} is ${minOrder} ${item.unit || 'units'}`);
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    });
    saveCart(updated);
  };

  const removeItem = (id, name) => {
    const updated = cartItems.filter((i) => i.id !== id);
    saveCart(updated);
    showToast(`Removed ${name || 'item'} from cart`);
  };

  const clearCart = () => {
    if (window.confirm('Are you sure you want to clear your entire purchase cart?')) {
      saveCart([]);
      showToast('Purchase cart cleared');
    }
  };

  // Calculations
  const totalItemCount = cartItems.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0);
  const subtotal = cartItems.reduce((acc, i) => acc + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);

  // Group items by supplier store
  const groupedStores = cartItems.reduce((acc, item) => {
    const sId = item.store_id || 'unknown';
    if (!acc[sId]) {
      acc[sId] = {
        store_id: sId,
        store_name: item.store_name || 'Partner Wholesale Store',
        distance_km: item.distance_km || 3,
        items: []
      };
    }
    acc[sId].items.push(item);
    return acc;
  }, {});

  const supplierCount = Object.keys(groupedStores).length;

  // Delivery fee calculation
  const deliveryFee = deliveryMethod === 'pickup' ? 0 : deliveryMethod === 'express' ? 49 : 99;
  const grandTotal = subtotal + (cartItems.length > 0 ? deliveryFee : 0);

  // Credit availability check
  const hasEnoughCredit = creditInfo.available_amount >= grandTotal && grandTotal > 0;

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      alert('Your purchase cart is empty.');
      return;
    }
    if (!agreeTerms) {
      alert('Please accept seller credit terms and delivery charges to proceed.');
      return;
    }
    if ((paymentMethod === 'shop-credit' || paymentMethod === 'adab-credit') && !hasEnoughCredit) {
      alert(`Insufficient credit balance (₹${creditInfo.available_amount.toLocaleString('en-IN')} available, order total is ₹${grandTotal.toLocaleString('en-IN')}). Please select UPI or Instant Bank Transfer, or apply for a higher credit limit.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        items: cartItems.map((item) => ({
          id: item.id,
          store_id: item.store_id,
          name: item.name,
          quantity: Number(item.quantity || 1),
          price: Number(item.price || 0),
          unit: item.unit
        })),
        payment_terms: paymentMethod === 'upi' ? 'UPI_INSTANT' : 'CREDIT_14D',
        delivery_method: deliveryMethod,
        delivery_fee: deliveryFee
      };

      const res = await sellerApi.createPurchaseOrder(payload);
      const orders = Array.isArray(res?.data) ? res.data : (res?.data?.data ? res.data.data : [res?.data || {}]);

      // Clear local cart
      saveCart([]);
      setOrderSuccess({
        count: orders.length,
        orders: orders,
        total: grandTotal,
        paymentTerms: paymentMethod === 'upi' ? 'UPI Instant Pay' : '14 Days Net Credit'
      });
      showToast('Purchase Order placed successfully with partner stores!');
    } catch (err) {
      console.error('Order placement failed:', err);
      alert(err.response?.data?.error || err.message || 'Failed to place purchase order. Please check your network and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="sec-buycart" className="space-y-5 fade-in max-w-6xl mx-auto pb-10">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-gray-950 text-white px-4 py-2.5 rounded-xl shadow-2xl text-sm font-semibold flex items-center gap-2 animate-bounce border border-gray-700">
          <i className="fa-solid fa-circle-check text-emerald-400"></i>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/buy" className="text-gray-400 hover:text-emerald-700 transition text-sm">
              <i className="fa-solid fa-arrow-left mr-1"></i> Nearby Kiranas
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-bold text-gray-700">Purchase Cart</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-1 flex items-center gap-2">
            <span>B2B Wholesale Purchase Cart</span>
            {cartItems.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-black">
                {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Review items from local suppliers, choose logistics &amp; pay via 14-day credit line or instant UPI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/buy"
            className="btn-soft !text-xs !py-2 !px-3 font-bold flex items-center gap-1.5"
          >
            <i className="fa-solid fa-plus text-emerald-600"></i> Add More Items
          </Link>
          {cartItems.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1.5 rounded-lg hover:bg-rose-50 transition"
            >
              Clear Cart
            </button>
          )}
        </div>
      </div>

      {/* ORDER SUCCESS MODAL */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-scale-up text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-3xl shadow-inner">
              <i className="fa-solid fa-check"></i>
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Purchase Order Confirmed!</h2>
              <p className="text-sm text-gray-500 mt-1">
                Your B2B restock order of <strong className="text-gray-800">₹{orderSuccess.total.toLocaleString('en-IN')}</strong> has been placed and transmitted to the partner suppliers.
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl text-left border border-gray-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Payment Terms:</span>
                <span className="font-bold text-gray-900">{orderSuccess.paymentTerms}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Orders Generated:</span>
                <span className="font-bold text-emerald-700">{orderSuccess.count} supplier PO(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Delivery Status:</span>
                <span className="font-bold text-blue-700">Dispatch Pending (Local Logistics)</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => navigate('/buy')}
                className="btn-primary flex-1 !py-2.5 !text-xs font-bold"
              >
                <i className="fa-solid fa-receipt mr-1.5"></i> View in "My Purchase Orders"
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrderSuccess(null);
                  navigate('/buy');
                }}
                className="btn-soft flex-1 !py-2.5 !text-xs font-bold"
              >
                Continue Restocking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Cart Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Items */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.length === 0 ? (
            /* EMPTY CART STATE */
            <div className="card p-12 text-center text-gray-500 space-y-4 border-dashed border-2 border-gray-200">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-3xl">
                <i className="fa-solid fa-cart-shopping"></i>
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-gray-900">Your Purchase Cart is Empty</h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-md mx-auto">
                  Browse products from registered nearby kirana stores to restock inventory with 14-day credit terms.
                </p>
              </div>
              <div className="flex gap-2 justify-center pt-2 flex-wrap">
                <Link to="/buy" className="btn-primary !text-xs !py-2.5 !px-5 font-bold flex items-center gap-1.5">
                  <i className="fa-solid fa-map-location-dot"></i> Browse Nearby Kiranas
                </Link>
                <Link to="/mastersearch" className="btn-soft !text-xs !py-2.5 !px-5 font-bold flex items-center gap-1.5">
                  <i className="fa-solid fa-magnifying-glass"></i> National FMCG Search &amp; Buy
                </Link>
              </div>
            </div>
          ) : (
            /* ITEMS GROUPED BY SUPPLIER STORE */
            <div className="space-y-5">
              {Object.values(groupedStores).map((grp) => (
                <div key={grp.store_id} className="card p-4 sm:p-5 space-y-3 border border-gray-200 shadow-sm">
                  {/* Supplier Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs">
                        <i className="fa-solid fa-store"></i>
                      </span>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{grp.store_name}</div>
                        <div className="text-[11px] text-gray-500">
                          Verified Local Merchant · {grp.distance_km || 3} km away
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 self-start sm:self-auto">
                      14 Days Net Credit Eligible
                    </span>
                  </div>

                  {/* Items list for this supplier */}
                  <div className="divide-y divide-gray-100">
                    {grp.items.map((item) => {
                      const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
                      const minOrder = Number(item.min_order || 1);

                      return (
                        <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-12 h-12 rounded-xl object-contain bg-gray-50 border border-gray-200 p-1 shrink-0"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 shrink-0 text-base">
                                <i className="fa-solid fa-box-open"></i>
                              </div>
                            )}
                            <div className="space-y-1">
                              <div className="font-extrabold text-gray-900 text-sm sm:text-base">{item.name}</div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                              <span className="font-bold text-emerald-700">
                                ₹{Number(item.price || 0).toLocaleString('en-IN')}
                              </span>
                              <span>/ {item.unit || 'unit'}</span>
                              {item.mrp && Number(item.mrp) > Number(item.price) && (
                                <span className="line-through text-gray-400">
                                  MRP ₹{Number(item.mrp).toLocaleString('en-IN')}
                                </span>
                              )}
                              {minOrder > 1 && (
                                <span className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] text-gray-600 font-semibold">
                                  MOQ: {minOrder}
                                </span>
                              )}
                            </div>
                          </div>
                          </div>

                          {/* Quantity selector & Line Total */}
                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                            <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, -1)}
                                className="px-3 py-1 text-gray-600 hover:bg-gray-200 transition text-sm font-bold"
                                title="Decrease quantity"
                              >
                                -
                              </button>
                              <span className="px-3 py-1 font-black text-sm text-gray-900 min-w-[32px] text-center bg-white">
                                {item.quantity || minOrder}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, 1)}
                                className="px-3 py-1 text-gray-600 hover:bg-gray-200 transition text-sm font-bold"
                                title="Increase quantity"
                              >
                                +
                              </button>
                            </div>

                            <div className="text-right min-w-[80px]">
                              <div className="font-black text-gray-900 text-sm sm:text-base">
                                ₹{itemTotal.toLocaleString('en-IN')}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeItem(item.id, item.name)}
                                className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold"
                              >
                                <i className="fa-solid fa-trash-can mr-1"></i> Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Checkout Summary Card */}
        <div className="space-y-4">
          <div className="card p-5 border-2 border-emerald-200 sticky top-20 shadow-md space-y-4 bg-white">
            <h3 className="font-black text-lg text-gray-900 flex items-center justify-between">
              <span>Order Summary</span>
              <span className="text-xs font-bold text-gray-400">
                {supplierCount} {supplierCount === 1 ? 'Supplier' : 'Suppliers'}
              </span>
            </h3>

            {cartItems.length === 0 ? (
              <div className="text-xs text-gray-500 py-4 text-center">
                Add products from nearby stores to view order summary and delivery rates.
              </div>
            ) : (
              <div className="space-y-3.5 text-xs sm:text-sm">
                {/* Cost Breakdown */}
                <div className="space-y-2 border-b border-gray-100 pb-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Total Units:</span>
                    <span className="font-bold text-gray-900">{totalItemCount}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Items Subtotal:</span>
                    <span className="font-bold text-gray-900">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery Charges:</span>
                    <span className="font-bold text-gray-900">
                      {deliveryFee === 0 ? <span className="text-emerald-700 font-black">FREE (Pickup)</span> : `₹${deliveryFee}`}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-black text-gray-900">
                    <span>Grand Total:</span>
                    <span className="text-emerald-700 text-lg">₹{grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Real Live Database Credit Balance Badge */}
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-950 space-y-1.5">
                  <div className="flex items-center justify-between font-extrabold">
                    <span className="flex items-center gap-1.5">
                      <i className="fa-solid fa-building-columns text-purple-700"></i>
                      <span>Live Restock Credit:</span>
                    </span>
                    <span className="text-purple-900 text-sm">
                      {loadingCredit ? (
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                      ) : (
                        `₹${creditInfo.available_amount.toLocaleString('en-IN')}`
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px] text-purple-700">
                    <span>Total Limit Approved:</span>
                    <span className="font-semibold">₹{creditInfo.total_limit.toLocaleString('en-IN')}</span>
                  </div>

                  {creditInfo.available_amount < grandTotal ? (
                    <div className="pt-1 text-[11px] text-amber-800 font-bold flex items-center justify-between">
                      <span>Credit insufficient for this order</span>
                      <Link to="/credit-apply" className="underline text-purple-900 hover:text-black">
                        Apply Higher →
                      </Link>
                    </div>
                  ) : (
                    <div className="pt-1 text-[11px] text-emerald-800 font-bold flex items-center gap-1">
                      <i className="fa-solid fa-circle-check"></i> Eligible for 14-day zero interest net credit
                    </div>
                  )}
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 block">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm font-semibold outline-none focus:border-emerald-500 bg-white"
                  >
                    <option value="shop-credit">Shop Credit (Pay Supplier in 14 Days)</option>
                    <option value="adab-credit">ADAB Credit Line (Pay ADAB in 14 Days)</option>
                    <option value="upi">Instant UPI / Bank Transfer Now</option>
                  </select>
                </div>

                {/* Delivery Logistics Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 block">Logistics &amp; Delivery</label>
                  <select
                    value={deliveryMethod}
                    onChange={(e) => setDeliveryMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm font-medium outline-none focus:border-emerald-500 bg-white"
                  >
                    <option value="porter">Porter Logistics 3-Wheeler Truck (₹99)</option>
                    <option value="express">Local Express Bike / Van (₹49)</option>
                    <option value="pickup">Self-Pickup at Supplier Store (₹0)</option>
                  </select>
                </div>

                {/* Terms checkbox */}
                <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>I agree to supplier restock terms, 14-day credit schedule, and logistics delivery terms.</span>
                </label>

                {/* Proceed Checkout Button */}
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting || cartItems.length === 0}
                  className="btn-primary w-full !py-3 !text-sm font-black shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin"></i>
                      <span>Transmitting Purchase Order...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-lock"></i>
                      <span>Place Purchase Order ({paymentMethod === 'upi' ? 'UPI' : 'Credit'}) →</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
