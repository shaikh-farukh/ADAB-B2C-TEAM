import React, { useState } from 'react';
import { usePOS } from '../hooks/usePOS';

const QUICK_PRODUCTS = [
  { id: '101', name: 'Fortune Oil 1L', price: 165 },
  { id: '102', name: 'Maggi 70g', price: 14 },
  { id: '103', name: 'Bread', price: 40 },
  { id: '104', name: 'Eggs 6pc', price: 48 },
  { id: '105', name: 'Paneer 200g', price: 90 },
  { id: '106', name: 'Banana dozen', price: 60 },
  { id: '107', name: 'Colgate 200g', price: 98 },
  { id: '108', name: 'Lays 52g', price: 20 },
];

export default function POSPage() {
  const { cart, addToCart, updateQuantity, clearCart, cartTotal, checkout, isProcessing } = usePOS();
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const handleCheckout = async () => {
    const result = await checkout(paymentMethod);
    if (result) {
      alert(`Checkout successful! Receipt ID: ${result.receipt_id || result.id || 'N/A'}`);
    } else {
      alert('Checkout failed.');
    }
  };

  return (
    <section id="sec-pos" className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-indigo-900">
            Bill Counter <span className="text-sm font-normal text-indigo-600">(POS)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">Tap items to build bill. No internet required (offline syncs later).</p>
        </div>
      </div>
      
      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        {/* Products Grid */}
        <div className="card p-4 shadow-sm">
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 hide-scroll">
            <button className="px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">All</button>
            <button className="px-3 py-1.5 rounded-full text-xs font-bold bg-white text-gray-600 border border-gray-200">Grocery</button>
            <button className="px-3 py-1.5 rounded-full text-xs font-bold bg-white text-gray-600 border border-gray-200">Dairy</button>
            <button className="px-3 py-1.5 rounded-full text-xs font-bold bg-white text-gray-600 border border-gray-200">Snacks</button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {QUICK_PRODUCTS.map(product => (
              <button 
                key={product.id}
                onClick={() => addToCart(product)} 
                className="card p-3 text-left hover:border-indigo-300 hover:bg-indigo-50 transition-all border border-gray-200 shadow-sm"
              >
                <div className="font-bold text-sm truncate text-gray-800">{product.name}</div>
                <div className="text-indigo-700 font-extrabold mt-1">₹{product.price}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Cart / Bill Section */}
        <div className="card p-4 border-indigo-100 shadow-sm flex flex-col h-full bg-white">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-900">Current Bill</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">Walk-in</span>
          </div>
          
          <div className="space-y-2 text-sm flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="text-gray-400 text-xs italic text-center mt-10">Tap products to add to bill</p>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                  <div className="truncate flex-1">
                    <div className="font-bold text-xs">{item.name}</div>
                    <div className="text-[10px] text-gray-500">₹{item.price} x {item.qty}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 rounded bg-white border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-100">-</button>
                    <span className="font-bold text-xs w-4 text-center">{item.qty}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 rounded bg-white border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-100">+</button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="border-t border-gray-100 pt-3 mt-3 space-y-3 shrink-0">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Payment Method</label>
              <select 
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold bg-gray-50 focus:border-indigo-500 outline-none"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI / QR Scan</option>
                <option value="card">Card Swipe</option>
              </select>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="font-semibold text-gray-600 text-sm">Total Amount</span>
              <span className="font-extrabold text-2xl text-indigo-900">₹{cartTotal}</span>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={clearCart} 
                disabled={cart.length === 0 || isProcessing}
                className="btn-soft flex-1 !text-sm !py-3 disabled:opacity-50"
              >
                Clear
              </button>
              <button 
                onClick={handleCheckout} 
                disabled={cart.length === 0 || isProcessing}
                className="btn-primary flex-[2] !text-sm !py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <i className="fa-solid fa-print"></i> Bill & Print
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
