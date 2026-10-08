import React, { useState } from 'react';
import { useMarketing } from '../hooks/useMarketing';
import { useListings } from '../hooks/useListings';

const Marketing = () => {
  const { promotions, coupons, loading, addPromotion, updatePromotion, addCoupon, updateCoupon } = useMarketing();
  const { listings } = useListings();
  const [activeTab, setActiveTab] = useState('coupons');
  const [showModal, setShowModal] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState(null);
  const [editingPromoId, setEditingPromoId] = useState(null);

  // Form State
  const defaultCouponForm = { applies_to: 'ENTIRE_SHOP', target_value: '', code: '', discount_value: '', discount_type: 'PERCENTAGE', target_audience: 'CUSTOMERS', min_order_value: '', max_discount_cap: '', usage_limit: '', valid_from: '', valid_until: '' };
  const [couponForm, setCouponForm] = useState(defaultCouponForm);
  const defaultPromoForm = { title: '', promo_type: 'SEASONAL', start_date: '', end_date: '' };
  const [promoForm, setPromoForm] = useState(defaultPromoForm);

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    try {
      if (editingCouponId) {
        await updateCoupon(editingCouponId, couponForm);
      } else {
        await addCoupon(couponForm);
      }
      setShowModal(false);
      setEditingCouponId(null);
      setCouponForm(defaultCouponForm);
    } catch (err) {
      alert('Error saving coupon: ' + (err.response?.data?.error || err.message));
    }
  };

  const openEditCoupon = (c) => {
    const toLocalString = (dateString) => dateString ? new Date(dateString).toISOString().slice(0, 16) : '';
    setCouponForm({
      applies_to: c.applies_to || 'ENTIRE_SHOP',
      target_value: c.target_value || '',
      code: c.code,
      discount_value: c.discount_value,
      discount_type: c.discount_type,
      target_audience: c.target_audience || 'CUSTOMERS',
      min_order_value: c.min_order_value || '',
      max_discount_cap: c.max_discount_cap || '',
      usage_limit: c.usage_limit || '',
      valid_from: toLocalString(c.valid_from),
      valid_until: toLocalString(c.valid_until)
    });
    setEditingCouponId(c.id);
    setShowModal(true);
  };

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    try {
      if (editingPromoId) {
        await updatePromotion(editingPromoId, promoForm);
      } else {
        await addPromotion(promoForm);
      }
      setShowModal(false);
      setEditingPromoId(null);
      setPromoForm(defaultPromoForm);
    } catch (err) {
      alert('Error saving promotion: ' + (err.response?.data?.error || err.message));
    }
  };

  const openEditPromo = (p) => {
    const toLocalString = (dateString) => dateString ? new Date(dateString).toISOString().slice(0, 16) : '';
    setPromoForm({
      title: p.title,
      promo_type: p.promo_type,
      start_date: toLocalString(p.start_date),
      end_date: toLocalString(p.end_date)
    });
    setEditingPromoId(p.id);
    setShowModal(true);
  };

  if (loading) return <div className="p-6">Loading Marketing data...</div>;

  return (
    <div className="fade-in p-2 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Marketing & Offers</h1>
          <p className="text-sm text-gray-500 mt-1">Drive more sales with custom store promotions and coupons.</p>
        </div>
        <button 
          onClick={() => { setEditingCouponId(null); setCouponForm(defaultCouponForm); setShowModal(true); }} 
          className="bg-brand-dark text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-green-800 transition"
        >
          <i className="fa-solid fa-plus"></i> Create New Offer
        </button>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-2">
        <button 
          onClick={() => setActiveTab('coupons')}
          className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'coupons' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <i className="fa-solid fa-ticket mr-1"></i> Store Coupons
        </button>
        <button 
          onClick={() => setActiveTab('promotions')}
          className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'promotions' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <i className="fa-solid fa-bullhorn mr-1"></i> Promotions
        </button>
      </div>

      {activeTab === 'coupons' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map(c => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full z-0"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-3">
                  <div className="text-lg font-extrabold text-gray-900 border-2 border-dashed border-gray-300 px-3 py-1 rounded bg-gray-50 inline-block tracking-widest">{c.code}</div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditCoupon(c)} className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200">EDIT</button>
                    <button onClick={() => updateCoupon(c.id, { is_active: !c.is_active })} className={`text-[10px] font-bold px-2 py-1 rounded ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {c.is_active ? 'ACTIVE' : 'PAUSED'}
                    </button>
                  </div>
                </div>
                <div className="text-2xl font-black text-brand-dark mb-1">{c.discount_value}{c.discount_type === 'PERCENTAGE' ? '%' : '₹'} OFF</div>
                <div className="text-xs text-gray-500 font-medium">Min Order: ₹{c.min_order_value || 0}</div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
                  <span><i className="fa-solid fa-users mr-1"></i> Used: {c.usage_count || 0} / {c.usage_limit || '∞'}</span>
                  <span><i className="fa-solid fa-clock mr-1"></i> Ends: {new Date(c.valid_until).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
          {coupons.length === 0 && <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">No coupons active. Create one to boost conversion!</div>}
        </div>
      )}

      {activeTab === 'promotions' && (
        <div className="grid grid-cols-1 gap-4">
          {promotions.map(p => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl">
                  <i className="fa-solid fa-bolt"></i>
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-lg">{p.title}</h3>
                  <div className="text-xs text-gray-500 font-medium mt-1">
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{p.promo_type}</span> • 
                    From {new Date(p.start_date).toLocaleDateString()} to {new Date(p.end_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="text-right flex gap-2 items-center">
                <button onClick={() => openEditPromo(p)} className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                  EDIT
                </button>
                <button onClick={() => updatePromotion(p.id, { is_active: !p.is_active })} className={`text-[10px] font-bold px-2 py-1 rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.is_active ? 'LIVE' : 'ENDED'}
                </button>
              </div>
            </div>
          ))}
          {promotions.length === 0 && <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">No promotions running.</div>}
        </div>
      )}

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-extrabold text-lg">{editingCouponId || editingPromoId ? 'Edit' : 'Create'} {activeTab === 'coupons' ? 'Coupon' : 'Promotion'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><i className="fa-solid fa-xmark text-xl"></i></button>
            </div>
            
            {activeTab === 'coupons' ? (
              <form onSubmit={handleCreateCoupon} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Coupon applies to</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={couponForm.applies_to} onChange={e=>setCouponForm({...couponForm, applies_to: e.target.value, target_value: ''})}>
                    <option value="ENTIRE_SHOP">Entire shop (all products)</option>
                    <option value="SPECIFIC_PRODUCTS">Specific product(s)</option>
                    <option value="CATEGORY">Product category</option>
                    <option value="DELIVERY">Delivery / freight</option>
                  </select>
                </div>
                {couponForm.applies_to === 'SPECIFIC_PRODUCTS' && (
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Select product</label>
                    <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={couponForm.target_value} onChange={e=>setCouponForm({...couponForm, target_value: e.target.value})}>
                      <option value="">-- Select a product --</option>
                      {listings && listings.map(l => (
                        <option key={l.id} value={l.id}>{l.title}</option>
                      ))}
                    </select>
                  </div>
                )}
                {couponForm.applies_to === 'CATEGORY' && (
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Category</label>
                    <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={couponForm.target_value} onChange={e=>setCouponForm({...couponForm, target_value: e.target.value})}>
                      <option value="">-- Select category --</option>
                      <option value="Grocery">Grocery</option>
                      <option value="Clothing">Clothing</option>
                      <option value="Dairy">Dairy</option>
                      <option value="Spices">Spices</option>
                      <option value="Snacks">Snacks</option>
                    </select>
                  </div>
                )}
                {couponForm.applies_to === 'DELIVERY' && (
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Delivery type</label>
                    <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={couponForm.target_value} onChange={e=>setCouponForm({...couponForm, target_value: e.target.value})}>
                      <option value="">-- Select delivery --</option>
                      <option value="Free fast delivery (customers)">Free fast delivery (customers)</option>
                      <option value="Free same-day delivery">Free same-day delivery</option>
                      <option value="Free Porter truck (store orders)">Free Porter truck (store orders)</option>
                      <option value="₹ off delivery fee">₹ off delivery fee</option>
                    </select>
                  </div>
                )}
                <div><label className="text-xs font-bold text-gray-700 mb-1 block">Coupon Code</label><input required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase" value={couponForm.code} onChange={e=>setCouponForm({...couponForm, code: e.target.value.toUpperCase()})} placeholder="e.g. WELCOME10" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-gray-700 mb-1 block">Discount Type</label><select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={couponForm.discount_type} onChange={e=>setCouponForm({...couponForm, discount_type: e.target.value})}><option value="PERCENTAGE">Percentage off</option><option value="FLAT_AMOUNT">Flat ₹ off</option></select></div>
                  <div><label className="text-xs font-bold text-gray-700 mb-1 block">Value</label><input required type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={couponForm.discount_value} onChange={e=>setCouponForm({...couponForm, discount_value: e.target.value})} /></div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">For who?</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={couponForm.target_audience} onChange={e=>setCouponForm({...couponForm, target_audience: e.target.value})}>
                    <option value="CUSTOMERS">Customers (app users)</option>
                    <option value="B2B">Other stores (bulk)</option>
                    <option value="BOTH">Both</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-[11px] font-bold text-gray-700 mb-1 block">Min Order (₹)</label><input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs" value={couponForm.min_order_value} onChange={e=>setCouponForm({...couponForm, min_order_value: e.target.value})} placeholder="Optional" /></div>
                  <div><label className="text-[11px] font-bold text-gray-700 mb-1 block">Max Discount (₹)</label><input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs" value={couponForm.max_discount_cap} onChange={e=>setCouponForm({...couponForm, max_discount_cap: e.target.value})} placeholder="Optional cap" /></div>
                  <div><label className="text-[11px] font-bold text-gray-700 mb-1 block">Usage Limit</label><input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs" value={couponForm.usage_limit} onChange={e=>setCouponForm({...couponForm, usage_limit: e.target.value})} placeholder="Infinite" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-gray-700 mb-1 block">Valid From</label><input required type="datetime-local" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={couponForm.valid_from} onChange={e=>setCouponForm({...couponForm, valid_from: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-gray-700 mb-1 block">Valid Until</label><input required type="datetime-local" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={couponForm.valid_until} onChange={e=>setCouponForm({...couponForm, valid_until: e.target.value})} /></div>
                </div>
                <button type="submit" className="w-full bg-brand-dark text-white font-bold rounded-xl py-3 mt-4 hover:bg-green-800">{editingCouponId ? 'Save Changes' : 'Launch Coupon'}</button>
              </form>
            ) : (
              <form onSubmit={handleCreatePromo} className="space-y-4">
                <div><label className="text-xs font-bold text-gray-700 mb-1 block">Promotion Title</label><input required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={promoForm.title} onChange={e=>setPromoForm({...promoForm, title: e.target.value})} placeholder="e.g. Diwali Mega Sale" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-gray-700 mb-1 block">Start Date</label><input required type="datetime-local" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={promoForm.start_date} onChange={e=>setPromoForm({...promoForm, start_date: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-gray-700 mb-1 block">End Date</label><input required type="datetime-local" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={promoForm.end_date} onChange={e=>setPromoForm({...promoForm, end_date: e.target.value})} /></div>
                </div>
                <button type="submit" className="w-full bg-brand-dark text-white font-bold rounded-xl py-3 mt-4 hover:bg-green-800">{editingPromoId ? 'Save Changes' : 'Create Promotion'}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketing;
