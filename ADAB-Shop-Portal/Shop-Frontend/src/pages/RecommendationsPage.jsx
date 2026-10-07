import React from 'react';
import { Link } from 'react-router-dom';

export default function RecommendationsPage() {
  return (
<>
<section id="sec-recommendations" className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold" data-i18n="recTitle">Product Recommendations</h1>
        <p className="text-sm text-gray-500" data-i18n="recDesc">AI tells you what to sell, what to buy, and who wants your products</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => {}} id="recTabSell" className="px-4 py-2 rounded-xl text-sm font-bold tab-on" data-i18n="recTabSell">Products to Sell</button>
        <button onClick={() => {}} id="recTabBuy" className="px-4 py-2 rounded-xl text-sm font-bold tab-off" data-i18n="recTabBuy">Products to Buy</button>
        <button onClick={() => {}} id="recTabDemand" className="px-4 py-2 rounded-xl text-sm font-bold tab-off" data-i18n="recTabDemand">Who Wants to Buy</button>
        <button onClick={() => {}} id="recTabTrending" className="px-4 py-2 rounded-xl text-sm font-bold tab-off" data-i18n="recTabTrend">Trending Near You</button>
      </div>
      <div id="recPanelSell">
        <div className="card p-4 bg-indigo-50 border-indigo-200 text-sm text-indigo-900 mb-4"><i className="fa-solid fa-lightbulb mr-1"></i> <strong>Tip:</strong> These products are in high demand in Surat. Add them to earn more.</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="card p-4"><div className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded inline-block mb-2">+340% searches this week</div><h3 className="font-bold">Organic Quinoa 500g</h3><p className="text-xs text-gray-500 mt-1">Buy ₹145 · Sell ₹220 · <span className="text-green-700 font-bold">34% profit</span></p><div className="flex gap-2 mt-3"><button onClick={() => {}} className="btn-primary flex-1 !text-xs">Add from FMCG</button></div></div>
          <div className="card p-4"><div className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded inline-block mb-2">Top seller nearby</div><h3 className="font-bold">Rayon Print Kurti</h3><p className="text-xs text-gray-500 mt-1">Buy ₹320 · Sell ₹749 · <span className="text-green-700 font-bold">57% profit</span></p><button onClick={() => {}} className="btn-primary w-full mt-3 !text-xs">Add from Other Store</button></div>
          <div className="card p-4"><div className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-block mb-2">85 sold daily nearby</div><h3 className="font-bold">A2 Gir Cow Ghee 1L</h3><p className="text-xs text-gray-500 mt-1">Buy ₹820 · Sell ₹1,250 · <span className="text-green-700 font-bold">34% profit</span></p><button onClick={() => {}} className="btn-primary w-full mt-3 !text-xs">Add to My Store</button></div>
          <div className="card p-4"><div className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block mb-2">Export demand</div><h3 className="font-bold">Basmati Rice 25kg</h3><p className="text-xs text-gray-500 mt-1">Buy ₹4,200 · Export ₹6,800</p><button onClick={() => {}} className="btn-primary w-full mt-3 !text-xs">List for Export</button></div>
          <div className="card p-4"><div className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded inline-block mb-2">Seasonal — Diwali</div><h3 className="font-bold">Diwali Sweet Box</h3><p className="text-xs text-gray-500 mt-1">Buy ₹380 · Sell ₹599</p><button onClick={() => {}} className="btn-primary w-full mt-3 !text-xs">Create Food Item</button></div>
          <div className="card p-4"><div className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded inline-block mb-2">Create your own</div><h3 className="font-bold">Custom Silk Saree</h3><p className="text-xs text-gray-500 mt-1">No competition nearby · high margin</p><button onClick={() => {}} className="btn-primary w-full mt-3 !text-xs">Create Own Brand</button></div>
        </div>
      </div>
      <div id="recPanelBuy" className="">
        <div className="card p-4 bg-blue-50 border-blue-200 text-sm text-blue-900 mb-4"><i className="fa-solid fa-cart-shopping mr-1"></i> <strong>Restock these</strong> — your stock is low or demand is rising.</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="card p-4 border-red-100"><div className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded inline-block mb-2">Only 12 left in your store</div><h3 className="font-bold">Fortune Oil 1L</h3><p className="text-xs text-gray-500 mt-1">Buy from ₹148 · Vesu Wholesale 8 km</p><button onClick={() => {}} className="btn-primary w-full mt-3 !text-xs">Search & Buy</button></div>
          <div className="card p-4"><div className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded inline-block mb-2">Low stock alert</div><h3 className="font-bold">Maggi Noodles 70g</h3><p className="text-xs text-gray-500 mt-1">Only 10 pcs · reorder bulk</p><button onClick={() => {}} className="btn-primary w-full mt-3 !text-xs">Search & Buy</button></div>
          <div className="card p-4"><div className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-block mb-2">Repeat order</div><h3 className="font-bold">Sunflower Oil 15L Tin</h3><p className="text-xs text-gray-500 mt-1">Last bought from Gujarat Agro · ₹1,420</p>          <button onClick={() => {}} className="btn-primary w-full mt-3 !text-xs">Reorder Same</button></div>
          <div className="card p-4"><div className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded inline-block mb-2">Cheapest nearby</div><h3 className="font-bold">Turmeric Powder 5kg</h3><p className="text-xs text-gray-500 mt-1">₹2,100 from Spice Traders · 15 km</p><button onClick={() => {}} className="btn-primary w-full mt-3 !text-xs">Buy on Credit</button></div>
        </div>
      </div>
      <div id="recPanelDemand" className="hidden space-y-3">
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><div className="font-bold">Vesu Grocery Mart</div><div className="text-xs text-gray-500">2.4 km · wants Rice, Oil, Salt — bulk order</div></div><button onClick={() => {}} className="btn-primary !text-xs whitespace-nowrap">Sell to This Store</button></div>
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><div className="font-bold">Ring Road Kirana</div><div className="text-xs text-gray-500">1.1 km · wants packaged snacks daily</div></div><button onClick={() => {}} className="btn-primary !text-xs whitespace-nowrap">Sell to This Store</button></div>
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><div className="font-bold">Al-Rashid Trading (Dubai)</div><div className="text-xs text-gray-500">Export buyer · wants spices & basmati rice</div></div><button onClick={() => {}} className="btn-soft !text-xs whitespace-nowrap">List for Export</button></div>
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><div className="font-bold">Adajan Medical Store</div><div className="text-xs text-gray-500">3.8 km · wants hand sanitizer, masks</div></div><button onClick={() => {}} className="btn-primary !text-xs whitespace-nowrap">Find & Supply</button></div>
      </div>
      <div id="recPanelTrending" className="">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="card p-5"><h3 className="font-bold mb-3">🔥 Hot in Surat This Week</h3><div className="space-y-2 text-sm"><div className="flex justify-between p-2 bg-gray-50 rounded-lg"><span>1. Organic Quinoa</span><span className="text-green-700 font-bold">+340%</span></div><div className="flex justify-between p-2 bg-gray-50 rounded-lg"><span>2. A2 Ghee</span><span className="text-green-700 font-bold">+120%</span></div><div className="flex justify-between p-2 bg-gray-50 rounded-lg"><span>3. Rayon Kurti</span><span className="text-green-700 font-bold">+89%</span></div><div className="flex justify-between p-2 bg-gray-50 rounded-lg"><span>4. Diwali Sweets</span><span className="text-green-700 font-bold">+210%</span></div></div></div>
          <div className="card p-5"><h3 className="font-bold mb-3">📉 Falling Demand — Avoid Overstock</h3><div className="space-y-2 text-sm"><div className="flex justify-between p-2 bg-gray-50 rounded-lg"><span>Cola 2L bottles</span><span className="text-red-600 font-bold">-18%</span></div><div className="flex justify-between p-2 bg-gray-50 rounded-lg"><span>Plastic buckets</span><span className="text-red-600 font-bold">-12%</span></div></div></div>
        </div>
      </div>
    </section>
</>
  );
}
