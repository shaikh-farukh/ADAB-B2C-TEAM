import React from 'react';
import { Link } from 'react-router-dom';

export default function OffersPage() {
  return (
<>
<section id="sec-offers" className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl font-extrabold">Coupons & Offers</h1><p className="text-sm text-gray-500">Product, shop, delivery, or category discounts — for customers or other stores</p></div>
        <button onClick={() => {}} className="btn-primary text-sm"><i className="fa-solid fa-plus mr-1"></i> Create Coupon</button>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => {}} id="coupTabAll" className="px-3 py-1.5 rounded-full text-xs font-bold tab-on">All (8)</button>
        <button onClick={() => {}} id="coupTabProduct" className="px-3 py-1.5 rounded-full text-xs font-bold tab-off">Product (3)</button>
        <button onClick={() => {}} id="coupTabShop" className="px-3 py-1.5 rounded-full text-xs font-bold tab-off">Shop-wide (2)</button>
        <button onClick={() => {}} id="coupTabDelivery" className="px-3 py-1.5 rounded-full text-xs font-bold tab-off">Delivery (2)</button>
        <button onClick={() => {}} id="coupTabCategory" className="px-3 py-1.5 rounded-full text-xs font-bold tab-off">Category (1)</button>
      </div>
      <div className="space-y-3" id="couponList">
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 coup-row" data-type="product">
          <div><div className="flex items-center gap-2"><span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">PRODUCT</span><span className="font-mono font-bold text-lg">KURTI15</span></div><div className="text-sm text-gray-600 mt-1">15% off · Balaji Silk Kurti only · Customers</div><div className="text-xs text-gray-400">Min order ₹500 · 45 used</div></div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">Active</span>
        </div>
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 coup-row" data-type="shop">
          <div><div className="flex items-center gap-2"><span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded">SHOP</span><span className="font-mono font-bold text-lg">DIWALI10</span></div><div className="text-sm text-gray-600 mt-1">10% off entire store · Customers</div><div className="text-xs text-gray-400">Valid till 15 Nov · 234 used</div></div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">Active</span>
        </div>
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 coup-row" data-type="delivery">
          <div><div className="flex items-center gap-2"><span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">DELIVERY</span><span className="font-mono font-bold text-lg">FREEDEL</span></div><div className="text-sm text-gray-600 mt-1">Free fast delivery · Orders above ₹299 · Customers</div><div className="text-xs text-gray-400">89 used</div></div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">Active</span>
        </div>
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 coup-row" data-type="product">
          <div><div className="flex items-center gap-2"><span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">PRODUCT</span><span className="font-mono font-bold text-lg">OIL50</span></div><div className="text-sm text-gray-600 mt-1">₹50 off · Fortune Oil 1L · Customers + Stores</div><div className="text-xs text-gray-400">Bulk min 24 pcs · 18 used</div></div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">Active</span>
        </div>
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 coup-row" data-type="shop">
          <div><div className="flex items-center gap-2"><span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded">SHOP</span><span className="font-mono font-bold text-lg">BULK500</span></div><div className="text-sm text-gray-600 mt-1">₹500 off above ₹10,000 · Other stores only</div><div className="text-xs text-gray-400">12 used</div></div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">Active</span>
        </div>
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 coup-row" data-type="category">
          <div><div className="flex items-center gap-2"><span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">CATEGORY</span><span className="font-mono font-bold text-lg">GROCERY15</span></div><div className="text-sm text-gray-600 mt-1">15% off all Grocery items · Customers</div><div className="text-xs text-gray-400">56 used</div></div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">Active</span>
        </div>
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 coup-row" data-type="delivery">
          <div><div className="flex items-center gap-2"><span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">DELIVERY</span><span className="font-mono font-bold text-lg">STOREFREIGHT</span></div><div className="text-sm text-gray-600 mt-1">Free Porter truck · Store orders above ₹25k</div><div className="text-xs text-gray-400">Other stores · 6 used</div></div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">Active</span>
        </div>
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 coup-row" data-type="product">
          <div><div className="flex items-center gap-2"><span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">PRODUCT</span><span className="font-mono font-bold text-lg">MASALA20</span></div><div className="text-sm text-gray-600 mt-1">20% off Royal Garam Masala · Customers</div><div className="text-xs text-gray-400">Expired 1 Sep</div></div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">Expired</span>
        </div>
      </div>
    </section>
</>
  );
}
