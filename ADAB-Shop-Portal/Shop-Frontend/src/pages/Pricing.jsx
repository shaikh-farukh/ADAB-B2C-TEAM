import React, { useState } from 'react';
import { usePricing } from '../hooks/usePricing';
import { useListings } from '../hooks/useListings';

const Pricing = () => {
  const { schedules, loading, schedulePricing, updateBasePricing, updateBulkPricing } = usePricing();
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

  return (
    <div className="fade-in p-2 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Pricing Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage margins, bulk updates, and future price drops.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowScheduleModal(true)} className="bg-brand-dark text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-green-800 transition">
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

                return (
                  <tr key={l.id} className="hover:bg-gray-50">
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
                    <td className="p-4 text-gray-500 line-through">₹{l.mrp}</td>
                    <td className="p-4 font-bold text-green-700">₹{l.sell_price}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${badgeClass}`}>
                        {badgeText}
                      </span>
                    </td>
                    <td className="p-4">
                      <button onClick={() => { setSingleEditForm({id: l.id, mrp: l.mrp, sell_price: l.sell_price}); setShowSingleEditModal(true); }} className="text-blue-600 hover:text-blue-800 font-bold text-xs"><i className="fa-solid fa-pen-to-square"></i> Edit Price</button>
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
                        <div className="text-xs text-gray-400 mt-0.5">SKU: {s.sku || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-bold text-green-700">₹{s.scheduled_price}</td>
                  <td className="p-4">
                    <div className="text-xs text-gray-600"><span className="font-bold">Starts:</span> {new Date(s.start_date).toLocaleString()}</div>
                    <div className="text-xs text-gray-600 mt-0.5"><span className="font-bold">Ends:</span> {new Date(s.end_date).toLocaleString()}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${s.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
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
    </div>
  );
};

export default Pricing;
