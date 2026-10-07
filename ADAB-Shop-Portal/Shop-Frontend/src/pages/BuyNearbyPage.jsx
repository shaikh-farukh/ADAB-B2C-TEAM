import React from 'react';
import { Link } from 'react-router-dom';

export default function BuyNearbyPage() {
  return (
<>
﻿    <section id="sec-buy" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-xl font-extrabold" data-i18n="buyTitle">Buy from Nearby Stores</h1><p className="text-sm text-gray-500" data-i18n="buyDesc">Quick restock from stores close to you â€” or use <button onClick={() => {}} className="text-blue-700 font-bold underline">Search & Buy</button> to find anything</p></div>
        <div className="flex gap-2 text-xs flex-wrap">
          <span className="px-3 py-1.5 rounded-full bg-purple-50 text-purple-800 font-bold border border-purple-200">Credit: ₹2,50,000 left</span>
          <span className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200"><i className="fa-solid fa-star text-amber-500"></i> 12,480 pts</span>
        </div>
      </div>
      <div className="flex gap-2 border-b border-gray-100 pb-2 flex-wrap">
        <button onClick={() => {}} id="buyTabBrowse" className="px-4 py-2 rounded-xl text-sm font-bold tab-on">Browse Nearby</button>
        <button onClick={() => {}} id="buyTabCart" className="px-4 py-2 rounded-xl text-sm font-bold tab-off">Purchase Cart <span id="buyTabCartCount" className="hidden ml-1 bg-blue-200 text-blue-900 px-1.5 rounded-full text-[10px]">0</span></button>
        <button onClick={() => {}} id="buyTabOrders" className="px-4 py-2 rounded-xl text-sm font-bold tab-off">My Purchase Orders (4)</button>
      </div>
      <div className="card p-3 flex flex-col sm:flex-row gap-2 flex-wrap" id="buyBrowseFilters">
        <input type="search" id="buyBrowseSearch" onInput={() => {}} placeholder="Search products or stores..." className="flex-1 min-w-[160px] px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500" />
        <select id="buyBrowseDist" onChange={() => {}} className="px-3 py-2 rounded-xl border border-gray-200 text-sm"><option value="all">Any distance</option><option value="5">Within 5 km</option><option value="15">Within 15 km</option><option value="50">Within 50 km</option></select>
        <select id="buyBrowseCat" onChange={() => {}} className="px-3 py-2 rounded-xl border border-gray-200 text-sm"><option value="all">All categories</option><option value="grocery">Grocery</option><option value="clothing">Clothing</option><option value="dairy">Dairy</option><option value="spices">Spices</option></select>
      </div>
      <div id="buyPanelBrowse">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" id="buyBrowseGrid">
        <div className="card p-4 space-y-3 buy-browse-item" data-cat="grocery" data-dist="3"><div className="text-xs text-gray-500">From: Gujarat Agro Mill Â· 3 km</div><h3 className="font-bold">Sunflower Oil 15L Tin</h3><div className="text-green-700 font-extrabold text-lg">₹1,420 <span className="text-xs text-gray-400 font-normal">/ tin Â· min 10</span></div><div className="text-[10px] text-orange-700">14 days shop credit Â· Porter delivery</div><div className="flex gap-2"><button onClick={() => {}} className="btn-soft flex-1 !text-xs"><i className="fa-solid fa-cart-plus mr-1"></i> Add to Cart</button><button onClick={() => {}} className="btn-primary flex-1 !text-xs">Buy Now</button></div></div>
        <div className="card p-4 space-y-3 buy-browse-item" data-cat="clothing" data-dist="5"><div className="text-xs text-gray-500">From: Textile Park Store Â· 5 km</div><h3 className="font-bold">Cotton Kurtis (50 pcs bundle)</h3><div className="text-green-700 font-extrabold text-lg">₹19,500</div><div className="text-[10px] text-orange-700">21 days credit Â· Porter truck</div><div className="flex gap-2"><button onClick={() => {}} className="btn-soft flex-1 !text-xs"><i className="fa-solid fa-cart-plus mr-1"></i> Add to Cart</button><button onClick={() => {}} className="btn-primary flex-1 !text-xs">Buy Now</button></div></div>
        <div className="card p-4 space-y-3 buy-browse-item" data-cat="grocery" data-dist="120"><div className="text-xs text-gray-500">From: Punjab Grain Co Â· 120 km</div><h3 className="font-bold">Basmati Rice 100kg Bag</h3><div className="text-green-700 font-extrabold text-lg">₹6,200 <span className="text-xs text-gray-400 font-normal">/ bag Â· min 5</span></div><div className="text-[10px] text-amber-700">Delhivery freight Â· 14 days credit</div><div className="flex gap-2"><button onClick={() => {}} className="btn-soft flex-1 !text-xs"><i className="fa-solid fa-cart-plus mr-1"></i> Add to Cart</button><button onClick={() => {}} className="btn-primary flex-1 !text-xs">Buy Now</button></div></div>
        <div className="card p-4 space-y-3 buy-browse-item" data-cat="grocery" data-dist="8"><div className="text-xs text-gray-500">From: Organic Farms Hub Â· 8 km</div><h3 className="font-bold">Organic Quinoa 500g x 20</h3><div className="text-green-700 font-extrabold text-lg">₹2,900 <span className="text-xs text-gray-400 font-normal">/ case Â· min 2</span></div><div className="flex gap-2"><button onClick={() => {}} className="btn-soft flex-1 !text-xs"><i className="fa-solid fa-cart-plus mr-1"></i> Add to Cart</button><button onClick={() => {}} className="btn-primary flex-1 !text-xs">Buy Now</button></div></div>
        <div className="card p-4 space-y-3 buy-browse-item" data-cat="dairy" data-dist="4"><div className="text-xs text-gray-500">From: Dairy Collective Â· 4 km</div><h3 className="font-bold">Amul Butter 500g x 24</h3><div className="text-green-700 font-extrabold text-lg">₹8,400</div><div className="flex gap-2"><button onClick={() => {}} className="btn-soft flex-1 !text-xs"><i className="fa-solid fa-cart-plus mr-1"></i> Add to Cart</button><button onClick={() => {}} className="btn-primary flex-1 !text-xs">Buy Now</button></div></div>
        <div className="card p-4 space-y-3 buy-browse-item" data-cat="spices" data-dist="15"><div className="text-xs text-gray-500">From: Spice Traders Â· 15 km</div><h3 className="font-bold">Turmeric Powder 5kg</h3><div className="text-green-700 font-extrabold text-lg">₹2,100</div><div className="flex gap-2"><button onClick={() => {}} className="btn-soft flex-1 !text-xs"><i className="fa-solid fa-cart-plus mr-1"></i> Add to Cart</button><button onClick={() => {}} className="btn-primary flex-1 !text-xs">Buy Now</button></div></div>
      </div>
      <button onClick={() => {}} className="card p-4 w-full text-left hover:border-purple-300 border-dashed border-2 border-purple-200 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center"><i className="fa-solid fa-hand-holding-dollar"></i></div>
        <div><div className="font-bold text-purple-900">Need more credit to buy stock?</div><div className="text-xs text-gray-500">Apply for a higher limit â€” takes 1-2 business days</div></div>
        <i className="fa-solid fa-chevron-right ml-auto text-gray-400"></i>
      </button>
      </div>
      <div id="buyPanelOrders" className="hidden space-y-3">
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><div className="font-bold">#PO-882 Â· Sunflower Oil 15L x 10</div><div className="text-xs text-gray-500">From Gujarat Agro Mill Â· Ordered today Â· On credit</div></div><span className="px-2 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">Packing</span></div>
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><div className="font-bold">#PO-881 Â· Cotton Kurtis 50 pcs</div><div className="text-xs text-gray-500">From Textile Park Â· Yesterday Â· Porter truck</div></div><span className="px-2 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">In Transit</span></div>
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><div className="font-bold">#PO-880 Â· Turmeric 5kg x 2</div><div className="text-xs text-gray-500">From Spice Traders Â· 28 Sep Â· Paid UPI</div></div><span className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-800">Delivered</span></div>
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><div className="font-bold">#PO-879 Â· Basmati Rice 100kg x 5</div><div className="text-xs text-gray-500">From Punjab Grain Co Â· 25 Sep Â· Freight</div></div><span className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-800">Delivered</span></div>
        <button onClick={() => {}} className="btn-soft w-full !text-xs"><i className="fa-solid fa-search mr-1"></i> Search & Buy More</button>
      </div>
    </section>


</>
  );
}
