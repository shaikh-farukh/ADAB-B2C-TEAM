import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sellerApi } from '../api/sellerApi';

export default function PointsPage() {
  const [pointsData, setPointsData] = useState({ balance: 0, total_earned: 0, total_redeemed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPoints() {
      try {
        setLoading(true);
        const res = await sellerApi.getPoints();
        if (res.data && res.data.success) {
          setPointsData(res.data.data);
        }
      } catch (e) {
        // fallback to default
      } finally {
        setLoading(false);
      }
    }
    loadPoints();
  }, []);

  return (
    <section id="sec-points" className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold">Reward Points</h1>
        <p className="text-sm text-gray-500">Earn when you sell AND when you buy — redeem on your next purchase</p>
      </div>

      <div className="card p-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md">
        <div className="text-amber-100 text-sm">Your balance</div>
        <div className="text-4xl font-extrabold mt-1" id="pointsBig">
          {Number(pointsData.balance || 0).toLocaleString('en-IN')}
        </div>
        <div className="text-amber-100 text-sm mt-1">1 point = ₹1 discount · Valid 12 months</div>
        <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
          <div className="bg-white/20 rounded-lg p-2">
            <div className="font-bold text-lg">+{Number(pointsData.total_earned || 0).toLocaleString('en-IN')}</div>
            <div className="text-amber-100">Total Earned</div>
          </div>
          <div className="bg-white/20 rounded-lg p-2">
            <div className="font-bold text-lg">0</div>
            <div className="text-amber-100">Expiring Soon</div>
          </div>
          <div className="bg-white/20 rounded-lg p-2">
            <div className="font-bold text-lg">-{Number(pointsData.total_redeemed || 0).toLocaleString('en-IN')}</div>
            <div className="text-amber-100">Redeemed</div>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-4 border-green-200">
          <h3 className="font-bold mb-2 text-green-800"><i className="fa-solid fa-arrow-up mr-1"></i> Earn when you SELL</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-50"><td className="py-2">Customer app order</td><td className="py-2 text-right font-bold text-green-700">1 pt / ₹100</td></tr>
              <tr className="border-b border-gray-50"><td className="py-2">Sell to other store</td><td className="py-2 text-right font-bold text-green-700">2 pts / ₹100</td></tr>
              <tr className="border-b border-gray-50"><td className="py-2">POS walk-in bill</td><td className="py-2 text-right font-bold text-green-700">1 pt / ₹100</td></tr>
              <tr><td className="py-2">Export sale</td><td className="py-2 text-right font-bold text-green-700">3 pts / ₹100</td></tr>
            </tbody>
          </table>
        </div>
        <div className="card p-4 border-blue-200">
          <h3 className="font-bold mb-2 text-blue-800"><i className="fa-solid fa-cart-shopping mr-1"></i> Earn when you BUY</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-50"><td className="py-2">Buy from other store (UPI/cash)</td><td className="py-2 text-right font-bold text-blue-700">0.5 pt / ₹100</td></tr>
              <tr className="border-b border-gray-50"><td className="py-2">Buy on credit</td><td className="py-2 text-right font-bold text-blue-700">1 pt / ₹100</td></tr>
              <tr className="border-b border-gray-50"><td className="py-2">Repeat order bonus</td><td className="py-2 text-right font-bold text-blue-700">+50 pts flat</td></tr>
              <tr><td className="py-2">First buy from new store</td><td className="py-2 text-right font-bold text-blue-700">+100 pts flat</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-bold mb-2">How you use points</h3>
        <ul className="text-sm text-gray-600 space-y-1 grid sm:grid-cols-2 gap-x-4">
          <li>✓ Redeem when buying stock from stores</li>
          <li>✓ Max 50% of order value</li>
          <li>✓ Cannot use on same order you earn on</li>
          <li>✓ Auto-suggested at checkout</li>
        </ul>
      </div>
    </section>
  );
}

