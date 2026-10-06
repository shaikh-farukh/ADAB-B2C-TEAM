import React, { useState } from 'react';

/**
 * Shopping Cart Screen (sec-cart) Component
 * Matches unified-customer-portal-demo.html
 */
export default function CartView({
  cartData = { items: [], summary: {} },
  onUpdateQty,
  onApplyCoupon,
  onRemoveCoupon,
  onStartShopping,
  onProceedToCheckout,
  loading = false
}) {
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState(null);

  const items = cartData.items || [];
  const summary = cartData.summary || {};
  const isCartEmpty = items.length === 0;

  // Group items by store
  const itemsByStore = items.reduce((acc, item) => {
    const storeId = item.store_id || 'default_store';
    if (!acc[storeId]) {
      acc[storeId] = {
        store_id: storeId,
        store_name: item.store_name || item.store || 'ADAB Local Store',
        category: item.store_category || 'Grocery',
        items: []
      };
    }
    acc[storeId].items.push(item);
    return acc;
  }, {});

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (!couponInput.trim()) {
      setCouponError('Please enter a coupon code.');
      return;
    }
    setCouponError(null);
    onApplyCoupon(couponInput.trim().toUpperCase());
  };

  const appliedCoupon = summary.coupon_code || (cartData.cart && cartData.cart.coupon_code);
  const discountAmount = summary.discount || 0;
  const deliveryFee = summary.delivery_fee !== undefined ? summary.delivery_fee : 29;
  const grandTotal = summary.grand_total !== undefined ? summary.grand_total : summary.subtotal || 0;

  // Map category to demo product emoji
  const getProductEmoji = (item) => {
    const name = (item.product_name || item.name || '').toLowerCase();
    if (name.includes('dal') || name.includes('pulse')) return '🌾';
    if (name.includes('chip') || name.includes('snack')) return '🍿';
    if (name.includes('oil')) return '🫒';
    if (name.includes('milk') || name.includes('dairy')) return '🥛';
    if (name.includes('butter')) return '🧈';
    if (name.includes('rice')) return '🍚';
    if (name.includes('kurti') || name.includes('cloth')) return '👗';
    if (name.includes('salt')) return '🧂';
    return '📦';
  };

  if (isCartEmpty) {
    return (
      <div id="cartEmpty" className="text-center py-16 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
          <i className="fa-solid fa-basket-shopping"></i>
        </div>
        <h2 className="font-extrabold text-xl text-gray-900">Your basket is empty</h2>
        <p className="text-xs text-gray-500 mt-1.5 max-w-xs mx-auto">
          Explore local shops in your area and add fresh groceries, dairy, or fashion items.
        </p>
        <button
          type="button"
          onClick={onStartShopping}
          className="green-btn mt-6 max-w-xs mx-auto text-sm py-3.5 flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-compass"></i> Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div id="cartFull" className="space-y-4">
      {/* Top neighborhood banner */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-3.5 border border-emerald-200/70 text-xs">
        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0">
          <i className="fa-solid fa-shield-halved text-sm"></i>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-emerald-950">Neighborhood Shop Direct</div>
          <div className="text-emerald-800 text-[11px] mt-0.5">
            Orders are packed fresh and dispatched straight from local stores.
          </div>
        </div>
      </div>

      {/* Cart items grouped by store */}
      <div id="cartItems" className="space-y-3.5">
        {Object.values(itemsByStore).map((storeGroup) => {
          const storeSubtotal = storeGroup.items.reduce(
            (sum, it) => sum + Number(it.sell_price || it.price) * Number(it.quantity),
            0
          );

          return (
            <div
              key={storeGroup.store_id}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
            >
              {/* Store Header */}
              <div className="px-4 py-3 bg-gray-50 flex items-center gap-2 border-b border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white text-xs font-extrabold">
                  {storeGroup.store_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm text-gray-900 truncate">
                    {storeGroup.store_name}
                  </div>
                  <div className="text-[10px] text-gray-500 font-semibold">
                    {storeGroup.category} · Direct dispatch
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                  ₹{storeSubtotal}
                </span>
              </div>

              {/* Items in this Store */}
              <div className="p-3 space-y-3">
                {storeGroup.items.map((item) => {
                  const itemUnitPrice = Number(item.sell_price || item.price);
                  const itemQuantity = Number(item.quantity);
                  const itemTotalPrice = itemUnitPrice * itemQuantity;

                  return (
                    <div
                      key={item.cart_item_id || item.id}
                      className="flex gap-3 items-center justify-between"
                    >
                      {/* Product Emoji Avatar */}
                      <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-xl shrink-0">
                        {getProductEmoji(item)}
                      </div>

                      {/* Title & Unit Price */}
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="font-bold text-sm text-gray-900 truncate">
                          {item.product_name || item.name}
                        </div>
                        <div className="font-extrabold text-brand-dark text-xs mt-0.5">
                          ₹{itemTotalPrice}{' '}
                          <span className="text-[10px] font-normal text-gray-400">
                            (₹{itemUnitPrice} each)
                          </span>
                        </div>
                      </div>

                      {/* Quantity Controller (+ / -) */}
                      <div className="qty-ctrl shrink-0">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.cart_item_id || item.id, -1)}
                          disabled={loading}
                          aria-label="Decrease quantity"
                          className="hover:scale-110 active:scale-95 transition-transform"
                        >
                          −
                        </button>
                        <span>{itemQuantity}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.cart_item_id || item.id, 1)}
                          disabled={loading}
                          aria-label="Increase quantity"
                          className="hover:scale-110 active:scale-95 transition-transform"
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

      {/* Bill Breakdown Card */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
          <span className="font-extrabold text-sm text-gray-900">Order Summary</span>
          <span
            className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"
            id="cartSavingsBadge"
          >
            {discountAmount > 0 ? `Saved ₹${discountAmount}` : 'Guaranteed Best Price'}
          </span>
        </div>

        <div className="bill-row">
          <span>Items Subtotal</span>
          <span id="cartSubtotal" className="font-bold text-gray-900">
            ₹{summary.subtotal || 0}
          </span>
        </div>

        <div className="bill-row">
          <span>Estimated Delivery Fee</span>
          <span id="cartDelivery" className="font-bold text-gray-900">
            {deliveryFee === 0 ? (
              <span className="text-emerald-600 font-extrabold">FREE</span>
            ) : (
              `₹${deliveryFee}`
            )}
          </span>
        </div>

        {discountAmount > 0 && (
          <div className="bill-row" id="cartDiscountRow">
            <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <i className="fa-solid fa-tag text-xs"></i> Coupon ({appliedCoupon})
            </span>
            <div className="flex items-center gap-2">
              <span id="cartDiscount" className="font-bold text-emerald-700">
                -₹{discountAmount}
              </span>
              <button
                type="button"
                onClick={onRemoveCoupon}
                className="text-[10px] text-red-500 hover:underline font-bold"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        <div className="bill-row border-t border-dashed border-gray-200 pt-3 mt-1">
          <span className="font-black text-gray-900 text-base">To Pay</span>
          <span id="cartTotal" className="font-black text-emerald-800 text-xl">
            ₹{grandTotal}
          </span>
        </div>
      </div>

      {/* Promo Coupon Section */}
      <form onSubmit={handleApplyCoupon} className="space-y-1.5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <i className="fa-solid fa-ticket absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              id="couponInput"
              value={couponInput}
              onChange={(e) => {
                setCouponInput(e.target.value);
                setCouponError(null);
              }}
              placeholder="Enter coupon (e.g. BALAJI15, ADAB100)"
              className="w-full pl-10 pr-3 py-3 rounded-2xl border border-gray-200 text-xs font-bold uppercase tracking-wider outline-none focus:border-emerald-600 bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="coral-btn !py-3 !px-5 !text-xs shrink-0 cursor-pointer"
          >
            Apply
          </button>
        </div>
        {couponError && (
          <p className="text-[11px] text-red-600 font-semibold px-2">{couponError}</p>
        )}
      </form>

      {/* Delivery Address Banner */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 flex gap-3 items-center shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 text-lg">
          <i className="fa-solid fa-location-dot"></i>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-xs text-gray-900">Delivering to Home</div>
          <div className="text-[11px] text-gray-500 truncate">
            Flat 402, Green Valley Apt, Ring Road, Surat
          </div>
        </div>
        <span className="text-emerald-700 text-xs font-bold shrink-0">
          Verified
        </span>
      </div>

      {/* Proceed to Checkout Button */}
      <button
        type="button"
        id="cartCheckoutBtn"
        onClick={onProceedToCheckout}
        disabled={loading}
        className="green-btn text-sm font-extrabold py-4 shadow-lg flex items-center justify-center gap-2 cursor-pointer"
      >
        <span>Proceed to Checkout</span>
        <i className="fa-solid fa-arrow-right"></i>
      </button>
    </div>
  );
}
