import React from 'react';
import { Link } from 'react-router-dom';

export default function CreditTermsPage() {
  return (
<>
<section id="sec-creditterms" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-xl font-extrabold">Store Credit Terms</h1><p className="text-sm text-gray-500">Credit you give · credit from other shops · ADAB buying line — with per-shop and max-shop limits</p></div>
        <button onClick={() => {}} className="btn-primary !text-xs"><i className="fa-solid fa-credit-card mr-1"></i> Apply for Credit</button>
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 border-2 border-orange-200">
          <h3 className="font-extrabold text-orange-900 mb-1"><i className="fa-solid fa-store mr-1"></i> Credit You GIVE</h3>
          <p className="text-xs text-gray-500 mb-3">When other stores buy from you on khata</p>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between p-2 rounded-xl bg-orange-50"><span>Credit days</span><span className="font-extrabold text-orange-900" id="dispCreditDays">14 days</span></div>
            <div className="flex justify-between p-2 rounded-xl bg-gray-50"><span>Min order for credit</span><span className="font-bold" id="dispCreditMin">₹5,000</span></div>
            <div className="flex justify-between p-2 rounded-xl bg-gray-50"><span>Max per store</span><span className="font-bold" id="dispCreditPerShop">₹50,000</span></div>
            <div className="flex justify-between p-2 rounded-xl bg-gray-50"><span>Max stores on credit</span><span className="font-bold" id="dispCreditMaxShops">10 shops</span></div>
            <div className="flex justify-between p-2 rounded-xl bg-gray-50"><span>Total exposure cap</span><span className="font-bold" id="dispCreditTotalCap">₹3,00,000</span></div>
          </div>
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">Stores using your credit</span><span className="font-bold" id="creditGiveShopCount">3 / 10</span></div>
            <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-orange-500 rounded-full" id="creditGiveShopBar" style={{ width: '30%' }}></div></div>
            <div className="flex justify-between text-xs mt-2 mb-1"><span className="text-gray-500">Exposure used</span><span className="font-bold" id="creditGiveExposure">₹39,400 / ₹3L</span></div>
            <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-amber-500 rounded-full" id="creditGiveExposureBar" style={{ width: '13%' }}></div></div>
          </div>
          <div className="space-y-3">
            <select id="inpCreditDaysGive" onChange={() => {}} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 font-bold text-sm">
              <option value="7">7 days</option><option value="14" selected>14 days</option><option value="21">21 days</option><option value="30">30 days</option><option value="45">45 days</option><option value="60">60 days</option>
            </select>
            <input type="number" id="inpCreditMinGive" value="5000" placeholder="Min order ₹" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"  />
            <input type="number" id="inpCreditPerShopGive" value="50000" placeholder="Max ₹ per store" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"  />
            <input type="number" id="inpCreditMaxShopsGive" value="10" placeholder="Max number of shops" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"  />
            <input type="number" id="inpCreditTotalCapGive" value="300000" placeholder="Total exposure cap ₹" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"  />
            <button onClick={() => {}} className="btn-primary !text-xs w-full">Save Terms</button>
          </div>
          <h4 className="font-bold mt-4 mb-2 text-sm">Stores on your credit</h4>
          <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
            <div className="flex justify-between p-2 rounded-lg bg-gray-50"><span>Vesu Grocery Mart</span><span className="font-bold text-amber-800">₹31,000 · 5d</span></div>
            <div className="flex justify-between p-2 rounded-lg bg-gray-50"><span>Ring Road Kirana</span><span className="font-bold text-amber-800">₹8,400 · 12d</span></div>
          </div>
        </div>
        <div className="card p-5 border-2 border-blue-200">
          <h3 className="font-extrabold text-blue-900 mb-1"><i className="fa-solid fa-shop mr-1"></i> Credit from OTHER Shops</h3>
          <p className="text-xs text-gray-500 mb-3">When you buy — each seller sets their own terms. You can owe max <b id="dispBuyMaxShops">5</b> shops at once, up to <b id="dispBuyPerShop">₹25,000</b> each.</p>
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">Active shop credits</span><span className="font-bold" id="creditGetShopCount">3 / 5</span></div>
            <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-blue-500 rounded-full" style={{ width: '60%' }}></div></div>
            <div className="flex justify-between text-xs mt-2 mb-1"><span className="text-gray-500">Total you owe sellers</span><span className="font-bold text-red-700">₹18,200</span></div>
          </div>
          <table className="w-full text-xs text-left mb-3">
            <thead className="text-gray-500"><tr><th className="pb-1">Store</th><th className="pb-1">Days</th><th className="pb-1">Limit</th><th className="pb-1">Owe</th></tr></thead>
            <tbody className="divide-y divide-gray-100" id="sellerCreditTable">
              <tr><td className="py-1.5 font-bold">Gujarat Agro Mill</td><td className="py-1.5">14d</td><td className="py-1.5">₹25k</td><td className="py-1.5 text-red-700 font-bold">₹5,600</td></tr>
              <tr><td className="py-1.5 font-bold">Spice Traders</td><td className="py-1.5">7d</td><td className="py-1.5">₹15k</td><td className="py-1.5 text-red-700 font-bold">₹2,100</td></tr>
              <tr><td className="py-1.5 font-bold">Textile Park Store</td><td className="py-1.5">30d</td><td className="py-1.5">₹25k</td><td className="py-1.5 text-red-700 font-bold">₹10,500</td></tr>
            </tbody>
          </table>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 mb-3"><i className="fa-solid fa-info-circle mr-1"></i> At checkout: if you already owe 5 shops, you must pay one before buying on credit from a 6th store.</div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500">Max shops you can owe (your setting)</label>
            <input type="number" id="inpBuyMaxShops" value="5" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"  />
            <label className="text-xs font-bold text-gray-500">Max ₹ per seller (your cap)</label>
            <input type="number" id="inpBuyPerShop" value="25000" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"  />
            <button onClick={() => {}} className="btn-soft !text-xs w-full">Save Buying Limits</button>
          </div>
        </div>
        <div className="card p-5 border-2 border-purple-200">
          <h3 className="font-extrabold text-purple-900 mb-1"><i className="fa-solid fa-building-columns mr-1"></i> ADAB Credit Line</h3>
          <p className="text-xs text-gray-500 mb-3">Platform credit to buy stock — separate from shop-to-shop khata</p>
          <div className="grid grid-cols-3 gap-2 mb-4 text-center text-sm">
            <div className="p-2 rounded-xl bg-purple-50"><div className="text-[10px] text-gray-500">Limit</div><div className="font-extrabold text-purple-900">₹2.5L</div></div>
            <div className="p-2 rounded-xl bg-gray-50"><div className="text-[10px] text-gray-500">Used</div><div className="font-extrabold">₹0</div></div>
            <div className="p-2 rounded-xl bg-green-50"><div className="text-[10px] text-gray-500">Left</div><div className="font-extrabold text-green-800">₹2.5L</div></div>
          </div>
          <p className="text-xs text-gray-500 mb-3">ADAB pays sellers on time; you repay ADAB in 14 days. Good for festival stock-up when sellers want instant payment.</p>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between p-2 rounded-lg bg-gray-50"><span>Interest</span><span className="font-bold text-green-700">0% for 14 days</span></div>
            <div className="flex justify-between p-2 rounded-lg bg-gray-50"><span>Eligibility</span><span className="font-bold">GSTIN verified ✓</span></div>
            <div className="flex justify-between p-2 rounded-lg bg-gray-50"><span>Status</span><span className="font-bold text-green-700">Active</span></div>
          </div>
          <button onClick={() => {}} className="btn-primary !text-xs w-full">Apply / Increase Limit</button>
          <button onClick={() => {}} className="btn-soft !text-xs w-full mt-2">View in Money & Credit</button>
        </div>
      </div>
    </section>
</>
  );
}
