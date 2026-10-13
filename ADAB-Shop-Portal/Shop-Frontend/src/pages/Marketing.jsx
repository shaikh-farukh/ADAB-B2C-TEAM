import React, { useState } from 'react';
import { useMarketing } from '../hooks/useMarketing';
import { useListings } from '../hooks/useListings';
import { listingApi } from '../api/listingApi';
import { marketingApi } from '../api/marketingApi';

const Marketing = () => {
  const { promotions, coupons, loading, addPromotion, updatePromotion, deletePromotion, addCoupon, updateCoupon } = useMarketing();
  const { listings } = useListings();
  const [activeTab, setActiveTab] = useState('coupons');
  const [showModal, setShowModal] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState(null);
  const [editingPromoId, setEditingPromoId] = useState(null);
  const [expandedPromoId, setExpandedPromoId] = useState(null);

  // Form State - Coupons
  const defaultCouponForm = { 
    applies_to: 'ENTIRE_SHOP', 
    target_value: '', 
    code: '', 
    discount_value: '', 
    discount_type: 'PERCENTAGE', 
    target_audience: 'CUSTOMERS', 
    min_order_value: '', 
    max_discount_cap: '', 
    usage_limit: '', 
    valid_from: '', 
    valid_until: '' 
  };
  const [couponForm, setCouponForm] = useState(defaultCouponForm);

  // Form State - Promotions
  const defaultPromoForm = { 
    title: '', 
    promo_type: 'FLASH_SALE', 
    start_date: '', 
    end_date: '', 
    banner_url: '', 
    scope: 'SPECIFIC_PRODUCTS', 
    selectedProducts: [] 
  };
  const [promoForm, setPromoForm] = useState(defaultPromoForm);
  const [bulkDiscountPct, setBulkDiscountPct] = useState('');
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const toLocalDateTimeInput = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploadingBanner(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await listingApi.uploadImage(fd);
      if (res.url) {
        setPromoForm(prev => ({ ...prev, banner_url: res.url }));
      }
    } catch (err) {
      alert('Failed to upload banner: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        applies_to: couponForm.applies_to || 'ENTIRE_SHOP',
        target_value: couponForm.target_value ? couponForm.target_value : null,
        code: (couponForm.code || '').trim().toUpperCase(),
        discount_value: parseFloat(couponForm.discount_value),
        discount_type: couponForm.discount_type || 'PERCENTAGE',
        target_audience: couponForm.target_audience || 'CUSTOMERS',
        min_order_value: couponForm.min_order_value !== '' && couponForm.min_order_value !== null ? parseFloat(couponForm.min_order_value) : 0,
        max_discount_cap: couponForm.max_discount_cap !== '' && couponForm.max_discount_cap !== null ? parseFloat(couponForm.max_discount_cap) : null,
        usage_limit: couponForm.usage_limit !== '' && couponForm.usage_limit !== null ? parseInt(couponForm.usage_limit, 10) : null,
        valid_from: couponForm.valid_from ? new Date(couponForm.valid_from).toISOString() : new Date().toISOString(),
        valid_until: couponForm.valid_until ? new Date(couponForm.valid_until).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString()
      };

      if (editingCouponId) {
        await updateCoupon(editingCouponId, payload);
      } else {
        await addCoupon(payload);
      }
      setShowModal(false);
      setEditingCouponId(null);
      setCouponForm(defaultCouponForm);
    } catch (err) {
      const errorMsg = err?.response?.data?.details?.[0]?.message 
        || err?.response?.data?.error 
        || err?.message 
        || 'Error saving coupon';
      alert('Error saving coupon: ' + errorMsg);
    }
  };

  const openEditCoupon = (c) => {
    setCouponForm({
      applies_to: c.applies_to || 'ENTIRE_SHOP',
      target_value: c.target_value || '',
      code: c.code || '',
      discount_value: c.discount_value !== undefined && c.discount_value !== null ? parseFloat(c.discount_value) : '',
      discount_type: c.discount_type || 'PERCENTAGE',
      target_audience: c.target_audience || 'CUSTOMERS',
      min_order_value: c.min_order_value !== undefined && c.min_order_value !== null ? parseFloat(c.min_order_value) : '',
      max_discount_cap: c.max_discount_cap !== undefined && c.max_discount_cap !== null ? parseFloat(c.max_discount_cap) : '',
      usage_limit: c.usage_limit || '',
      valid_from: toLocalDateTimeInput(c.valid_from),
      valid_until: toLocalDateTimeInput(c.valid_until)
    });
    setEditingCouponId(c.id);
    setShowModal(true);
  };

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    try {
      if (promoForm.scope === 'SPECIFIC_PRODUCTS' && promoForm.selectedProducts.length === 0) {
        alert('Please select at least one product for this deal or choose Store-Wide Announcement.');
        return;
      }

      // 1. Overlap Check for selected products
      if (promoForm.scope === 'SPECIFIC_PRODUCTS' && promoForm.selectedProducts.length > 0) {
        try {
          const overlapRes = await marketingApi.checkOverlap({
            listing_ids: promoForm.selectedProducts.map(p => p.listing_id),
            start_date: new Date(promoForm.start_date).toISOString(),
            end_date: new Date(promoForm.end_date).toISOString(),
            exclude_promo_id: editingPromoId || null
          });
          const resData = overlapRes.data || overlapRes;
          if (resData.hasOverlap && resData.overlaps && resData.overlaps.length > 0) {
            const conflictList = resData.overlaps
              .map(o => `• "${o.title}" in "${o.promo_title}" (Promo Price: ₹${o.promo_price})`)
              .join('\n');
            const proceed = window.confirm(
              `⚠️ Overlapping Promotion Detected!\n\n` +
              `The following item(s) already have an active deal during this timeframe:\n\n${conflictList}\n\n` +
              `Do you want to override and apply this new promotional deal?`
            );
            if (!proceed) return;
          }
        } catch (e) {
          console.warn('Overlap check skipped:', e.message);
        }
      }

      const payload = {
        title: promoForm.title.trim(),
        promo_type: promoForm.promo_type || 'FLASH_SALE',
        banner_url: promoForm.banner_url ? promoForm.banner_url.trim() : null,
        start_date: promoForm.start_date ? new Date(promoForm.start_date).toISOString() : new Date().toISOString(),
        end_date: promoForm.end_date ? new Date(promoForm.end_date).toISOString() : new Date(Date.now() + 14 * 86400000).toISOString(),
        products: promoForm.scope === 'SPECIFIC_PRODUCTS' ? promoForm.selectedProducts.map(p => ({
          listing_id: p.listing_id,
          promo_price: parseFloat(p.promo_price)
        })) : []
      };

      if (editingPromoId) {
        await updatePromotion(editingPromoId, payload);
      } else {
        await addPromotion(payload);
      }
      setShowModal(false);
      setEditingPromoId(null);
      setPromoForm(defaultPromoForm);
    } catch (err) {
      const errorMsg = err?.response?.data?.details?.[0]?.message 
        || err?.response?.data?.error 
        || err?.message 
        || 'Error saving promotion';
      alert('Error saving promotion: ' + errorMsg);
    }
  };

  const openEditPromo = (p) => {
    const attached = (p.products || []).map(item => ({
      listing_id: item.listing_id,
      promo_price: item.promo_price,
      title: item.title,
      sell_price: item.sell_price,
      mrp: item.mrp,
      image_url: item.image_url
    }));

    setPromoForm({
      title: p.title || '',
      promo_type: p.promo_type || 'FLASH_SALE',
      banner_url: p.banner_url || '',
      start_date: toLocalDateTimeInput(p.start_date),
      end_date: toLocalDateTimeInput(p.end_date),
      scope: attached.length > 0 ? 'SPECIFIC_PRODUCTS' : 'STORE_WIDE',
      selectedProducts: attached
    });
    setEditingPromoId(p.id);
    setShowModal(true);
  };

  const handleDeletePromo = async (id) => {
    if (window.confirm('Are you sure you want to delete this promotion? Participating deals will be reverted.')) {
      try {
        await deletePromotion(id);
      } catch (err) {
        alert('Failed to delete promotion: ' + err.message);
      }
    }
  };

  if (loading) return <div className="p-6">Loading Marketing data...</div>;

  return (
    <div className="fade-in p-2 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Marketing & Offers</h1>
          <p className="text-sm text-gray-500 mt-1">Drive more sales with custom store promotions, flash sales, and coupons.</p>
        </div>
        <button 
          onClick={() => { 
            if (activeTab === 'coupons') {
              setEditingCouponId(null); 
              setCouponForm(defaultCouponForm); 
            } else {
              setEditingPromoId(null);
              setPromoForm(defaultPromoForm);
            }
            setShowModal(true); 
          }} 
          className="bg-brand-dark text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-green-800 transition shadow-sm"
        >
          <i className="fa-solid fa-plus"></i> Create {activeTab === 'coupons' ? 'New Coupon' : 'New Promotion'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-2">
        <button 
          onClick={() => setActiveTab('coupons')}
          className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'coupons' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <i className="fa-solid fa-ticket mr-1.5"></i> Store Coupons
        </button>
        <button 
          onClick={() => setActiveTab('promotions')}
          className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'promotions' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <i className="fa-solid fa-bolt mr-1.5"></i> Promotions & Flash Sales
        </button>
      </div>

      {/* Coupons Tab */}
      {activeTab === 'coupons' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map(c => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
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
                <div className="text-2xl font-black text-brand-dark mb-1">{parseFloat(c.discount_value || 0)}{c.discount_type === 'PERCENTAGE' ? '%' : '₹'} OFF</div>
                <div className="text-xs text-gray-500 font-medium">Min Order: ₹{parseFloat(c.min_order_value || 0)}</div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
                  <span><i className="fa-solid fa-users mr-1"></i> Used: {c.usage_count || 0} / {c.usage_limit || '∞'}</span>
                  <span><i className="fa-solid fa-clock mr-1"></i> Ends: {c.valid_until ? new Date(c.valid_until).toLocaleDateString() : 'No expiry'}</span>
                </div>
              </div>
            </div>
          ))}
          {coupons.length === 0 && <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">No coupons active. Create one to boost conversion!</div>}
        </div>
      )}

      {/* Promotions & Flash Sales Tab */}
      {activeTab === 'promotions' && (
        <div className="grid grid-cols-1 gap-4">
          {promotions.map(p => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
              {p.banner_url && (
                <div className="w-full h-36 bg-gray-100 overflow-hidden relative">
                  <img src={p.banner_url} alt={p.title} className="w-full h-full object-cover" />
                  <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wide">
                    {p.promo_type?.replace(/_/g, ' ')}
                  </div>
                </div>
              )}
              <div className="p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="min-w-0">
                    {!p.banner_url && (
                      <span className="inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 mb-1.5">
                        {p.promo_type?.replace(/_/g, ' ')}
                      </span>
                    )}
                    <h3 className="font-extrabold text-gray-900 text-lg leading-snug">{p.title}</h3>
                    <div className="text-xs text-gray-500 font-medium mt-1 flex items-center gap-2">
                      <span><i className="fa-regular fa-calendar mr-1"></i> {new Date(p.start_date).toLocaleDateString()} – {new Date(p.end_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center shrink-0">
                    <button onClick={() => openEditPromo(p)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition">
                      EDIT
                    </button>
                    <button onClick={() => updatePromotion(p.id, { is_active: !p.is_active })} className={`text-xs font-bold px-3 py-1.5 rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.is_active ? 'LIVE' : 'ENDED'}
                    </button>
                    <button onClick={() => handleDeletePromo(p.id)} className="text-xs text-gray-400 hover:text-red-600 p-2 transition" title="Delete Promotion">
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>

                {/* Participating Products on Deal */}
                {p.products && p.products.length > 0 && (
                  <div className="mt-4 pt-3.5 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                        <i className="fa-solid fa-bolt text-amber-500"></i>
                        {p.products.length} Participating Products on Deal
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setExpandedPromoId(expandedPromoId === p.id ? null : p.id)}
                        className="text-xs font-bold text-brand-dark hover:underline"
                      >
                        {expandedPromoId === p.id ? 'Hide Products ▲' : 'View Products ▼'}
                      </button>
                    </div>

                    {expandedPromoId === p.id && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-dashed border-gray-200 animate-fade-in">
                        {p.products.map(item => (
                          <div key={item.listing_id} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                            <span className="font-semibold text-gray-800 truncate mr-2" title={item.title}>
                              {item.title}
                            </span>
                            <span className="shrink-0 font-extrabold text-emerald-700">
                              ₹{item.promo_price} 
                              <span className="line-through text-gray-400 text-[10px] ml-1">₹{item.sell_price}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {promotions.length === 0 && <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">No promotions running. Launch a flash sale or seasonal promotion!</div>}
        </div>
      )}

      {/* Creation & Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl animate-slide-in">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-100">
              <h3 className="font-extrabold text-xl text-gray-900">
                {editingCouponId || editingPromoId ? 'Edit' : 'Create'} {activeTab === 'coupons' ? 'Coupon' : 'Promotion'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            {activeTab === 'coupons' ? (
              <form onSubmit={handleCreateCoupon} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Coupon applies to</label>
                  <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={couponForm.applies_to} onChange={e=>setCouponForm({...couponForm, applies_to: e.target.value, target_value: ''})}>
                    <option value="ENTIRE_SHOP">Entire shop (all products)</option>
                    <option value="SPECIFIC_PRODUCTS">Specific product(s)</option>
                    <option value="CATEGORY">Product category</option>
                    <option value="DELIVERY">Delivery / freight</option>
                  </select>
                </div>
                {couponForm.applies_to === 'SPECIFIC_PRODUCTS' && (
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Select product</label>
                    <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={couponForm.target_value} onChange={e=>setCouponForm({...couponForm, target_value: e.target.value})}>
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
                    <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={couponForm.target_value} onChange={e=>setCouponForm({...couponForm, target_value: e.target.value})}>
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
                    <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={couponForm.target_value} onChange={e=>setCouponForm({...couponForm, target_value: e.target.value})}>
                      <option value="">-- Select delivery --</option>
                      <option value="Free fast delivery (customers)">Free fast delivery (customers)</option>
                      <option value="Free same-day delivery">Free same-day delivery</option>
                      <option value="Free Porter truck (store orders)">Free Porter truck (store orders)</option>
                      <option value="₹ off delivery fee">₹ off delivery fee</option>
                    </select>
                  </div>
                )}
                <div><label className="text-xs font-bold text-gray-700 mb-1 block">Coupon Code</label><input required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm uppercase font-mono" value={couponForm.code} onChange={e=>setCouponForm({...couponForm, code: e.target.value.toUpperCase()})} placeholder="e.g. WELCOME10" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-gray-700 mb-1 block">Discount Type</label><select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={couponForm.discount_type} onChange={e=>setCouponForm({...couponForm, discount_type: e.target.value})}><option value="PERCENTAGE">Percentage off</option><option value="FLAT_AMOUNT">Flat ₹ off</option></select></div>
                  <div><label className="text-xs font-bold text-gray-700 mb-1 block">Value</label><input required type="number" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={couponForm.discount_value} onChange={e=>setCouponForm({...couponForm, discount_value: e.target.value})} /></div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">For who?</label>
                  <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={couponForm.target_audience} onChange={e=>setCouponForm({...couponForm, target_audience: e.target.value})}>
                    <option value="CUSTOMERS">Customers (app users)</option>
                    <option value="B2B">Other stores (bulk)</option>
                    <option value="BOTH">Both</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-[11px] font-bold text-gray-700 mb-1 block">Min Order (₹)</label><input type="number" className="w-full border border-gray-200 rounded-xl px-2 py-2 text-xs" value={couponForm.min_order_value} onChange={e=>setCouponForm({...couponForm, min_order_value: e.target.value})} placeholder="Optional" /></div>
                  <div><label className="text-[11px] font-bold text-gray-700 mb-1 block">Max Discount (₹)</label><input type="number" className="w-full border border-gray-200 rounded-xl px-2 py-2 text-xs" value={couponForm.max_discount_cap} onChange={e=>setCouponForm({...couponForm, max_discount_cap: e.target.value})} placeholder="Optional cap" /></div>
                  <div><label className="text-[11px] font-bold text-gray-700 mb-1 block">Usage Limit</label><input type="number" className="w-full border border-gray-200 rounded-xl px-2 py-2 text-xs" value={couponForm.usage_limit} onChange={e=>setCouponForm({...couponForm, usage_limit: e.target.value})} placeholder="Infinite" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-gray-700 mb-1 block">Valid From</label><input required type="datetime-local" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={couponForm.valid_from} onChange={e=>setCouponForm({...couponForm, valid_from: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-gray-700 mb-1 block">Valid Until</label><input required type="datetime-local" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={couponForm.valid_until} onChange={e=>setCouponForm({...couponForm, valid_until: e.target.value})} /></div>
                </div>
                <button type="submit" className="w-full bg-brand-dark text-white font-bold rounded-xl py-3 mt-4 hover:bg-green-800 transition">{editingCouponId ? 'Save Changes' : 'Launch Coupon'}</button>
              </form>
            ) : (
              <form onSubmit={handleCreatePromo} className="space-y-5">
                {/* Title & Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Promotion Title</label>
                    <input required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={promoForm.title} onChange={e=>setPromoForm({...promoForm, title: e.target.value})} placeholder="e.g. Diwali Flash Sale" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Campaign Type</label>
                    <select 
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white" 
                      value={promoForm.promo_type} 
                      onChange={e=>setPromoForm({...promoForm, promo_type: e.target.value})}
                    >
                      <option value="FLASH_SALE">Flash Sale (Lightning Deals)</option>
                      <option value="SEASONAL">Festive / Seasonal Offer</option>
                      <option value="CLEARANCE">Clearance Discount</option>
                      <option value="STORE_BANNER">Store Announcement Banner</option>
                    </select>
                  </div>
                </div>

                {/* Banner Upload & Preview */}
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Campaign Banner Image</label>
                  {promoForm.banner_url ? (
                    <div className="relative mb-2 rounded-2xl overflow-hidden border border-gray-200 group">
                      <img src={promoForm.banner_url} alt="Campaign Banner" className="w-full h-32 object-cover" />
                      <button 
                        type="button" 
                        onClick={() => setPromoForm(prev => ({ ...prev, banner_url: '' }))} 
                        className="absolute top-2 right-2 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1 transition"
                      >
                        <i className="fa-solid fa-trash"></i> Remove Banner
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 items-center">
                      <label className={`px-4 py-2 border border-dashed border-emerald-400 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold cursor-pointer hover:bg-emerald-100 transition flex items-center gap-2 ${isUploadingBanner ? 'opacity-50 pointer-events-none' : ''}`}>
                        <i className="fa-solid fa-cloud-arrow-up"></i>
                        {isUploadingBanner ? 'Uploading...' : 'Upload Banner Image'}
                        <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                      </label>
                      <span className="text-xs text-gray-400 font-semibold">or paste URL:</span>
                      <input 
                        type="url" 
                        placeholder="https://.../banner.png" 
                        value={promoForm.banner_url || ''} 
                        onChange={e => setPromoForm(prev => ({ ...prev, banner_url: e.target.value }))} 
                        className="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-brand-dark" 
                      />
                    </div>
                  )}
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Start Date & Time</label>
                    <input required type="datetime-local" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={promoForm.start_date} onChange={e=>setPromoForm({...promoForm, start_date: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">End Date & Time</label>
                    <input required type="datetime-local" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={promoForm.end_date} onChange={e=>setPromoForm({...promoForm, end_date: e.target.value})} />
                  </div>
                </div>

                {/* Campaign Scope Toggle */}
                <div className="pt-2 border-t border-gray-100">
                  <label className="text-xs font-bold text-gray-700 mb-2 block">Participating Deals</label>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button 
                      type="button" 
                      onClick={() => setPromoForm(prev => ({ ...prev, scope: 'SPECIFIC_PRODUCTS' }))}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${promoForm.scope === 'SPECIFIC_PRODUCTS' ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      <i className="fa-solid fa-bolt text-amber-500"></i> Specific Products on Deal
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setPromoForm(prev => ({ ...prev, scope: 'STORE_WIDE' }))}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${promoForm.scope === 'STORE_WIDE' ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      <i className="fa-solid fa-bullhorn text-blue-500"></i> Store-Wide Announcement
                    </button>
                  </div>

                  {/* Product Picker & Pricing */}
                  {promoForm.scope === 'SPECIFIC_PRODUCTS' && (
                    <div className="space-y-3 bg-gray-50/70 border border-gray-200 p-4 rounded-2xl">
                      <div>
                        <label className="text-xs font-bold text-gray-700 mb-1 block">Select Products to Add</label>
                        <select 
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white font-medium"
                          onChange={(e) => {
                            const listingId = e.target.value;
                            if (!listingId) return;
                            const found = listings.find(l => l.id === listingId);
                            if (found && !promoForm.selectedProducts.some(p => p.listing_id === listingId)) {
                              const defaultPromo = Math.max(1, Math.round(found.sell_price * 0.85));
                              setPromoForm(prev => ({
                                ...prev,
                                selectedProducts: [
                                  ...prev.selectedProducts,
                                  {
                                    listing_id: found.id,
                                    title: found.title,
                                    sell_price: found.sell_price,
                                    mrp: found.mrp,
                                    image_url: found.image_url,
                                    promo_price: defaultPromo
                                  }
                                ]
                              }));
                            }
                            e.target.value = '';
                          }}
                        >
                          <option value="">-- Choose a product from catalog --</option>
                          {listings && listings
                            .filter(l => !promoForm.selectedProducts.some(p => p.listing_id === l.id))
                            .map(l => (
                              <option key={l.id} value={l.id}>
                                {l.title} (₹{l.sell_price} / MRP ₹{l.mrp})
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Quick Bulk Discount Tool */}
                      {promoForm.selectedProducts.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <span className="text-xs font-bold text-emerald-950 shrink-0">Quick Bulk Discount:</span>
                          <input 
                            type="number" 
                            placeholder="e.g. 20" 
                            min="1" 
                            max="90" 
                            value={bulkDiscountPct} 
                            onChange={e => setBulkDiscountPct(e.target.value)} 
                            className="w-20 px-2 py-1 text-xs border border-emerald-300 rounded-lg bg-white font-bold outline-none" 
                          />
                          <span className="text-xs font-bold text-emerald-900">% OFF</span>
                          <button 
                            type="button" 
                            onClick={() => {
                              const pct = parseFloat(bulkDiscountPct);
                              if (!pct || pct <= 0) return;
                              setPromoForm(prev => ({
                                ...prev,
                                selectedProducts: prev.selectedProducts.map(p => ({
                                  ...p,
                                  promo_price: Math.max(1, Math.round(p.sell_price * (1 - pct / 100)))
                                }))
                              }));
                            }} 
                            className="px-3 py-1 bg-brand-dark hover:bg-green-800 text-white font-bold text-xs rounded-lg transition"
                          >
                            Apply to All ({promoForm.selectedProducts.length})
                          </button>
                        </div>
                      )}

                      {/* Selected Items List */}
                      {promoForm.selectedProducts.length > 0 ? (
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                          {promoForm.selectedProducts.map((p, idx) => {
                            const savings = Math.max(0, p.sell_price - p.promo_price);
                            const savingsPct = p.sell_price > 0 ? Math.round((savings / p.sell_price) * 100) : 0;
                            return (
                              <div key={p.listing_id} className="flex items-center justify-between gap-3 p-2.5 border border-gray-200 rounded-xl bg-white text-xs shadow-2xs">
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-gray-900 truncate">{p.title}</div>
                                  <div className="text-[11px] text-gray-500 mt-0.5">
                                    Base: ₹{p.sell_price} • MRP: ₹{p.mrp}
                                    {savingsPct > 0 && (
                                      <span className="ml-2 font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                        Save ₹{savings} ({savingsPct}% off)
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[11px] font-bold text-gray-700">Deal: ₹</span>
                                  <input 
                                    type="number" 
                                    min="1" 
                                    max={p.sell_price} 
                                    value={p.promo_price} 
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setPromoForm(prev => ({
                                        ...prev,
                                        selectedProducts: prev.selectedProducts.map((item, i) => 
                                          i === idx ? { ...item, promo_price: val } : item
                                        )
                                      }));
                                    }} 
                                    className="w-20 px-2 py-1 border border-gray-300 rounded-lg font-bold text-emerald-900 bg-emerald-50/50 outline-none focus:border-brand-dark" 
                                  />
                                  <button 
                                    type="button" 
                                    onClick={() => {
                                      setPromoForm(prev => ({
                                        ...prev,
                                        selectedProducts: prev.selectedProducts.filter((_, i) => i !== idx)
                                      }));
                                    }} 
                                    className="text-gray-400 hover:text-red-500 p-1.5 transition"
                                    title="Remove from deal"
                                  >
                                    <i className="fa-solid fa-trash-can"></i>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-xs text-gray-400 font-medium">
                          No products added yet. Pick products from the dropdown above to create flash deals!
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button type="submit" className="w-full bg-brand-dark text-white font-bold rounded-xl py-3 mt-4 hover:bg-green-800 transition shadow-md">
                  {editingPromoId ? 'Save Changes' : 'Launch Promotion & Deals'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketing;
