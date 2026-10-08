import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sellerApi } from '../api/sellerApi';

export default function OffersPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('all');

  useEffect(() => {
    async function loadCoupons() {
      try {
        setLoading(true);
        const res = await sellerApi.getCoupons();
        const raw = res?.data !== undefined ? res.data : res;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        setCoupons(list);
      } catch (e) {
        setCoupons([]);
      } finally {
        setLoading(false);
      }
    }
    loadCoupons();
  }, []);

  const filteredCoupons = coupons.filter(c => {
    if (activeType === 'all') return true;
    return (c.discount_type || '').toLowerCase().includes(activeType) || (c.type || '').toLowerCase().includes(activeType);
  });

  return (
    <section id="sec-offers" className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold">Coupons &amp; Offers</h1>
          <p className="text-sm text-gray-500">Product, shop, delivery, or category discounts — for customers or other stores</p>
        </div>
        <button onClick={() => {}} className="btn-primary text-sm"><i className="fa-solid fa-plus mr-1"></i> Create Coupon</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setActiveType('all')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${activeType === 'all' ? 'tab-on' : 'tab-off'}`}>All ({coupons.length})</button>
        <button onClick={() => setActiveType('percentage')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${activeType === 'percentage' ? 'tab-on' : 'tab-off'}`}>Percentage</button>
        <button onClick={() => setActiveType('fixed')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${activeType === 'fixed' ? 'tab-on' : 'tab-off'}`}>Flat Amount</button>
      </div>

      <div className="space-y-3" id="couponList">
        {loading && (
          <div className="card p-6 text-center text-gray-500 text-sm">
            <i className="fa-solid fa-spinner fa-spin mr-2"></i> Loading coupons...
          </div>
        )}

        {!loading && filteredCoupons.length === 0 && (
          <div className="card p-6 text-center text-gray-500 text-sm">
            No active coupons configured. Click "Create Coupon" to add promotional offers.
          </div>
        )}

        {!loading && filteredCoupons.map((coupon, idx) => {
          const discountDesc = coupon.discount_type === 'PERCENTAGE' 
            ? `${coupon.discount_value}% off` 
            : `₹${coupon.discount_value} off`;
          const minSpend = coupon.min_order_value ? `Min order ₹${coupon.min_order_value}` : 'No minimum spend';
          const usage = `${coupon.usage_count || 0} used`;

          return (
            <div key={coupon.id || idx} className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded uppercase">
                    {coupon.discount_type || 'OFFER'}
                  </span>
                  <span className="font-mono font-bold text-lg">{coupon.code}</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">{discountDesc} · {coupon.description || 'Promotional Coupon'}</div>
                <div className="text-xs text-gray-400">{minSpend} · {usage}</div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${coupon.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {coupon.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

