import React from 'react';
import { Link } from 'react-router-dom';

export default function BuyCartPage() {
  return (
<>
﻿    <section id="sec-buycart" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-xl font-extrabold">Purchase Cart</h1><p className="text-sm text-gray-500">Review items Â· then proceed to checkout for delivery & payment</p></div>
        <button onClick={() => {}} className="btn-soft !text-xs"><i className="fa-solid fa-plus mr-1"></i> Add More Items</button>
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div id="buyCartEmpty" className="card p-10 text-center text-gray-500">
            <i className="fa-solid fa-cart-shopping text-4xl text-gray-300 mb-3"></i>
            <div className="font-bold text-lg">Your purchase cart is empty</div>
            <p className="text-sm mt-1">Search and add products from other stores</p>
            <div className="flex gap-2 justify-center mt-4 flex-wrap">
              <button onClick={() => {}} className="btn-primary !text-xs">Search & Buy</button>
              <button onClick={() => {}} className="btn-soft !text-xs">Browse Nearby</button>
            </div>
          </div>
          <div id="buyCartItems" className="space-y-4 hidden"></div>
          <button onClick={() => {}} id="buyCartMobileProceed" className="hidden btn-primary w-full py-3 !text-sm lg:hidden">Proceed to Checkout â€” Pay & Delivery â†’</button>
        </div>
        <div className="card p-5 border-2 border-blue-200 sticky top-24 h-fit space-y-4">
          <h3 className="font-extrabold text-lg">Order Summary</h3>
          <div id="buyCartSummaryEmpty" className="text-sm text-gray-500">Add items to see totals</div>
          <div id="buyCartSummary" className="hidden space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Items</span><span id="buyCartItemCount" className="font-bold">0</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Sellers</span><span id="buyCartSellerCount" className="font-bold">0</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span id="buyCartSubtotal" className="font-bold">₹0</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Delivery (est.)</span><span id="buyCartDeliveryFee" className="font-bold">₹0</span></div>
            <div className="flex justify-between border-t border-gray-100 pt-2 text-base"><span className="font-bold">Total</span><span id="buyCartTotal" className="font-extrabold text-green-700">₹0</span></div>
            <div className="p-3 rounded-xl bg-purple-50 text-xs text-purple-900"><div className="flex justify-between"><span>ADAB credit available</span><span className="font-bold">₹2,31,800</span></div><div className="flex justify-between mt-1"><span>Shop credits active</span><span className="font-bold" id="buyCartCreditShops">3 / 5 shops</span></div></div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Payment method</label>
              <select id="buyCartPayment" onChange={() => {}} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-bold">
                <option value="shop-credit">Shop credit (pay seller in 14 days)</option>
                <option value="adab-credit">ADAB credit line (pay ADAB in 14 days)</option>
                <option value="upi">UPI / Bank transfer now</option>
                <option value="mixed">UPI + Points (up to 50%)</option>
              </select>
            </div>
            <div id="buyCartPointsRow" className="hidden">
              <label className="text-xs font-bold text-gray-500 block mb-1">Use points (max 50%)</label>
              <input type="number" id="buyCartPoints" defaultValue="0" min="0" max="6240" onInput={() => {}} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
              <p className="text-[10px] text-gray-400 mt-1">Balance: 12,480 pts Â· 1 pt = ₹1</p>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Delivery for all orders</label>
              <select id="buyCartDelivery" onChange={() => {}} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                <option value="porter">Porter truck (nearby &lt;50 km)</option>
                <option value="delhivery">Delhivery freight (far / interstate)</option>
                <option value="pickup">Self pickup from seller</option>
                <option value="seller">Seller arranges delivery</option>
              </select>
              <p className="text-[10px] text-gray-400 mt-1" id="buyCartDeliveryHint">Auto-selected based on seller distance</p>
            </div>
            <label className="flex items-start gap-2 text-xs text-gray-600"><input type="checkbox" id="buyCartAgree" checked className="mt-0.5"  /> I agree to seller credit terms and delivery charges</label>
            <button onClick={() => {}} id="buyCartProceedBtn" className="btn-primary w-full py-3 !text-sm" disabled>Proceed to Checkout â†’</button>
            <button onClick={() => {}} className="btn-soft w-full !text-xs text-red-600">Clear Cart</button>
          </div>
        </div>
      </div>
    </section>


</>
  );
}
