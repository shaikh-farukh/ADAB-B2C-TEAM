import React from 'react';
import { Link } from 'react-router-dom';

export default function MasterSearchPage() {
  return (
<>
﻿    <section id="sec-mastersearch" className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold" data-i18n="msTitle">Search & Buy Anything</h1>
        <p className="text-sm text-gray-500" data-i18n="msDesc">Search all stores on ADAB â€” compare prices, buy on credit or with points</p>
      </div>
      <div className="card p-5 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white">
        <div className="relative">
          <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 text-lg"></i>
          <input type="search" id="masterSearchInput" placeholder="e.g. sunflower oil, kurti, rice 25kg, garam masala..." onKeyUp={() => {}} className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-blue-200 text-base outline-none focus:border-blue-500" />
        </div>
        <div className="flex gap-2 mt-3 flex-wrap text-xs font-bold">
          <button onClick={() => {}} className="px-3 py-1.5 rounded-full bg-white border border-gray-200">Oil</button>
          <button onClick={() => {}} className="px-3 py-1.5 rounded-full bg-white border border-gray-200">Rice</button>
          <button onClick={() => {}} className="px-3 py-1.5 rounded-full bg-white border border-gray-200">Kurti</button>
          <button onClick={() => {}} className="px-3 py-1.5 rounded-full bg-white border border-gray-200">Dal</button>
          <button onClick={() => {}} className="px-3 py-1.5 rounded-full bg-white border border-gray-200">Masala</button>
          <button onClick={() => {}} className="px-3 py-1.5 rounded-full bg-white border border-gray-200">Milk</button>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <select id="msFilterCat" onChange={() => {}} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm"><option value="all">All Categories</option><option value="grocery">Grocery</option><option value="clothing">Clothing</option><option value="dairy">Dairy</option><option value="spices">Spices</option></select>
        <select id="msFilterDist" onChange={() => {}} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm"><option value="all">Any Distance</option><option value="5">Within 5 km</option><option value="15">Within 15 km</option><option value="50">Within 50 km</option></select>
        <select id="msFilterSort" onChange={() => {}} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm"><option value="price">Lowest Price</option><option value="near">Nearest Store</option><option value="rating">Best Rated</option></select>
        <span className="px-3 py-2.5 rounded-xl bg-purple-50 text-purple-800 text-xs font-bold border border-purple-200 self-center">Credit: ₹2,31,800 Â· 12,480 pts</span>
        <button onClick={() => {}} className="btn-primary !text-xs self-center whitespace-nowrap"><i className="fa-solid fa-cart-shopping mr-1"></i> Cart <span id="msCartCount" className="hidden bg-white/30 px-1.5 rounded ml-1"></span></button>
      </div>
      <div id="masterSearchResults" className="space-y-3">
        <div className="card p-4 ms-result" data-cat="grocery" data-dist="3" data-price="1420" data-q="oil sunflower">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex gap-3"><div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center text-yellow-700"><i className="fa-solid fa-bottle-droplet"></i></div><div><div className="font-bold">Sunflower Oil 15L Tin</div><div className="text-xs text-gray-500">Gujarat Agro Mill Â· 3 km Â· â­ 4.8 Â· Min order 10</div><div className="text-xs text-green-700 font-bold mt-0.5">Also at 2 more stores â€” from ₹1,380</div></div></div>
            <div className="flex items-center gap-2 flex-wrap justify-end"><div className="text-right"><div className="text-xl font-extrabold text-green-700">₹1,420</div><div className="text-[10px] text-gray-400">/ tin Â· min 10</div></div><button onClick={() => {}} className="btn-soft !text-xs whitespace-nowrap"><i className="fa-solid fa-cart-plus mr-1"></i> Add</button><button onClick={() => {}} className="btn-primary !text-xs whitespace-nowrap">Buy Now</button></div>
          </div>
        </div>
        <div className="card p-4 ms-result" data-cat="grocery" data-dist="8" data-price="1380" data-q="oil sunflower">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex gap-3"><div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center text-yellow-700"><i className="fa-solid fa-bottle-droplet"></i></div><div><div className="font-bold">Fortune Sunflower Oil 15L</div><div className="text-xs text-gray-500">Vesu Wholesale Â· 8 km Â· â­ 4.6 Â· Min order 5</div></div></div>
            <div className="flex items-center gap-2 flex-wrap justify-end"><div className="text-right"><div className="text-xl font-extrabold text-green-700">₹1,380</div><div className="text-[10px] text-gray-400">/ tin Â· Cheapest</div></div><button onClick={() => {}} className="btn-soft !text-xs"><i className="fa-solid fa-cart-plus mr-1"></i> Add</button><button onClick={() => {}} className="btn-primary !text-xs">Buy Now</button></div>
          </div>
        </div>
        <div className="card p-4 ms-result" data-cat="clothing" data-dist="5" data-price="19500" data-q="kurti cotton">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex gap-3"><div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700"><i className="fa-solid fa-shirt"></i></div><div><div className="font-bold">Cotton Kurtis (50 pcs bundle)</div><div className="text-xs text-gray-500">Textile Park Store Â· 5 km Â· â­ 4.9</div></div></div>
            <div className="flex items-center gap-2 flex-wrap justify-end"><div className="text-right"><div className="text-xl font-extrabold text-green-700">₹19,500</div></div><button onClick={() => {}} className="btn-soft !text-xs"><i className="fa-solid fa-cart-plus mr-1"></i> Add</button><button onClick={() => {}} className="btn-primary !text-xs">Buy Now</button></div>
          </div>
        </div>
        <div className="card p-4 ms-result" data-cat="grocery" data-dist="120" data-price="6200" data-q="rice basmati">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex gap-3"><div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700"><i className="fa-solid fa-wheat-awn"></i></div><div><div className="font-bold">Basmati Rice 100kg Bag</div><div className="text-xs text-gray-500">Punjab Grain Co Â· 120 km Â· â­ 4.7 Â· Freight via Porter</div></div></div>
            <div className="flex items-center gap-2 flex-wrap justify-end"><div className="text-right"><div className="text-xl font-extrabold text-green-700">₹6,200</div></div><button onClick={() => {}} className="btn-soft !text-xs"><i className="fa-solid fa-cart-plus mr-1"></i> Add</button><button onClick={() => {}} className="btn-primary !text-xs">Buy Now</button></div>
          </div>
        </div>
        <div className="card p-4 ms-result" data-cat="spices" data-dist="15" data-price="2100" data-q="masala turmeric">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex gap-3"><div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-700"><i className="fa-solid fa-pepper-hot"></i></div><div><div className="font-bold">Turmeric Powder 5kg</div><div className="text-xs text-gray-500">Spice Traders Â· 15 km Â· â­ 4.5</div></div></div>
            <div className="flex items-center gap-2 flex-wrap justify-end"><div className="text-right"><div className="text-xl font-extrabold text-green-700">₹2,100</div></div><button onClick={() => {}} className="btn-soft !text-xs"><i className="fa-solid fa-cart-plus mr-1"></i> Add</button><button onClick={() => {}} className="btn-primary !text-xs">Buy Now</button></div>
          </div>
        </div>
        <div className="card p-4 ms-result" data-cat="dairy" data-dist="4" data-price="8400" data-q="milk butter amul">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex gap-3"><div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700"><i className="fa-solid fa-cheese"></i></div><div><div className="font-bold">Amul Butter 500g x 24 crate</div><div className="text-xs text-gray-500">Dairy Collective Â· 4 km Â· â­ 4.8</div></div></div>
            <div className="flex items-center gap-2 flex-wrap justify-end"><div className="text-right"><div className="text-xl font-extrabold text-green-700">₹8,400</div></div><button onClick={() => {}} className="btn-soft !text-xs"><i className="fa-solid fa-cart-plus mr-1"></i> Add</button><button onClick={() => {}} className="btn-primary !text-xs">Buy Now</button></div>
          </div>
        </div>
      </div>
      <div id="masterSearchEmpty" className="hidden card p-8 text-center text-gray-500">
        <i className="fa-solid fa-search text-3xl text-gray-300 mb-3"></i>
        <div className="font-bold">No products found</div>
        <p className="text-sm mt-1">Try a different name or check spelling</p>
      </div>
    </section>


</>
  );
}
