import React, { useState } from 'react';
import { usePricing } from '../hooks/usePricing';
import { useListings } from '../hooks/useListings';

const Pricing = () => {
  const { schedules, previews, activeCoupons, loading, schedulePricing, updateBasePricing, updateBulkPricing } = usePricing();
  const { 
    listings, 
    loading: loadingListings, 
    refresh: refreshListings,
    pagination: { currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, totalItems }
  } = useListings();
  const [activeTab, setActiveTab] = useState('current'); // 'current' or 'schedules'
  
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState('');
  const [priceForm, setPriceForm] = useState({ scheduled_price: '', start_date: '', end_date: '' });

  const [selectedListings, setSelectedListings] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({ type: 'PERCENTAGE', value: '' });

  const [showSingleEditModal, setShowSingleEditModal] = useState(false);
  const [singleEditForm, setSingleEditForm] = useState({ id: '', mrp: '', sell_price: '' });

  // Price Waterfall Breakdown & Simulator State
  const [breakdownListing, setBreakdownListing] = useState(null);
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);
  const [simListingId, setSimListingId] = useState('');
  const [simPromoEnabled, setSimPromoEnabled] = useState(false);
  const [simPromoMode, setSimPromoMode] = useState('FLAT'); // 'FLAT' (₹ off), 'PERCENTAGE' (% off), or 'EXACT' (Exact deal price)
  const [simPromoValue, setSimPromoValue] = useState('');
  const [simCouponEnabled, setSimCouponEnabled] = useState(false);
  const [simCouponSource, setSimCouponSource] = useState('EXISTING'); // 'EXISTING' or 'CUSTOM'
  const [simSelectedCouponCode, setSimSelectedCouponCode] = useState('');
  const [simCustomCouponType, setSimCustomCouponType] = useState('PERCENTAGE'); // 'PERCENTAGE' or 'FLAT'
  const [simCustomCouponValue, setSimCustomCouponValue] = useState('');
  const [simAssumeMinOrderMet, setSimAssumeMinOrderMet] = useState(true);

  const handleSchedulePrice = async (e) => {
    e.preventDefault();
    try {
      await schedulePricing(selectedListing, {
        scheduled_price: parseFloat(priceForm.scheduled_price),
        start_date: priceForm.start_date,
        end_date: priceForm.end_date
      });
      setShowScheduleModal(false);
    } catch (err) {
      alert('Error scheduling price: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleBulkUpdate = async (e) => {
    e.preventDefault();
    try {
      const updates = selectedListings.map(id => {
        const listing = listings.find(l => l.id === id);
        let newSellPrice = listing.sell_price;
        if (bulkForm.type === 'PERCENTAGE') {
          newSellPrice = listing.mrp - (listing.mrp * (parseFloat(bulkForm.value) / 100));
        } else if (bulkForm.type === 'FLAT') {
          newSellPrice = listing.mrp - parseFloat(bulkForm.value);
        } else if (bulkForm.type === 'EXACT') {
          newSellPrice = parseFloat(bulkForm.value);
        }
        return { listing_id: id, mrp: listing.mrp, sell_price: newSellPrice > 0 ? newSellPrice : 0 };
      });
      await updateBulkPricing(updates);
      await refreshListings();
      setShowBulkModal(false);
      setSelectedListings([]);
      alert('Prices updated successfully!');
    } catch (err) {
      alert('Error updating prices: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSingleEdit = async (e) => {
    e.preventDefault();
    try {
      await updateBasePricing(singleEditForm.id, {
        mrp: parseFloat(singleEditForm.mrp),
        sell_price: parseFloat(singleEditForm.sell_price)
      });
      await refreshListings();
      setShowSingleEditModal(false);
    } catch (err) {
      alert('Error updating price: ' + (err.response?.data?.error || err.message));
    }
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedListings(listings.map(l => l.id));
    } else {
      setSelectedListings([]);
    }
  };

  const toggleSelect = (id) => {
    if (selectedListings.includes(id)) {
      setSelectedListings(selectedListings.filter(l => l !== id));
    } else {
      setSelectedListings([...selectedListings, id]);
    }
  };

  if (loading || loadingListings) return <div className="p-6">Loading Pricing data...</div>;

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const selectedSimListing = listings.find(l => l.id === simListingId) || (listings.length > 0 ? listings[0] : null);
  const simBaseSellPrice = selectedSimListing ? parseFloat(selectedSimListing.sell_price) || 0 : 0;
  const simMrp = selectedSimListing ? parseFloat(selectedSimListing.mrp) || simBaseSellPrice : 0;

  // Layer 1: Simulated Promotion / Deal
  let simEffectivePromoPrice = simBaseSellPrice;
  let simPromoDiscount = 0;
  let simPromoWarning = '';

  if (simPromoEnabled && simPromoValue !== '' && !isNaN(parseFloat(simPromoValue))) {
    const val = parseFloat(simPromoValue);
    if (simPromoMode === 'FLAT') {
      if (val > simBaseSellPrice) {
        simPromoDiscount = simBaseSellPrice;
        simEffectivePromoPrice = 0;
        simPromoWarning = `Flat discount (₹${val}) capped at base sell price (₹${simBaseSellPrice}).`;
      } else {
        simPromoDiscount = Math.max(0, val);
        simEffectivePromoPrice = Math.max(0, simBaseSellPrice - simPromoDiscount);
      }
    } else if (simPromoMode === 'PERCENTAGE') {
      const pct = Math.min(Math.max(0, val), 100);
      simPromoDiscount = (simBaseSellPrice * pct) / 100;
      simEffectivePromoPrice = Math.max(0, simBaseSellPrice - simPromoDiscount);
    } else if (simPromoMode === 'EXACT') {
      if (val < simBaseSellPrice) {
        simEffectivePromoPrice = Math.max(0, val);
        simPromoDiscount = simBaseSellPrice - simEffectivePromoPrice;
      } else {
        simEffectivePromoPrice = val;
        simPromoDiscount = 0;
        if (val > simBaseSellPrice) {
          simPromoWarning = `Deal price (₹${val}) is higher than current sell price (₹${simBaseSellPrice}).`;
        }
      }
    }
  }

  // Layer 2: Simulated Store Coupon
  let simCouponDiscount = 0;
  let simCouponCapped = false;
  let simCouponMinOrderWarning = '';
  let foundCoupon = null;

  if (simCouponEnabled) {
    if (simCouponSource === 'EXISTING' && simSelectedCouponCode) {
      foundCoupon = activeCoupons.find(c => c.code === simSelectedCouponCode);
      if (foundCoupon) {
        const minOrder = parseFloat(foundCoupon.min_order_value) || 0;
        if (minOrder > 0 && simEffectivePromoPrice < minOrder) {
          simCouponMinOrderWarning = `Coupon requires min order value of ₹${minOrder.toFixed(2)}. Single item price (₹${simEffectivePromoPrice.toFixed(2)}) is below this.`;
        }

        if (minOrder === 0 || simEffectivePromoPrice >= minOrder || simAssumeMinOrderMet) {
          const val = parseFloat(foundCoupon.discount_value) || 0;
          let rawDisc = foundCoupon.discount_type === 'PERCENTAGE' 
            ? (simEffectivePromoPrice * val) / 100 
            : val;
          if (foundCoupon.max_discount_cap && parseFloat(foundCoupon.max_discount_cap) > 0) {
            rawDisc = Math.min(rawDisc, parseFloat(foundCoupon.max_discount_cap));
          }
          if (rawDisc > simEffectivePromoPrice && simEffectivePromoPrice > 0) {
            simCouponCapped = true;
          }
          simCouponDiscount = Math.min(rawDisc, simEffectivePromoPrice);
        }
      }
    } else if (simCouponSource === 'CUSTOM' && simCustomCouponValue !== '' && !isNaN(parseFloat(simCustomCouponValue))) {
      const val = parseFloat(simCustomCouponValue);
      let rawDisc = simCustomCouponType === 'PERCENTAGE' 
        ? (simEffectivePromoPrice * val) / 100 
        : val;
      if (rawDisc > simEffectivePromoPrice && simEffectivePromoPrice > 0) {
        simCouponCapped = true;
      }
      simCouponDiscount = Math.min(rawDisc, simEffectivePromoPrice);
    }
  }

  const simFinalCustomerPrice = Math.max(0, simEffectivePromoPrice - simCouponDiscount);
  const simTotalSavings = Math.max(0, simBaseSellPrice - simFinalCustomerPrice);
  const simTotalSavingsPct = simBaseSellPrice > 0 ? ((simTotalSavings / simBaseSellPrice) * 100).toFixed(1) : '0';

  return (
    <div className="fade-in p-2 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Pricing Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage catalog margins, bulk updates, live customer offer prices, and schedules.</p>
        </div>
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => {
              if (!simListingId && listings.length > 0) {
                setSimListingId(listings[0].id);
              }
              setShowSimulatorModal(true);
            }} 
            className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-100 transition shadow-sm text-sm"
          >
            <i className="fa-solid fa-calculator text-emerald-600"></i> Offer Simulator
          </button>
          <button onClick={() => setShowScheduleModal(true)} className="bg-brand-dark text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-green-800 transition text-sm">
            <i className="fa-solid fa-calendar-plus"></i> Schedule Price Change
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-4 border-b border-gray-200">
        <button onClick={() => setActiveTab('current')} className={`pb-2 px-1 font-bold text-sm border-b-2 ${activeTab === 'current' ? 'border-brand-dark text-brand-dark' : 'border-transparent text-gray-500'}`}>Current Prices</button>
        <button onClick={() => setActiveTab('schedules')} className={`pb-2 px-1 font-bold text-sm border-b-2 ${activeTab === 'schedules' ? 'border-brand-dark text-brand-dark' : 'border-transparent text-gray-500'}`}>Upcoming Schedules</button>
      </div>

      {activeTab === 'current' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {selectedListings.length > 0 && (
            <div className="bg-emerald-50 p-3 flex justify-between items-center border-b border-emerald-100">
              <span className="text-sm font-bold text-emerald-800">{selectedListings.length} products selected</span>
              <button onClick={() => setShowBulkModal(true)} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm">Bulk Update Prices</button>
            </div>
          )}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="p-4 w-10"><input type="checkbox" onChange={toggleSelectAll} checked={selectedListings.length === listings.length && listings.length > 0} className="rounded" /></th>
                <th className="p-4 font-bold">Product (SKU)</th>
                <th className="p-4 font-bold">MRP</th>
                <th className="p-4 font-bold">Sell Price</th>
                <th className="p-4 font-bold">Customer Offer Price</th>
                <th className="p-4 font-bold">Margin / Discount</th>
                <th className="p-4 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {listings.map(l => {
                const sellPriceNum = parseFloat(l.sell_price);
                const mrpNum = parseFloat(l.mrp);
                const percentage = mrpNum > 0 ? (Math.abs(mrpNum - sellPriceNum) / mrpNum * 100).toFixed(1) : 0;
                
                let badgeClass = 'bg-gray-100 text-gray-800';
                let badgeText = 'No Discount';
                
                if (sellPriceNum < mrpNum) {
                  badgeClass = 'bg-green-100 text-green-800';
                  badgeText = `${percentage}% Discount`;
                } else if (sellPriceNum > mrpNum) {
                  badgeClass = 'bg-red-100 text-red-800';
                  badgeText = `${percentage}% Markup`;
                }

                const preview = previews[l.id];

                return (
                  <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4"><input type="checkbox" checked={selectedListings.includes(l.id)} onChange={() => toggleSelect(l.id)} className="rounded" /></td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {l.image_url ? (
                          <img src={l.image_url} alt={l.title} className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0 shadow-sm" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-box-open text-gray-300 text-sm"></i>
                          </div>
                        )}
                        <div>
                          <div className="font-extrabold text-gray-900">{l.title || 'Unknown Product'}</div>
                          <div className="text-xs text-gray-400 mt-0.5">SKU: {l.sku || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-400 font-medium line-through">₹{l.mrp}</td>
                    <td className="p-4 font-bold text-gray-900">₹{l.sell_price}</td>
                    
                    {/* Customer Offer Price Column */}
                    <td className="p-4">
                      {preview && preview.has_offers ? (
                        <div className="space-y-1 min-w-[150px]">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-emerald-700 text-base">₹{preview.final_customer_price}</span>
                            <button
                              type="button"
                              onClick={() => setBreakdownListing(preview)}
                              title="Inspect Price Waterfall Breakdown"
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition cursor-pointer shadow-2xs"
                            >
                              <i className="fa-solid fa-calculator text-[9px]"></i>
                              <span>Math</span>
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {preview.promo_price && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60" title={`Flash Deal: ${preview.promo_title}`}>
                                <i className="fa-solid fa-bolt text-[8px]"></i> -₹{preview.promo_discount}
                              </span>
                            )}
                            {preview.coupon_code && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/60" title={`Coupon: ${preview.coupon_code}`}>
                                <i className="fa-solid fa-ticket text-[8px]"></i> -₹{preview.coupon_discount}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-0.5 min-w-[150px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-800 text-sm">₹{l.sell_price}</span>
                            <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Regular</span>
                          </div>
                          <div className="text-[11px] text-gray-400">No active offers</div>
                        </div>
                      )}
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${badgeClass}`}>
                        {badgeText}
                      </span>
                    </td>
                    <td className="p-4">
                      <button onClick={() => { setSingleEditForm({id: l.id, mrp: l.mrp, sell_price: l.sell_price}); setShowSingleEditModal(true); }} className="text-blue-600 hover:text-blue-800 font-bold text-xs inline-flex items-center gap-1"><i className="fa-solid fa-pen-to-square"></i> Edit Price</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {totalItems > 0 && (
            <div className="flex flex-col md:flex-row justify-between items-center mt-4 px-4 py-4 gap-4 bg-white border-t border-gray-200">
              <div className="flex items-center text-sm text-gray-500 font-medium">
                <span>
                  Showing <strong className="text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong className="text-gray-900">{Math.min(currentPage * itemsPerPage, totalItems)}</strong> of <strong className="text-brand-dark">{totalItems}</strong> items
                </span>
                <span className="mx-4 text-gray-300">|</span>
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <select 
                    value={itemsPerPage} 
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-gray-700 outline-none focus:border-brand-dark cursor-pointer font-semibold"
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded border border-gray-200 bg-white text-gray-500 text-sm font-semibold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                >
                  <i className="fa-solid fa-chevron-left text-[10px]"></i> Prev
                </button>
                
                {getPageNumbers().map((num, i) => (
                  <button
                    key={i}
                    onClick={() => typeof num === 'number' && setCurrentPage(num)}
                    disabled={num === '...'}
                    className={`min-w-[32px] h-[32px] flex items-center justify-center rounded text-sm font-semibold transition ${
                      num === currentPage 
                        ? 'bg-brand-dark text-white border-brand-dark shadow-md' 
                        : num === '...' 
                          ? 'text-gray-400 cursor-default' 
                          : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {num}
                  </button>
                ))}

                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded border border-gray-200 bg-white text-gray-500 text-sm font-semibold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                >
                  Next <i className="fa-solid fa-chevron-right text-[10px]"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'schedules' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="p-4 font-bold">Product (SKU)</th>
                <th className="p-4 font-bold">Scheduled Price</th>
                <th className="p-4 font-bold">Duration</th>
                <th className="p-4 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {schedules.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {s.image_url ? (
                        <img src={s.image_url} alt={s.title} className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0 shadow-sm" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                          <i className="fa-solid fa-box-open text-gray-300 text-sm"></i>
                        </div>
                      )}
                      <div>
                        <div className="font-extrabold text-gray-900">{s.title || 'Unknown Product'}</div>
                        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>SKU: {s.sku || 'N/A'}</span>
                          {s.promo_title && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              {s.promo_title}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-bold text-green-700">₹{s.scheduled_price}</td>
                  <td className="p-4">
                    <div className="text-xs text-gray-600"><span className="font-bold">Starts:</span> {new Date(s.start_date).toLocaleString()}</div>
                    <div className="text-xs text-gray-600 mt-0.5"><span className="font-bold">Ends:</span> {new Date(s.end_date).toLocaleString()}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                      s.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800' 
                        : s.status === 'SCHEDULED' 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
              {schedules.length === 0 && (
                <tr><td colSpan="4" className="p-8 text-center text-gray-500">No upcoming price changes scheduled.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h3 className="font-extrabold text-lg mb-4">Bulk Update Prices</h3>
            <form onSubmit={handleBulkUpdate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Update Type</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={bulkForm.type} onChange={e=>setBulkForm({...bulkForm, type: e.target.value})}>
                  <option value="PERCENTAGE">% Discount from MRP</option>
                  <option value="FLAT">Flat ₹ Discount from MRP</option>
                  <option value="EXACT">Set Exact Sell Price (₹)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Value</label>
                <input required type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={bulkForm.value} onChange={e=>setBulkForm({...bulkForm, value: e.target.value})} />
              </div>
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={()=>setShowBulkModal(false)} className="flex-1 bg-gray-100 text-gray-700 font-bold rounded-xl py-2">Cancel</button>
                <button type="submit" className="flex-1 bg-brand-dark text-white font-bold rounded-xl py-2">Apply to {selectedListings.length}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSingleEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h3 className="font-extrabold text-lg mb-4">Edit Current Price</h3>
            <form onSubmit={handleSingleEdit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">MRP (₹)</label>
                <input required type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={singleEditForm.mrp} onChange={e=>setSingleEditForm({...singleEditForm, mrp: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Sell Price (₹)</label>
                <input required type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={singleEditForm.sell_price} onChange={e=>setSingleEditForm({...singleEditForm, sell_price: e.target.value})} />
              </div>
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={()=>setShowSingleEditModal(false)} className="flex-1 bg-gray-100 text-gray-700 font-bold rounded-xl py-2">Cancel</button>
                <button type="submit" className="flex-1 bg-brand-dark text-white font-bold rounded-xl py-2">Save Price</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-extrabold text-lg">Schedule Pricing</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-gray-400 hover:text-gray-600"><i className="fa-solid fa-xmark text-xl"></i></button>
            </div>
            <form onSubmit={handleSchedulePrice} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Select Product</label>
                <select required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={selectedListing} onChange={e=>setSelectedListing(e.target.value)}>
                  <option value="">-- Choose a listing --</option>
                  {!loadingListings && listings.map(l => (
                    <option key={l.id} value={l.id}>{l.title} (₹{l.sell_price})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">New Scheduled Price (₹)</label>
                <input required type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={priceForm.scheduled_price} onChange={e=>setPriceForm({...priceForm, scheduled_price: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-gray-700 mb-1 block">Start Date & Time</label><input required type="datetime-local" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={priceForm.start_date} onChange={e=>setPriceForm({...priceForm, start_date: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-gray-700 mb-1 block">End Date & Time</label><input required type="datetime-local" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={priceForm.end_date} onChange={e=>setPriceForm({...priceForm, end_date: e.target.value})} /></div>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 mt-2">
                <i className="fa-solid fa-info-circle mr-1"></i> The system will automatically revert to the original price when the end date passes.
              </div>
              <button type="submit" className="w-full bg-brand-dark text-white font-bold rounded-xl py-3 mt-4 hover:bg-green-800">Schedule Price Drop</button>
            </form>
          </div>
        </div>
      )}

      {/* Price Waterfall Breakdown Modal */}
      {breakdownListing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-gray-100 animate-scale-in">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[11px] font-extrabold uppercase rounded-full bg-emerald-100 text-emerald-800">
                    Live Calculation
                  </span>
                  <span className="text-xs text-gray-400">SKU: {breakdownListing.sku || 'N/A'}</span>
                </div>
                <h3 className="font-extrabold text-xl text-gray-900 mt-1">{breakdownListing.title || 'Product Breakdown'}</h3>
              </div>
              <button 
                onClick={() => setBreakdownListing(null)} 
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-xl hover:bg-gray-100 transition"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="space-y-3">
              {/* Step 1: Base Sell Price */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-200 flex items-center justify-center text-gray-700 font-bold text-sm">
                    1
                  </div>
                  <div>
                    <div className="font-bold text-sm text-gray-900">Base Catalog Selling Price</div>
                    <div className="text-xs text-gray-500">Normal list price before customer promotions (MRP: ₹{breakdownListing.mrp})</div>
                  </div>
                </div>
                <div className="font-extrabold text-base text-gray-900">₹{breakdownListing.base_sell_price}</div>
              </div>

              {/* Step 2: Active Promotion */}
              <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                breakdownListing.promo_price ? 'bg-purple-50 border-purple-200' : 'bg-gray-50/50 border-gray-100 opacity-60'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                    breakdownListing.promo_price ? 'bg-purple-200 text-purple-900' : 'bg-gray-200 text-gray-500'
                  }`}>
                    <i className="fa-solid fa-bolt text-xs"></i>
                  </div>
                  <div>
                    <div className="font-bold text-sm text-gray-900">
                      {breakdownListing.promo_title ? `Promo: ${breakdownListing.promo_title}` : 'Active Promotion / Flash Deal'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {breakdownListing.promo_price 
                        ? `Flash deal price set to ₹${breakdownListing.promo_price}` 
                        : 'No active promotion or flash sale on this listing'}
                    </div>
                  </div>
                </div>
                <div className={`font-extrabold text-base ${breakdownListing.promo_price ? 'text-purple-700' : 'text-gray-400'}`}>
                  {breakdownListing.promo_price ? `-₹${breakdownListing.promo_discount}` : '₹0.00'}
                </div>
              </div>

              {/* Step 3: Active Store Coupon */}
              <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                breakdownListing.coupon_code ? 'bg-amber-50 border-amber-200' : 'bg-gray-50/50 border-gray-100 opacity-60'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                    breakdownListing.coupon_code ? 'bg-amber-200 text-amber-900' : 'bg-gray-200 text-gray-500'
                  }`}>
                    <i className="fa-solid fa-ticket text-xs"></i>
                  </div>
                  <div>
                    <div className="font-bold text-sm text-gray-900">
                      {breakdownListing.coupon_code ? `Coupon: ${breakdownListing.coupon_code}` : 'Store Coupon'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {breakdownListing.coupon_code 
                        ? (breakdownListing.coupon_type === 'PERCENTAGE' ? `${breakdownListing.coupon_value}% store discount` : `Flat ₹${breakdownListing.coupon_value} store discount`)
                        : 'No applicable store coupon applied'}
                    </div>
                  </div>
                </div>
                <div className={`font-extrabold text-base ${breakdownListing.coupon_code ? 'text-amber-700' : 'text-gray-400'}`}>
                  {breakdownListing.coupon_code ? `-₹${breakdownListing.coupon_discount}` : '₹0.00'}
                </div>
              </div>

              {/* Waterfall Summary Card */}
              <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-lg">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-emerald-500/40">
                  <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">Customer Pays At Checkout</span>
                  <span className="text-2xl font-black">₹{breakdownListing.final_customer_price}</span>
                </div>
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-emerald-500/40">
                  <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">Seller Net Realized Revenue</span>
                  <span className="text-xl font-extrabold text-emerald-200">₹{breakdownListing.seller_realized_price}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-emerald-100 font-medium">
                  <span>Total Discount Provided:</span>
                  <span className="font-bold bg-emerald-900/60 px-2 py-0.5 rounded-lg text-emerald-200">
                    ₹{breakdownListing.total_discount_amount} ({breakdownListing.total_discount_pct}% off)
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 mt-2 flex items-start gap-2">
                <i className="fa-solid fa-circle-info text-blue-600 mt-0.5 shrink-0"></i>
                <div>
                  <span className="font-bold">Realized Revenue Note:</span> Net realized revenue is currently calculated up to active coupons (platform commissions and settlement fees are excluded until revenue model finalized).
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button 
                type="button" 
                onClick={() => setBreakdownListing(null)} 
                className="w-full bg-gray-900 hover:bg-black text-white font-bold py-2.5 rounded-xl transition"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🧮 Offer & Margin Simulator Modal */}
      {showSimulatorModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl border border-gray-100 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg font-bold">
                  <i className="fa-solid fa-calculator"></i>
                </div>
                <div>
                  <h3 className="font-extrabold text-xl text-gray-900">Offer & Price Simulator</h3>
                  <p className="text-xs text-gray-500">Test hypothetical deals and coupons live to forecast customer price & margins.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSimulatorModal(false)} 
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-xl hover:bg-gray-100 transition"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="space-y-5">
              {/* Product Selection */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Select Product to Test</label>
                <select 
                  value={simListingId || (selectedSimListing?.id || '')} 
                  onChange={(e) => {
                    setSimListingId(e.target.value);
                    setSimPromoValue('');
                  }}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold bg-gray-50 focus:bg-white focus:border-brand-dark outline-none cursor-pointer"
                >
                  {listings.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.title} — Current Price: ₹{l.sell_price} (MRP: ₹{l.mrp})
                    </option>
                  ))}
                </select>
                {selectedSimListing && (
                  <div className="flex items-center gap-4 mt-2 px-3 py-2 bg-gray-50 rounded-xl text-xs text-gray-600 flex-wrap">
                    <span><strong>MRP:</strong> ₹{simMrp}</span>
                    <span><strong>Base Catalog Price:</strong> ₹{simBaseSellPrice}</span>
                    <span><strong>Catalog Margin:</strong> {simMrp > 0 ? (((simMrp - simBaseSellPrice) / simMrp) * 100).toFixed(1) : 0}%</span>
                  </div>
                )}
              </div>

              {/* Layer 1: Promo Simulation */}
              <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/40">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-bolt text-purple-700 text-sm"></i>
                    <span className="font-bold text-sm text-purple-950">Layer 1: Simulated Flash Sale / Promotion</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={simPromoEnabled} 
                      onChange={(e) => setSimPromoEnabled(e.target.checked)} 
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {simPromoEnabled ? (
                  <div className="space-y-3 pt-2">
                    {/* Promo Mode Tabs */}
                    <div>
                      <label className="text-xs font-bold text-purple-900 mb-1.5 block">How would you like to set the offer?</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button 
                          type="button" 
                          onClick={() => setSimPromoMode('FLAT')}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                            simPromoMode === 'FLAT' 
                              ? 'bg-purple-700 text-white border-purple-700 shadow-xs' 
                              : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-100/50'
                          }`}
                        >
                          ₹ Flat Discount Off
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setSimPromoMode('PERCENTAGE')}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                            simPromoMode === 'PERCENTAGE' 
                              ? 'bg-purple-700 text-white border-purple-700 shadow-xs' 
                              : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-100/50'
                          }`}
                        >
                          % Percentage Off
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setSimPromoMode('EXACT')}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                            simPromoMode === 'EXACT' 
                              ? 'bg-purple-700 text-white border-purple-700 shadow-xs' 
                              : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-100/50'
                          }`}
                        >
                          Exact Deal Price
                        </button>
                      </div>
                    </div>

                    {/* Input field based on mode */}
                    <div>
                      <label className="text-xs font-bold text-purple-900 mb-1 block">
                        {simPromoMode === 'FLAT' && 'Enter Discount Amount (₹ off current price)'}
                        {simPromoMode === 'PERCENTAGE' && 'Enter Discount Percentage (% off current price)'}
                        {simPromoMode === 'EXACT' && 'Enter Final Deal Selling Price (₹)'}
                      </label>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={simPromoValue} 
                          onChange={(e) => setSimPromoValue(e.target.value)} 
                          placeholder={
                            simPromoMode === 'FLAT' ? 'e.g. 1 (for ₹1 discount)' :
                            simPromoMode === 'PERCENTAGE' ? 'e.g. 10 (for 10% discount)' :
                            simBaseSellPrice > 0 ? (simBaseSellPrice * 0.9).toFixed(0) : '0'
                          }
                          className="w-full border border-purple-200 rounded-xl px-3.5 py-2 text-sm font-semibold bg-white outline-none focus:border-purple-600"
                        />
                      </div>
                    </div>

                    {/* Live Promo Feedback */}
                    <div className="p-2.5 rounded-xl bg-purple-100/60 border border-purple-200 text-xs flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-purple-800 font-medium">Promo Price:</span>
                        <strong className="text-purple-950 text-sm">₹{simEffectivePromoPrice.toFixed(2)}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-purple-800 font-medium">Discount Given:</span>
                        <strong className="text-purple-700 font-bold">-₹{simPromoDiscount.toFixed(2)}</strong>
                      </div>
                    </div>

                    {simPromoWarning && (
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-medium flex items-center gap-1.5">
                        <i className="fa-solid fa-triangle-exclamation text-amber-600"></i>
                        <span>{simPromoWarning}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-purple-700/70 italic">Toggle ON to test a promotional price drop or flash sale.</div>
                )}
              </div>

              {/* Layer 2: Coupon Simulation */}
              <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-ticket text-amber-700 text-sm"></i>
                    <span className="font-bold text-sm text-amber-950">Layer 2: Simulated Store Coupon</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={simCouponEnabled} 
                      onChange={(e) => setSimCouponEnabled(e.target.checked)} 
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                {simCouponEnabled ? (
                  <div className="space-y-3 pt-2">
                    <div className="flex gap-2 text-xs">
                      <button 
                        type="button" 
                        onClick={() => setSimCouponSource('EXISTING')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition ${
                          simCouponSource === 'EXISTING' ? 'bg-amber-700 text-white shadow-xs' : 'bg-white text-amber-900 border border-amber-200'
                        }`}
                      >
                        Choose Active Store Coupon
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setSimCouponSource('CUSTOM')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition ${
                          simCouponSource === 'CUSTOM' ? 'bg-amber-700 text-white shadow-xs' : 'bg-white text-amber-900 border border-amber-200'
                        }`}
                      >
                        Custom Experimental Value
                      </button>
                    </div>

                    {simCouponSource === 'EXISTING' ? (
                      <div>
                        <label className="text-xs font-bold text-amber-900 mb-1 block">Active Store Coupons</label>
                        <select 
                          value={simSelectedCouponCode} 
                          onChange={(e) => setSimSelectedCouponCode(e.target.value)}
                          className="w-full border border-amber-200 rounded-xl px-3.5 py-2 text-sm font-semibold bg-white outline-none focus:border-amber-600 cursor-pointer"
                        >
                          <option value="">-- Choose active coupon --</option>
                          {activeCoupons.map(c => (
                            <option key={c.id || c.code} value={c.code}>
                              {c.code} — {c.discount_type === 'PERCENTAGE' ? `${c.discount_value}% OFF` : `₹${c.discount_value} FLAT`} {c.min_order_value > 0 ? `(Min Order ₹${c.min_order_value})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-amber-900 mb-1 block">Type</label>
                          <select 
                            value={simCustomCouponType} 
                            onChange={(e) => setSimCustomCouponType(e.target.value)}
                            className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm bg-white font-semibold outline-none"
                          >
                            <option value="PERCENTAGE">% Percentage</option>
                            <option value="FLAT">Flat ₹ Amount</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-amber-900 mb-1 block">Value</label>
                          <input 
                            type="number" 
                            value={simCustomCouponValue} 
                            onChange={(e) => setSimCustomCouponValue(e.target.value)}
                            placeholder="e.g. 5" 
                            className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm bg-white font-semibold outline-none focus:border-amber-600"
                          />
                        </div>
                      </div>
                    )}

                    {/* Live Coupon Feedback */}
                    <div className="p-2.5 rounded-xl bg-amber-100/60 border border-amber-200 text-xs flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-800 font-medium">Coupon Applied:</span>
                        <strong className="text-amber-950 font-bold">
                          {foundCoupon ? foundCoupon.code : (simCustomCouponValue ? 'Custom' : 'None')}
                        </strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-800 font-medium">Coupon Deduction:</span>
                        <strong className="text-amber-800 font-extrabold text-sm">-₹{simCouponDiscount.toFixed(2)}</strong>
                      </div>
                    </div>

                    {/* Capping notice */}
                    {simCouponCapped && (
                      <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-[11px] text-blue-900 font-medium flex items-center gap-1.5">
                        <i className="fa-solid fa-circle-info text-blue-600"></i>
                        <span>
                          <strong>Capped:</strong> Coupon offers more than product price, capped at ₹{simEffectivePromoPrice.toFixed(2)} so customer price does not go negative.
                        </span>
                      </div>
                    )}

                    {/* Min order notice */}
                    {simCouponMinOrderWarning && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold">
                          <i className="fa-solid fa-circle-exclamation text-amber-700"></i>
                          <span>Minimum Order Requirement</span>
                        </div>
                        <p className="text-amber-800">{simCouponMinOrderWarning}</p>
                        <label className="flex items-center gap-2 pt-1 cursor-pointer font-bold text-amber-950">
                          <input 
                            type="checkbox" 
                            checked={simAssumeMinOrderMet} 
                            onChange={(e) => setSimAssumeMinOrderMet(e.target.checked)} 
                            className="rounded"
                          />
                          <span>Assume cart meets minimum order requirement for this simulation</span>
                        </label>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-amber-700/70 italic">Toggle ON to test a coupon discount on top of the promo.</div>
                )}
              </div>

              {/* Waterfall Live Result Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-xl">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
                  <i className="fa-solid fa-chart-line"></i> Simulated Waterfall Outcome
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[11px] text-gray-400">Base Sell Price</div>
                    <div className="text-base font-bold mt-1">₹{simBaseSellPrice.toFixed(2)}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[11px] text-purple-300">Promo Discount</div>
                    <div className="text-base font-bold text-purple-300 mt-1">-₹{simPromoDiscount.toFixed(2)}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[11px] text-amber-300">Coupon Discount</div>
                    <div className="text-base font-bold text-amber-300 mt-1">-₹{simCouponDiscount.toFixed(2)}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                    <div className="text-[11px] text-emerald-300 font-bold">Customer Final</div>
                    <div className="text-lg font-black text-emerald-400 mt-0.5">₹{simFinalCustomerPrice.toFixed(2)}</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Seller Realized:</span>
                    <span className="font-extrabold text-white text-sm">₹{simFinalCustomerPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">Total Off: <strong className="text-emerald-400">{simTotalSavingsPct}%</strong></span>
                    <span className="text-gray-400">Total Discount: <strong className="text-emerald-400">₹{simTotalSavings.toFixed(2)}</strong></span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowSimulatorModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition"
                >
                  Done
                </button>
                {simPromoEnabled && simPromoDiscount > 0 && (
                  <div className="flex-1 flex flex-col gap-1">
                    <button 
                      type="button" 
                      onClick={() => {
                        if (selectedSimListing) {
                          setSelectedListing(selectedSimListing.id);
                          setPriceForm(prev => ({ 
                            ...prev, 
                            scheduled_price: simEffectivePromoPrice.toFixed(2) 
                          }));
                          setShowSimulatorModal(false);
                          setShowScheduleModal(true);
                        }
                      }}
                      className="w-full bg-brand-dark hover:bg-green-800 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2"
                    >
                      <i className="fa-solid fa-calendar-plus"></i> Schedule Promo Price (₹{simEffectivePromoPrice.toFixed(2)})
                    </button>
                    {simCouponEnabled && simCouponDiscount > 0 && (
                      <span className="text-[10px] text-gray-500 text-center font-medium">
                        Sets catalog price to ₹{simEffectivePromoPrice.toFixed(2)}. Coupon (-₹{simCouponDiscount.toFixed(2)}) brings checkout total to ₹{simFinalCustomerPrice.toFixed(2)}.
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pricing;
