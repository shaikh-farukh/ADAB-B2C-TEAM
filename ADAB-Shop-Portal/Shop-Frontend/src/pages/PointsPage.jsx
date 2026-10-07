import React from 'react';
import { Link } from 'react-router-dom';

export default function PointsPage() {
  return (
<>
<section id="sec-points" className="space-y-4">
      <div><h1 className="text-xl font-extrabold">Reward Points</h1><p className="text-sm text-gray-500">Earn when you sell AND when you buy — redeem on your next purchase</p></div>
      <div className="card p-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
        <div className="text-amber-100 text-sm">Your balance</div>
        <div className="text-4xl font-extrabold mt-1" id="pointsBig">12,480</div>
        <div className="text-amber-100 text-sm mt-1">1 point = ₹1 discount · Valid 12 months</div>
        <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
          <div className="bg-white/20 rounded-lg p-2"><div className="font-bold text-lg">+8,240</div><div className="text-amber-100">Earned (sell)</div></div>
          <div className="bg-white/20 rounded-lg p-2"><div className="font-bold text-lg">+2,100</div><div className="text-amber-100">Earned (buy)</div></div>
          <div className="bg-white/20 rounded-lg p-2"><div className="font-bold text-lg">-1,860</div><div className="text-amber-100">Redeemed</div></div>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-4 border-green-200">
          <h3 className="font-bold mb-2 text-green-800"><i className="fa-solid fa-arrow-up mr-1"></i> Earn when you SELL</h3>
          <table className="w-full text-sm"><tbody>
            <tr className="border-b border-gray-50"><td className="py-2">Customer app order</td><td className="py-2 text-right font-bold text-green-700">1 pt / ₹100</td></tr>
            <tr className="border-b border-gray-50"><td className="py-2">Sell to other store</td><td className="py-2 text-right font-bold text-green-700">2 pts / ₹100</td></tr>
            <tr className="border-b border-gray-50"><td className="py-2">POS walk-in bill</td><td className="py-2 text-right font-bold text-green-700">1 pt / ₹100</td></tr>
            <tr><td className="py-2">Export sale</td><td className="py-2 text-right font-bold text-green-700">3 pts / ₹100</td></tr>
          </tbody></table>
        </div>
        <div className="card p-4 border-blue-200">
          <h3 className="font-bold mb-2 text-blue-800"><i className="fa-solid fa-cart-shopping mr-1"></i> Earn when you BUY</h3>
          <table className="w-full text-sm"><tbody>
            <tr className="border-b border-gray-50"><td className="py-2">Buy from other store (UPI/cash)</td><td className="py-2 text-right font-bold text-blue-700">0.5 pt / ₹100</td></tr>
            <tr className="border-b border-gray-50"><td className="py-2">Buy on credit</td><td className="py-2 text-right font-bold text-blue-700">1 pt / ₹100</td></tr>
            <tr className="border-b border-gray-50"><td className="py-2">Repeat order bonus</td><td className="py-2 text-right font-bold text-blue-700">+50 pts flat</td></tr>
            <tr><td className="py-2">First buy from new store</td><td className="py-2 text-right font-bold text-blue-700">+100 pts flat</td></tr>
          </tbody></table>
        </div>
      </div>
      <div className="card p-4">
        <h3 className="font-bold mb-2">How you use points</h3>
        <ul className="text-sm text-gray-600 space-y-1 grid sm:grid-cols-2 gap-x-4"><li>✓ Redeem when buying stock from stores</li><li>✓ Max 50% of order value</li><li>✓ Cannot use on same order you earn on</li><li>✓ Auto-suggested at checkout</li></ul>
      </div>
      <div className="card p-4">
        <div className="flex gap-2 mb-3 flex-wrap">
          <button onClick={() => {}} id="ptsTabAll" className="px-3 py-1.5 rounded-full text-xs font-bold tab-on">All</button>
          <button onClick={() => {}} id="ptsTabSell" className="px-3 py-1.5 rounded-full text-xs font-bold tab-off">From Selling</button>
          <button onClick={() => {}} id="ptsTabBuy" className="px-3 py-1.5 rounded-full text-xs font-bold tab-off">From Buying</button>
          <button onClick={() => {}} id="ptsTabSpent" className="px-3 py-1.5 rounded-full text-xs font-bold tab-off">Redeemed</button>
        </div>
        <h3 className="font-bold mb-2">Points Ledger</h3>
        <div className="space-y-1" id="pointsLedger">
          <div className="flex justify-between py-2 border-b border-gray-50 pts-row" data-type="sell"><span className="text-sm"><span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-bold mr-1">SELL</span> Customer order #9021 · ₹840</span><span className="text-green-700 font-bold text-sm">+8 pts</span></div>
          <div className="flex justify-between py-2 border-b border-gray-50 pts-row" data-type="sell"><span className="text-sm"><span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-bold mr-1">SELL</span> Sold to Surat Fashion Hub · ₹24,500</span><span className="text-green-700 font-bold text-sm">+490 pts</span></div>
          <div className="flex justify-between py-2 border-b border-gray-50 pts-row" data-type="buy"><span className="text-sm"><span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold mr-1">BUY</span> Bought oil from Gujarat Agro · ₹14,200 (credit)</span><span className="text-blue-700 font-bold text-sm">+142 pts</span></div>
          <div className="flex justify-between py-2 border-b border-gray-50 pts-row" data-type="spent"><span className="text-sm"><span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-bold mr-1">USED</span> Redeemed on oil purchase</span><span className="text-red-600 font-bold text-sm">-420 pts</span></div>
          <div className="flex justify-between py-2 border-b border-gray-50 pts-row" data-type="sell"><span className="text-sm"><span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-bold mr-1">SELL</span> POS bill #POS-441 · ₹1,240</span><span className="text-green-700 font-bold text-sm">+12 pts</span></div>
          <div className="flex justify-between py-2 border-b border-gray-50 pts-row" data-type="buy"><span className="text-sm"><span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold mr-1">BUY</span> Bought rice from Punjab Grain · ₹31,000</span><span className="text-blue-700 font-bold text-sm">+155 pts</span></div>
          <div className="flex justify-between py-2 border-b border-gray-50 pts-row" data-type="buy"><span className="text-sm"><span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold mr-1">BUY</span> First buy bonus — Spice Traders</span><span className="text-blue-700 font-bold text-sm">+100 pts</span></div>
          <div className="flex justify-between py-2 border-b border-gray-50 pts-row" data-type="spent"><span className="text-sm"><span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-bold mr-1">USED</span> Redeemed on rice purchase</span><span className="text-red-600 font-bold text-sm">-150 pts</span></div>
        </div>
      </div>
    </section>
</>
  );
}
