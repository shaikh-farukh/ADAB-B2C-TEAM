import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sellerApi } from '../api/sellerApi';
import useRestockCart from '../hooks/useRestockCart';
import { useTranslation } from '../context/LanguageContext';

export default function CatalogCheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { cart, updateCases, removeFromCart, clearCart, totalCartons, totalAmount, totalProfit } = useRestockCart();

  // Store context & address state
  const [storeInfo, setStoreInfo] = useState({
    store_name: 'Shabbir Kirana Store',
    address_line: 'Shop 14, APMC Market Yard, Ring Road',
    city: 'Surat',
    pincode: '400001',
    phone: '+91 98765 43210'
  });
  const [driverNotes, setDriverNotes] = useState('');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editAddressLine, setEditAddressLine] = useState('');

  // Payment Selection
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // 'CASH' | 'UPI' | 'CREDIT'
  const [creditBalance, setCreditBalance] = useState({ available_amount: 50000, total_limit: 50000 });
  const [loadingCredit, setLoadingCredit] = useState(false);

  // Submission & Confirmation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderPlacedData, setOrderPlacedData] = useState(null);

  useEffect(() => {
    // Fetch logged in store profile & credit balance
    const loadProfileAndCredit = async () => {
      try {
        setLoadingCredit(true);
        const [profileRes, creditRes] = await Promise.allSettled([
          sellerApi.getProfile?.(),
          sellerApi.getBuyerCreditBalance?.()
        ]);

        if (profileRes.status === 'fulfilled' && profileRes.value?.data) {
          const s = profileRes.value.data.store || profileRes.value.data;
          if (s) {
            setStoreInfo({
              store_name: s.store_name || 'My Kirana Store',
              address_line: s.address_line || s.address || 'Main Road Kirana Store',
              city: s.city || 'Surat',
              pincode: s.pincode || '400001',
              phone: s.phone || '+91 98765 43210'
            });
            setEditAddressLine(s.address_line || s.address || '');
          }
        }

        if (creditRes.status === 'fulfilled' && creditRes.value?.data) {
          const raw = creditRes.value.data?.data || creditRes.value.data || {};
          setCreditBalance({
            available_amount: Number(raw.available_amount || 50000),
            total_limit: Number(raw.total_limit || 50000)
          });
        }
      } catch (err) {
        console.warn('Failed to load profile/credit:', err);
      } finally {
        setLoadingCredit(false);
      }
    };

    loadProfileAndCredit();
  }, []);

  const totalRetailValue = totalAmount + totalProfit;
  const overallMarginPct = totalRetailValue > 0 ? ((totalProfit / totalRetailValue) * 100).toFixed(1) : '20.0';

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setOrderError('');

    try {
      const itemsPayload = cart.map((item) => ({
        masterCatalogId: item.id,
        orderedCases: item.orderedCases || 1
      }));

      const deliveryAddress = isEditingAddress && editAddressLine.trim()
        ? `${storeInfo.store_name}, ${editAddressLine.trim()}, Pincode: ${storeInfo.pincode}`
        : `${storeInfo.store_name}, ${storeInfo.address_line}, Pincode: ${storeInfo.pincode}`;

      const res = await sellerApi.bulkOrderRestockCases({
        items: itemsPayload,
        notes: driverNotes.trim() || 'Wholesale restock order via Amazon B2B Checkout',
        paymentMethod,
        deliveryAddress
      });

      const orderData = res?.data?.data || res?.data;
      if (res?.success || res?.data?.success || orderData) {
        setOrderPlacedData(orderData);
        clearCart();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setOrderError(res?.message || 'Failed to place wholesale order. Please try again.');
      }
    } catch (err) {
      console.error('Order placement error:', err);
      setOrderError(err.response?.data?.message || err.message || 'Error communicating with distributor server');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS SCREEN (Flipkart / Amazon Order Confirmed Style)
  if (orderPlacedData) {
    const firstOrder = orderPlacedData.orders?.[0] || orderPlacedData;
    const poNum = firstOrder.po_number || `PO-${firstOrder.order_number || 'B2B-ORD'}`;
    const distName = firstOrder.assigned_distributor || 'Apex City Stockists';

    return (
      <section className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in duration-300">
        <div className="card p-8 md:p-12 text-center bg-white border border-gray-200 shadow-xl rounded-3xl space-y-6">
          
          {/* Animated Success Badge */}
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-4xl mx-auto shadow-inner animate-in zoom-in-75 duration-300">
            <i className="fa-solid fa-check"></i>
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              Order Confirmed & Routed
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
              Wholesale Restock Order Placed!
            </h1>
            <p className="text-sm text-gray-500 max-w-lg mx-auto">
              Your wholesale purchase order has been logged, assigned to the local distributor delivery van, and synced to your POS.
            </p>
          </div>

          {/* Key Order Details Box */}
          <div className="p-5 bg-gradient-to-br from-slate-50 to-indigo-50/40 rounded-2xl border border-indigo-100 text-left max-w-lg mx-auto space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
              <span className="text-gray-500 font-medium">B2B Purchase Order No:</span>
              <span className="font-mono font-black text-indigo-700 text-sm">{poNum}</span>
            </div>

            <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
              <span className="text-gray-500 font-medium">Assigned Distributor:</span>
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                <i className="fa-solid fa-truck-fast text-indigo-600"></i>
                {distName}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
              <span className="text-gray-500 font-medium">Delivery SLA:</span>
              <span className="font-bold text-emerald-700">Tomorrow by 11:00 AM (Doorstep Van)</span>
            </div>

            <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
              <span className="text-gray-500 font-medium">Payment Mode:</span>
              <span className="font-bold text-gray-800">
                {paymentMethod === 'CASH' && '💵 Cash on Delivery (Pay to Van Driver)'}
                {paymentMethod === 'UPI' && '⚡ Instant UPI / Online Paid'}
                {paymentMethod === 'CREDIT' && '📑 14-Day Kirana Trade Credit (Khata)'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-gray-700 font-bold">Total Wholesale Bill:</span>
              <span className="font-black text-base text-gray-950">
                ₹{Number(orderPlacedData.total_amount || totalAmount).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Auto-POS Sync Confirmation Banner */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-left max-w-lg mx-auto flex items-start gap-3">
            <i className="fa-solid fa-barcode text-emerald-600 text-xl shrink-0 mt-0.5"></i>
            <div className="text-xs space-y-0.5">
              <div className="font-bold text-emerald-900">
                Auto-Synced to Your Store Inventory & POS!
              </div>
              <p className="text-emerald-700 text-[11px] leading-relaxed">
                The ordered quantities have been added to your store catalog. You can scan their EAN barcodes at the billing counter immediately.
              </p>
            </div>
          </div>

          {/* Action Navigation Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <Link
              to="/partner"
              className="w-full sm:w-auto btn-primary !py-3 !px-6 text-xs font-black shadow-md flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-store"></i>
              <span>Track in B2B Store Orders</span>
            </Link>

            <Link
              to="/products"
              className="w-full sm:w-auto btn-soft !py-3 !px-6 text-xs font-bold flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-boxes-stacked"></i>
              <span>View in My Products & POS</span>
            </Link>

            <Link
              to="/catalog"
              className="w-full sm:w-auto text-xs font-bold text-gray-600 hover:text-indigo-600 py-2 transition"
            >
              Continue FMCG Shopping
            </Link>
          </div>

        </div>
      </section>
    );
  }

  // EMPTY CART SCREEN
  if (cart.length === 0) {
    return (
      <section className="max-w-3xl mx-auto py-16 px-4 text-center">
        <div className="card p-12 space-y-4 bg-white border border-gray-200 rounded-3xl shadow-sm">
          <div className="w-20 h-20 rounded-3xl bg-indigo-50 text-indigo-500 flex items-center justify-center text-3xl mx-auto">
            <i className="fa-solid fa-cart-shopping"></i>
          </div>
          <h2 className="text-xl font-black text-gray-900">Your FMCG Wholesale Cart is Empty</h2>
          <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
            Browse our national brand catalog to order wholesale cartons with authorized distributor doorstep delivery.
          </p>
          <div className="pt-4">
            <Link
              to="/catalog"
              className="btn-primary !py-3 !px-8 text-xs font-black inline-flex items-center gap-2 shadow-md"
            >
              <i className="fa-solid fa-arrow-left"></i>
              <span>Explore FMCG Master Catalog</span>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // MAIN AMAZON / FLIPKART STYLE CHECKOUT PAGE
  return (
    <section className="space-y-6 pb-24 max-w-7xl mx-auto animate-in fade-in duration-200">
      
      {/* Checkout Header & Stepper */}
      <div className="card p-5 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-lg font-black shadow-xs">
              <i className="fa-solid fa-lock"></i>
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <span>Wholesale Checkout</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {totalCartons} {totalCartons === 1 ? 'Carton' : 'Cartons'}
                </span>
              </h1>
              <p className="text-xs text-gray-500">
                Authorized National FMCG Sourcing • Direct Local Stockist Van Fulfillment
              </p>
            </div>
          </div>

          <Link
            to="/catalog"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 self-start sm:self-auto"
          >
            <i className="fa-solid fa-arrow-left text-[10px]"></i> Continue Browsing Catalog
          </Link>
        </div>

        {/* Amazon-Style 4-Step Stepper */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-xs">
          <div className="flex items-center gap-2 text-indigo-700 font-bold">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
            <span>Store Address</span>
          </div>
          <div className="flex items-center gap-2 text-indigo-700 font-bold">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
            <span>Cartons Review</span>
          </div>
          <div className="flex items-center gap-2 text-indigo-700 font-bold">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</span>
            <span>Payment Mode</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 font-medium">
            <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px]">4</span>
            <span>Confirm & Route</span>
          </div>
        </div>
      </div>

      {orderError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2.5">
          <i className="fa-solid fa-circle-exclamation text-base shrink-0"></i>
          <span>{orderError}</span>
        </div>
      )}

      {/* Main Grid: 8 Cols for Steps, 4 Cols for Sticky Order Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (8 cols): Checkout Steps */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* STEP 1: DELIVERY ADDRESS */}
          <div className="card p-5 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">
                  1
                </span>
                <h2 className="text-sm font-extrabold text-gray-900">
                  Store Delivery Address & Pincode
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingAddress(!isEditingAddress)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
              >
                {isEditingAddress ? 'Done Editing' : 'Change Address'}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-gray-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-gray-900 text-sm flex items-center gap-1.5">
                  <i className="fa-solid fa-shop text-indigo-600"></i>
                  {storeInfo.store_name}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Verified Merchant Location
                </span>
              </div>

              {isEditingAddress ? (
                <div className="pt-2 space-y-2">
                  <label className="block text-[11px] font-bold text-gray-600">
                    Update Delivery Street Address / Landmark:
                  </label>
                  <input
                    type="text"
                    value={editAddressLine}
                    onChange={(e) => setEditAddressLine(e.target.value)}
                    placeholder="Shop No, Street, Landmark..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:border-indigo-500 outline-none bg-white"
                  />
                </div>
              ) : (
                <p className="text-gray-600 leading-relaxed">
                  {storeInfo.address_line}, {storeInfo.city} — <strong>Pincode: {storeInfo.pincode}</strong>
                </p>
              )}

              <div className="flex items-center gap-4 text-gray-500 pt-1 border-t border-gray-200/60">
                <span>📞 Phone: <strong className="text-gray-700">{storeInfo.phone}</strong></span>
                <span>🚚 Fulfilled by: <strong className="text-indigo-700">Apex City Stockists Delivery Van</strong></span>
              </div>
            </div>
          </div>

          {/* STEP 2: REVIEW CART ITEMS & CARTONS */}
          <div className="card p-5 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">
                  2
                </span>
                <h2 className="text-sm font-extrabold text-gray-900">
                  Review Shipper Cartons & Items ({cart.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-red-500 hover:text-red-700 font-semibold cursor-pointer"
              >
                Clear Cart
              </button>
            </div>

            <div className="divide-y divide-gray-100">
              {cart.map((item) => {
                const cases = item.orderedCases || 1;
                const casePrice = item.case_wholesale_price || 0;
                const lineWholesale = cases * casePrice;
                const lineProfit = cases * (item.profit_per_case || 0);
                const totalUnits = cases * (item.case_size || 1);

                return (
                  <div key={item.id} className="py-4 flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-16 h-16 rounded-xl bg-slate-50 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden p-1">
                        {item.default_image_url ? (
                          <img
                            src={item.default_image_url}
                            alt={item.product_name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <i className="fa-solid fa-box text-gray-300 text-2xl"></i>
                        )}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {item.brand_name}
                        </span>
                        <h3 className="font-bold text-xs sm:text-sm text-gray-900 leading-snug">
                          {item.product_name}
                        </h3>
                        <div className="text-[11px] text-gray-500 font-mono">
                          <span>{item.barcode ? `EAN: ${item.barcode}` : 'GTIN Item'}</span>
                          <span className="mx-1">•</span>
                          <span className="text-gray-700 font-sans font-medium">
                            Box of {item.case_size} {item.standard_unit || 'packs'}
                          </span>
                        </div>
                        <div className="text-[11px] text-emerald-700 font-bold">
                          Retail Margin: +₹{(item.profit_per_case || 0).toFixed(2)} / carton
                        </div>
                      </div>
                    </div>

                    {/* Stepper & Line Price */}
                    <div className="flex items-center sm:flex-col items-end justify-between w-full sm:w-auto gap-2">
                      <div className="text-right">
                        <div className="font-black text-sm text-gray-900">
                          ₹{lineWholesale.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          (₹{casePrice.toFixed(2)} / carton)
                        </div>
                      </div>

                      {/* Carton Stepper */}
                      <div className="flex items-center border border-gray-200 rounded-xl bg-slate-50 p-0.5">
                        <button
                          type="button"
                          onClick={() => updateCases(item.id, cases - 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 flex items-center justify-center text-xs font-bold transition cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-12 text-center text-xs font-black text-gray-900">
                          {cases} ctn
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCases(item.id, cases + 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 flex items-center justify-center text-xs font-bold transition cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-[11px] text-gray-400 hover:text-red-600 transition cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 3: PAYMENT METHOD (AMAZON / FLIPKART STYLE RADIO CARDS) */}
          <div className="card p-5 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">
                3
              </span>
              <h2 className="text-sm font-extrabold text-gray-900">
                Select Wholesale Payment Mode
              </h2>
            </div>

            <div className="space-y-3">
              {/* Option 1: Cash on Delivery to Van Driver */}
              <label
                className={`p-4 rounded-2xl border-2 flex items-start gap-3.5 cursor-pointer transition ${
                  paymentMethod === 'CASH'
                    ? 'border-indigo-600 bg-indigo-50/20 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMode"
                  value="CASH"
                  checked={paymentMethod === 'CASH'}
                  onChange={() => setPaymentMethod('CASH')}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1 text-xs space-y-1">
                  <div className="flex items-center justify-between font-extrabold text-gray-900 text-sm">
                    <span className="flex items-center gap-2">
                      <i className="fa-solid fa-money-bill-wave text-emerald-600 text-base"></i>
                      Cash on Delivery (Pay to Van Driver)
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Most Popular
                    </span>
                  </div>
                  <p className="text-gray-500 leading-relaxed text-[11px]">
                    Pay cash or UPI to the distributor driver upon doorstep van delivery. Verify cartons and batch expiry before payment.
                  </p>
                </div>
              </label>

              {/* Option 2: Instant UPI / Online Payment */}
              <label
                className={`p-4 rounded-2xl border-2 flex items-start gap-3.5 cursor-pointer transition ${
                  paymentMethod === 'UPI'
                    ? 'border-indigo-600 bg-indigo-50/20 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMode"
                  value="UPI"
                  checked={paymentMethod === 'UPI'}
                  onChange={() => setPaymentMethod('UPI')}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1 text-xs space-y-1">
                  <div className="flex items-center justify-between font-extrabold text-gray-900 text-sm">
                    <span className="flex items-center gap-2">
                      <i className="fa-solid fa-qrcode text-indigo-600 text-base"></i>
                      Instant UPI / QR Code / Net Banking
                    </span>
                    <span className="text-[10px] font-bold text-gray-500">
                      GPay • PhonePe • Paytm
                    </span>
                  </div>
                  <p className="text-gray-500 leading-relaxed text-[11px]">
                    Instant digital payment with auto-generated GST tax invoice sent directly to your accounting email.
                  </p>
                </div>
              </label>

              {/* Option 3: Kirana Trade Credit (Khata / 14 Days) */}
              <label
                className={`p-4 rounded-2xl border-2 flex items-start gap-3.5 cursor-pointer transition ${
                  paymentMethod === 'CREDIT'
                    ? 'border-indigo-600 bg-indigo-50/20 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMode"
                  value="CREDIT"
                  checked={paymentMethod === 'CREDIT'}
                  onChange={() => setPaymentMethod('CREDIT')}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1 text-xs space-y-1">
                  <div className="flex items-center justify-between font-extrabold text-gray-900 text-sm">
                    <span className="flex items-center gap-2">
                      <i className="fa-solid fa-receipt text-amber-600 text-base"></i>
                      14-Day Kirana Trade Credit (Khata)
                    </span>
                    <span className="text-[11px] font-bold text-indigo-700">
                      ₹{creditBalance.available_amount.toLocaleString('en-IN')} Available
                    </span>
                  </div>
                  <p className="text-gray-500 leading-relaxed text-[11px]">
                    Procure stock immediately, sell in your store, and settle bill after 14 days without interest.
                  </p>
                </div>
              </label>
            </div>

            {/* Special Instructions */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Distributor Van Delivery Instructions (Optional):
              </label>
              <textarea
                value={driverNotes}
                onChange={(e) => setDriverNotes(e.target.value)}
                placeholder="e.g. Call before delivery, deliver behind Main Market lane, store closes 2-4 PM..."
                rows={2}
                className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:border-indigo-500 outline-none bg-slate-50"
              />
            </div>
          </div>

        </div>

        {/* Right Column (4 cols): Sticky Amazon-Style Order Summary & Buy Box */}
        <div className="lg:col-span-4 space-y-4 sticky top-6">
          <div className="card p-6 bg-white border-2 border-indigo-100 rounded-3xl shadow-lg space-y-5">
            
            <h2 className="text-base font-black text-gray-900 pb-3 border-b border-gray-100 flex items-center justify-between">
              <span>Order Summary</span>
              <span className="text-xs font-normal text-gray-500">
                {totalCartons} {totalCartons === 1 ? 'carton' : 'cartons'}
              </span>
            </h2>

            {/* Wholesale Price Breakdown */}
            <div className="space-y-2.5 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Wholesale Subtotal:</span>
                <span className="font-bold text-gray-900">₹{totalAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span>Distributor Van Delivery:</span>
                <span className="font-black text-emerald-600 uppercase text-[11px]">
                  FREE (Local Zone)
                </span>
              </div>

              <div className="flex justify-between">
                <span>GST Tax (Input Credit):</span>
                <span className="font-bold text-gray-700">Included (100% ITC Eligible)</span>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-between items-baseline">
                <span className="font-black text-gray-900 text-sm">Total Wholesale Bill:</span>
                <span className="font-black text-xl text-indigo-700">
                  ₹{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Profit Margin Hero Box */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-emerald-100">
                <span>Retail Sales Value (at MRP):</span>
                <span className="font-black text-white">₹{totalRetailValue.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-500/50">
                <span className="font-bold">Your Store Profit:</span>
                <span className="text-sm font-black text-emerald-200">
                  +₹{totalProfit.toFixed(2)} ({overallMarginPct}%)
                </span>
              </div>
            </div>

            {/* Amazon-Style Place Order Button */}
            <button
              type="button"
              disabled={isSubmitting || cart.length === 0}
              onClick={handlePlaceOrder}
              className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                isSubmitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/20 active:scale-[0.99]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                  <span>Routing to Distributor Van...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-lock"></i>
                  <span>Place Restock Order (₹{totalAmount.toFixed(2)})</span>
                </>
              )}
            </button>

            {/* Trust Assurance Guarantee */}
            <div className="p-3 rounded-xl bg-slate-50 border border-gray-200 text-[11px] text-gray-500 space-y-2">
              <div className="flex items-center gap-2 font-bold text-gray-700">
                <i className="fa-solid fa-shield-check text-emerald-600"></i>
                <span>ADAB Verified Sourcing Guarantee</span>
              </div>
              <ul className="space-y-1 text-[10px] text-gray-500 pl-4 list-disc">
                <li>100% Genuine brand cartons with manufacturer warranty</li>
                <li>Auto-syncs stock to your POS & barcode scanner upon order</li>
                <li>Doorstep distributor van delivery to Pincode {storeInfo.pincode}</li>
              </ul>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
