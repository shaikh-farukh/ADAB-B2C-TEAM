import React, { useState, useEffect, useRef } from 'react';
import { useSeller } from '../context/SellerContext';
import { useListings } from '../hooks/useListings';
import listingService from '../services/listingService';

const Products = () => {
  const { 
    listings, 
    loading, 
    filters: { searchQuery, setSearchQuery, stockFilter, setStockFilter, typeFilter, setTypeFilter, buyerFilter, setBuyerFilter },
    pagination: { currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, totalItems },
    globalStats,
    createListing,
    updateListing,
    deleteListing,
    submitListing,
    bulkUpload,
    checkUploadStatus,
    bulkExport,
    checkExportStatus,
    uploadImage,
    refresh
  } = useListings();

  const [showModal, setShowModal] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [listingIssues, setListingIssues] = useState({});
  const fileInputRef = useRef(null);
  const { uploadJobs, setUploadJobs } = useSeller();
  
  useEffect(() => {
    // Fetch issues for currently visible listings
    const fetchIssues = async () => {
      const issuesMap = { ...listingIssues };
      let updated = false;
      for (const l of listings) {
        if (!issuesMap[l.id]) {
          try {
            const res = await listingService.getListingIssues(l.id);
            if (res.success) {
              issuesMap[l.id] = res.data;
              updated = true;
            }
          } catch (e) {}
        }
      }
      if (updated) setListingIssues(issuesMap);
    };
    if (listings.length > 0) fetchIssues();
  }, [listings]);

  // The polling for active background jobs is now handled globally in GlobalBulkUploadWidget.jsx
  // We still use checkUploadStatus and refresh from useListings in the global widget via a side-effect or directly.
  
  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (uploadJobs.some(j => j.state === 'active')) {
      alert('Please wait for the current file to finish processing before uploading another one.');
      e.target.value = null;
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await bulkUpload(formData);
      
      if (response.jobId) {
        // BullMQ Background Job
        setUploadJobs(prev => [...prev, { id: response.jobId, filename: file.name, state: 'active', progress: 0 }]);
      } else if (response.result) {
        // Fallback synchronous direct result
        setUploadJobs(prev => [...prev, { id: Date.now(), filename: file.name, state: 'completed', progress: 100, result: response.result }]);
        refresh();
      }
      
      e.target.value = null; // reset
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleExportCSV = async () => {
    try {
      // Direct stream download, bypass widget
      const response = await bulkExport();
      
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'listings_export.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const [formData, setFormData] = useState({
    title: '', sku: '', mrp: '', sell_price: '', product_type: 'OWN_BRAND', allowed_buyers: 'ALL', image_url: '', approval_status: 'DRAFT', is_active: true
  });

  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const response = await uploadImage(fd);
      if (response.url) {
        setFormData({ ...formData, image_url: response.url });
      }
    } catch (err) {
      alert('Failed to upload image: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const openEdit = (listing) => {
    setEditingListing(listing);
    setFormData({
      title: listing.title,
      sku: listing.sku || '',
      barcode: listing.barcode || '',
      mrp: listing.mrp,
      sell_price: listing.sell_price,
      product_type: listing.product_type,
      allowed_buyers: listing.allowed_buyers,
      image_url: listing.image_url || '',
      stock_qty: listing.stock_qty || 0,
      min_order_qty: listing.min_order_qty || '',
      unit: listing.unit || ''
    });
    setShowModal(true);
  };

  const saveListing = async (e, submitForReview = false) => {
    e.preventDefault();
    try {
      const dataToSave = { 
        ...formData, 
        mrp: parseFloat(formData.mrp || formData.sell_price), 
        sell_price: parseFloat(formData.sell_price),
        stock_qty: parseInt(formData.stock_qty || 0, 10)
      };
      
      if (!dataToSave.image_url) delete dataToSave.image_url;
      if (dataToSave.min_order_qty === '') delete dataToSave.min_order_qty;
      if (dataToSave.sku === '') delete dataToSave.sku;
      if (dataToSave.barcode === '') delete dataToSave.barcode;
      
      let savedListing;
      if (editingListing) {
        savedListing = await updateListing(editingListing.id, dataToSave);
      } else {
        savedListing = await createListing(dataToSave);
      }
      
      if (submitForReview) {
        await submitListing(savedListing.id);
      }
      
      setShowModal(false);
      refresh();
    } catch (err) {
      console.error('Failed to save listing', err);
      alert('Failed to save: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteListing = async () => {
    if (deleteConfirm) {
      try {
        await deleteListing(deleteConfirm);
        setDeleteConfirm(null);
        refresh();
      } catch (err) {
        console.error('Failed to delete listing', err);
        alert('Failed to delete: ' + (err.response?.data?.error || err.message));
        setDeleteConfirm(null);
      }
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedListings = listings;

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const formatIssueDetails = (issue) => {
    if (!issue.details) return null;
    if (issue.issue_type === 'LISTING') {
      const reason = issue.details.rejection_reason;
      return (
        <span className="text-gray-600 font-medium ml-1">
          {reason ? `— Reason: ${reason}` : '— (Pending admin feedback)'}
        </span>
      );
    }
    if (issue.issue_type === 'INVENTORY') {
      if (issue.details.low_stock_threshold !== undefined) {
        return (
          <span className="text-gray-500 ml-1">
            (Current: {issue.details.stock}, Alert threshold: {issue.details.low_stock_threshold})
          </span>
        );
      }
      return (
        <span className="text-gray-500 ml-1">
          (Current stock: {issue.details.stock ?? 0})
        </span>
      );
    }
    if (issue.issue_type === 'PRICE') {
      return (
        <span className="text-gray-500 ml-1">
          (Sell Price ₹{issue.details.sell_price} vs MRP ₹{issue.details.mrp})
        </span>
      );
    }
    const filtered = Object.entries(issue.details)
      .filter(([_, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
      .join(', ');
    return filtered ? <span className="text-gray-500 ml-1">({filtered})</span> : null;
  };

  return (
    <div className="fade-in w-full p-2 sm:p-4">
      {/* Header and Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">My Products</h1>
          <p className="text-gray-500 text-sm">{totalItems} items matching criteria</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:gap-3">
          <button onClick={handleExportCSV} className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm">
            <i className="fa-solid fa-download"></i> Export CSV
          </button>
          <input type="file" ref={fileInputRef} onChange={handleBulkUpload} accept=".csv" className="hidden" />
          <button onClick={() => fileInputRef.current.click()} className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm">
            <i className="fa-solid fa-upload"></i> Bulk Upload
          </button>
          <button className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm">
            <i className="fa-solid fa-tag"></i> Mass Price
          </button>
          <button className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm">
            <i className="fa-solid fa-barcode"></i> Scan
          </button>
          <button onClick={() => { setEditingListing(null); setFormData({ title: '', sku: '', mrp: '', sell_price: '', product_type: 'OWN_BRAND', allowed_buyers: 'ALL', image_url: '', approval_status: 'DRAFT', is_active: true }); setShowModal(true); }} className="px-4 py-2 rounded-xl bg-brand-dark hover:bg-green-800 text-white text-sm font-bold flex items-center gap-2 shadow-sm transition">
            <i className="fa-solid fa-plus"></i> Add Product
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="text-xs text-gray-400 font-bold mb-1">Total SKUs</div>
          <div className="text-2xl font-extrabold text-gray-900">{globalStats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="text-xs text-gray-400 font-bold mb-1">Own Brand</div>
          <div className="text-2xl font-extrabold text-purple-700">{globalStats.ownBrand}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="text-xs text-gray-400 font-bold mb-1">Low Stock</div>
          <div className="text-2xl font-extrabold text-orange-600">{globalStats.lowStock}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="text-xs text-gray-400 font-bold mb-1">Out of Stock</div>
          <div className="text-2xl font-extrabold text-gray-400">{globalStats.outOfStock}</div>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-8">
        
        {/* Filters Top Row */}
        <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
          <span className="font-bold text-gray-500 text-xs">Selling to:</span>
          <button onClick={() => setBuyerFilter('ALL')} className={`px-3 py-1 rounded-full font-bold text-xs ${buyerFilter === 'ALL' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All buyers</button>
          <button onClick={() => setBuyerFilter('CUSTOMERS')} className={`px-3 py-1 rounded-full font-bold text-xs ${buyerFilter === 'CUSTOMERS' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Customers</button>
          <button onClick={() => setBuyerFilter('STORES')} className={`px-3 py-1 rounded-full font-bold text-xs ${buyerFilter === 'STORES' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Other stores</button>
          <button onClick={() => setBuyerFilter('BOTH')} className={`px-3 py-1 rounded-full font-bold text-xs ${buyerFilter === 'BOTH' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Both</button>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search product name or barcode..." className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-green-500 text-sm bg-gray-50/50" />
          </div>
          <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-green-500 text-sm font-semibold bg-gray-50/50">
            <option>All stock</option>
            <option>In stock</option>
            <option>Out of stock</option>
          </select>
        </div>

        {/* Pills Row */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => setTypeFilter('ALL')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${typeFilter === 'ALL' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>All ({globalStats.total})</button>
          <button onClick={() => setTypeFilter('OWN_BRAND')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${typeFilter === 'OWN_BRAND' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>Own Brand ({globalStats.ownBrand})</button>
          <button onClick={() => setTypeFilter('LOOSE_WEIGHT')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${typeFilter === 'LOOSE_WEIGHT' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>Loose / Weight ({globalStats.loose})</button>
          <button onClick={() => setTypeFilter('NATIONAL_PACK')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${typeFilter === 'NATIONAL_PACK' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>National Pack (0)</button>
          <button onClick={() => setTypeFilter('PARTNER_PACK')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${typeFilter === 'PARTNER_PACK' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>Partner Pack (0)</button>
          <button onClick={() => setTypeFilter('FOOD')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${typeFilter === 'FOOD' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>Food ({globalStats.food})</button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase font-bold tracking-wider">
              <tr>
                <th className="px-4 py-4 w-10"><input type="checkbox" className="rounded text-brand-dark focus:ring-brand-dark" /></th>
                <th className="px-4 py-4">Product</th>
                <th className="px-4 py-4">Barcode / SKU</th>
                <th className="px-4 py-4">Type</th>
                <th className="px-4 py-4">Price</th>
                <th className="px-4 py-4">Stock</th>
                <th className="px-4 py-4">Who can buy?</th>
                <th className="px-4 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="8" className="text-center py-8 text-gray-500 font-bold">Loading your catalog...</td></tr>
              ) : paginatedListings.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-8 text-gray-500 font-bold">No products match your filters.</td></tr>
              ) : (
                paginatedListings.map(l => {
                  const issues = listingIssues[l.id] || [];
                  const hasIssues = issues.length > 0;
                  return (
                    <React.Fragment key={l.id}>
                      <tr className={`hover:bg-gray-50 transition ${hasIssues ? 'border-l-4 border-l-red-500 bg-red-50/10' : ''}`}>
                        <td className="px-4 py-4"><input type="checkbox" className="rounded text-brand-dark border-gray-300 focus:ring-brand-dark" /></td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {l.image_url ? (
                              <img src={l.image_url} alt={l.title} className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0 shadow-sm" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-box-open text-gray-300 text-sm"></i>
                              </div>
                            )}
                            <div className="font-bold text-gray-900">
                              {l.title}
                          {l.approval_status === 'DRAFT' && <span className="ml-2 bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider">DRAFT</span>} 
                          {l.approval_status === 'SUBMITTED' && <span className="ml-2 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider">SUBMITTED</span>}
                          {l.approval_status === 'UNDER_REVIEW' && <span className="ml-2 bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider">UNDER REVIEW</span>}
                          {l.approval_status === 'APPROVED' && <span className="ml-2 bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider">APPROVED</span>}
                          {l.approval_status === 'CHANGES_REQUIRED' && <span className="ml-2 bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider">CHANGES REQUIRED</span>}
                          {l.approval_status === 'REJECTED' && <span className="ml-2 bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider">REJECTED</span>}
                              {l.approval_status === 'PUBLISHED' && <span className="ml-2 bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider">PUBLISHED</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {l.barcode ? (
                            <div className="text-xs text-gray-900 font-mono font-bold" title="Barcode">{l.barcode}</div>
                          ) : null}
                          {l.sku ? (
                            <div className="text-[10px] text-gray-400 font-mono" title="SKU">SKU: {l.sku}</div>
                          ) : null}
                          {!l.barcode && !l.sku && <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-4">
                          {l.product_type === 'PACKED_ITEM' && <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-[10px] font-extrabold">Packed</span>}
                          {l.product_type === 'LOOSE_WEIGHT' && <span className="px-2 py-1 rounded bg-amber-50 text-amber-700 text-[10px] font-extrabold">Loose</span>}
                          {l.product_type === 'OWN_BRAND' && <span className="px-2 py-1 rounded bg-purple-50 text-purple-700 text-[10px] font-extrabold">Own Brand</span>}
                          {l.product_type === 'FOOD' && <span className="px-2 py-1 rounded bg-rose-50 text-rose-700 text-[10px] font-extrabold">Food</span>}
                        </td>
                        <td className="px-4 py-4 font-bold text-brand-dark">₹{l.sell_price}</td>
                        <td className="px-4 py-4 text-gray-600 text-sm">
                          {l.stock_qty || 0} {l.product_type === 'LOOSE_WEIGHT' ? (l.unit ? l.unit.split(' ')[2].replace(/[()]/g, '') : 'kg') : (l.product_type === 'PACKED_ITEM' ? 'packs' : 'pcs')}
                        </td>
                        <td className="px-4 py-4 text-gray-500 text-sm">
                          {l.allowed_buyers === 'ALL' ? 'Customers + Stores' : l.allowed_buyers === 'CUSTOMERS_ONLY' ? 'Customers only' : 'Stores only'}
                        </td>
                        <td className="px-4 py-4 text-right space-x-4">
                          <button onClick={() => openEdit(l)} className="text-gray-400 hover:text-brand-dark transition tooltip-trigger" title="Edit">
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          <button onClick={() => setDeleteConfirm(l.id)} className="text-gray-400 hover:text-red-500 transition tooltip-trigger" title="Delete">
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                      {hasIssues && (
                        <tr>
                          <td colSpan="8" className="px-4 py-2 bg-red-50/50 border-b border-gray-100">
                            <div className="flex flex-col gap-1 pl-8">
                              {issues.map((issue, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-xs">
                                  <i className={`fa-solid mt-0.5 ${issue.severity === 'high' ? 'fa-circle-xmark text-red-500' : 'fa-triangle-exclamation text-amber-500'}`}></i>
                                  <div>
                                    <span className="font-bold text-gray-900">{issue.issue_type} ISSUE:</span> <span className="text-gray-700">{issue.message}</span>
                                    {formatIssueDetails(issue)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalItems > 0 && (
          <div className="flex flex-col md:flex-row justify-between items-center mt-4 px-2 py-4 gap-4">
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto fade-in">
            <div className="px-6 pt-6 pb-4 flex justify-between items-start">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-green-50 text-brand-dark flex items-center justify-center text-xl shrink-0"><i className="fa-solid fa-plus"></i></div>
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900">{editingListing ? 'Edit Product' : 'Add a Product'}</h2>
                  <p className="text-xs font-bold text-gray-400">Fast listing for your shop catalog</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <form onSubmit={e => saveListing(e, true)} className="px-6 pb-6 space-y-5">
              
              {/* Product Type Selector */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">What type of product?</label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setFormData({...formData, product_type: 'OWN_BRAND'})} className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition ${formData.product_type === 'OWN_BRAND' ? 'border-brand-dark bg-green-50/50' : 'border-gray-100 bg-white hover:border-green-200'}`}>
                    <i className={`fa-solid fa-tag text-lg ${formData.product_type === 'OWN_BRAND' ? 'text-brand-dark' : 'text-purple-500'}`}></i>
                    <span className={`text-xs font-bold ${formData.product_type === 'OWN_BRAND' ? 'text-brand-dark' : 'text-gray-700'}`}>Own Brand</span>
                  </button>
                  <button type="button" onClick={() => setFormData({...formData, product_type: 'LOOSE_WEIGHT'})} className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition ${formData.product_type === 'LOOSE_WEIGHT' ? 'border-brand-dark bg-green-50/50' : 'border-gray-100 bg-white hover:border-green-200'}`}>
                    <i className={`fa-solid fa-scale-balanced text-lg ${formData.product_type === 'LOOSE_WEIGHT' ? 'text-brand-dark' : 'text-amber-500'}`}></i>
                    <span className={`text-xs font-bold ${formData.product_type === 'LOOSE_WEIGHT' ? 'text-brand-dark' : 'text-gray-700'}`}>Loose / Weight</span>
                  </button>
                  <button type="button" onClick={() => setFormData({...formData, product_type: 'PACKED_ITEM'})} className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition ${formData.product_type === 'PACKED_ITEM' ? 'border-brand-dark bg-green-50/50' : 'border-gray-100 bg-white hover:border-green-200'}`}>
                    <i className={`fa-solid fa-box text-lg ${formData.product_type === 'PACKED_ITEM' ? 'text-brand-dark' : 'text-blue-500'}`}></i>
                    <span className={`text-xs font-bold ${formData.product_type === 'PACKED_ITEM' ? 'text-brand-dark' : 'text-gray-700'}`}>Packed Item</span>
                  </button>
                </div>
              </div>

              {formData.product_type === 'OWN_BRAND' && (
                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                  <div className="flex items-center gap-2 mb-1">
                    <i className="fa-solid fa-tag text-purple-600 text-xs"></i>
                    <span className="font-extrabold text-sm text-purple-900">Own Brand Setup</span>
                  </div>
                  <p className="text-xs text-purple-700 mb-3 leading-relaxed">For garments, apparel, footwear, craft, or products manufactured under your own label.</p>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Brand/Label (e.g. Balaji)" className="flex-1 px-3 py-2 rounded-xl border border-purple-200 bg-white text-sm outline-none focus:border-purple-500" />
                    <input type="text" name="sku" value={formData.sku} onChange={handleFormChange} placeholder="SKU/Style Code (e.g. BAL-001)" className="flex-1 px-3 py-2 rounded-xl border border-purple-200 bg-white text-sm outline-none focus:border-purple-500" />
                  </div>
                </div>
              )}

              {formData.product_type === 'LOOSE_WEIGHT' && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                  <div className="flex items-center gap-2 mb-1">
                    <i className="fa-solid fa-scale-balanced text-amber-600 text-xs"></i>
                    <span className="font-extrabold text-sm text-amber-900">Loose / Weight Setup</span>
                  </div>
                  <p className="text-xs text-amber-700 mb-3 leading-relaxed">For grains, pulses, sugar, fresh produce, oils, spices sold by kg/litre or fractional weight.</p>
                  <div className="flex gap-2">
                    <select name="unit" value={formData.unit || 'per Kilogram (kg)'} onChange={handleFormChange} className="flex-1 px-3 py-2 rounded-xl border border-amber-200 bg-white text-sm outline-none focus:border-amber-500 font-semibold text-amber-900">
                      <option value="per Kilogram (kg)">Unit: per Kilogram (kg)</option>
                      <option value="per Gram (g)">Unit: per Gram (g)</option>
                      <option value="per Litre (L)">Unit: per Litre (L)</option>
                    </select>
                    <input type="number" step="0.01" name="min_order_qty" value={formData.min_order_qty || ''} onChange={handleFormChange} placeholder="Min Order (e.g. 0.5 kg)" className="flex-1 px-3 py-2 rounded-xl border border-amber-200 bg-white text-sm outline-none focus:border-amber-500" />
                  </div>
                </div>
              )}

              {formData.product_type === 'PACKED_ITEM' && (
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <i className="fa-solid fa-box text-blue-600 text-xs"></i>
                    <span className="font-extrabold text-sm text-blue-900">Packaged FMCG / Catalog Selection</span>
                  </div>
                  <p className="text-xs text-blue-700 mb-3 leading-relaxed">Select from standard national FMCG catalog to auto-fill name, MRP, barcode & image, or enter manually.</p>
                  <div className="mb-3">
                    <label className="block text-xs font-bold text-blue-900 mb-1">Pick from 5,000+ FMCG Master Catalog:</label>
                    <select className="w-full px-3 py-2 rounded-xl border border-blue-200 bg-white text-sm outline-none focus:border-blue-500 font-semibold text-blue-900">
                      <option>-- Choose popular packed item --</option>
                      <option>Tata Salt 1kg</option>
                      <option>Amul Butter 500g</option>
                      <option>Maggi Noodles 140g</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-blue-900 mb-1">Barcode / EAN</label>
                      <input type="text" name="barcode" value={formData.barcode || ''} onChange={handleFormChange} placeholder="8901234567890" className="w-full px-3 py-2 rounded-xl border border-blue-200 bg-white text-sm outline-none focus:border-blue-500" />
                    </div>
                  </div>
                </div>
              )}

              {/* Standard Inputs */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Product Name</label>
                <input type="text" name="title" required value={formData.title} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-dark" placeholder="e.g. Balaji Silk Kurti or Handcrafted Shirt" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Printed MRP (₹)</label>
                  <input type="number" name="mrp" required min="0" value={formData.mrp || ''} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-dark" placeholder="999" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Sell Price (₹)</label>
                  <input type="number" name="sell_price" required min="0" value={formData.sell_price} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-dark" placeholder="899" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Product Image</label>
                  <div className="flex items-center gap-3">
                    {formData.image_url && (
                      <img src={formData.image_url} alt="Product" className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                    )}
                    <label className={`flex-1 py-3 px-4 text-center rounded-xl border border-dashed border-brand-dark/50 bg-green-50 text-brand-dark font-bold text-sm cursor-pointer hover:bg-green-100 transition ${isUploadingImage ? 'opacity-50 cursor-wait' : ''}`}>
                      {isUploadingImage ? 'Uploading to MinIO...' : formData.image_url ? 'Change Image' : 'Upload Image'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploadingImage} />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    {formData.product_type === 'LOOSE_WEIGHT' ? 'Stock Available (e.g. 100 kg)' : formData.product_type === 'PACKED_ITEM' ? 'Stock Qty (Packs)' : 'Stock Qty (Pieces)'}
                  </label>
                  <input type="number" name="stock_qty" value={formData.stock_qty || ''} onChange={handleFormChange} placeholder="50" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-dark" />
                </div>
              </div>

              {/* Checkboxes Group */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Who can buy this?</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
                    <input type="checkbox" checked={formData.allowed_buyers === 'ALL' || formData.allowed_buyers === 'CUSTOMERS_ONLY'} onChange={(e) => setFormData({...formData, allowed_buyers: e.target.checked ? 'ALL' : 'STORES_ONLY'})} className="w-4 h-4 text-brand-dark rounded focus:ring-brand-dark" />
                    <span className="text-sm font-semibold text-gray-700">Customers (retail people browsing the app)</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
                    <input type="checkbox" checked={formData.allowed_buyers === 'ALL' || formData.allowed_buyers === 'STORES_ONLY'} onChange={(e) => setFormData({...formData, allowed_buyers: e.target.checked ? 'ALL' : 'CUSTOMERS_ONLY'})} className="w-4 h-4 text-brand-dark rounded focus:ring-brand-dark" />
                    <span className="text-sm font-semibold text-gray-700">Other stores (B2B wholesale / bulk buying)</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
                    <input type="checkbox" checked={formData.allowed_buyers === 'STORES_ONLY'} onChange={(e) => setFormData({...formData, allowed_buyers: e.target.checked ? 'STORES_ONLY' : 'ALL'})} className="w-4 h-4 text-brand-dark rounded focus:ring-brand-dark" />
                    <span className="text-sm font-semibold text-gray-700">Stores only — hide from public customers</span>
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex gap-3">
                  <button type="button" onClick={(e) => saveListing(e, false)} className="flex-1 py-3.5 rounded-xl bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-extrabold text-sm transition flex justify-center items-center gap-2">
                    <i className="fa-solid fa-save"></i> Save as Draft
                  </button>
                  <button type="button" onClick={(e) => saveListing(e, true)} className="flex-1 py-3.5 rounded-xl bg-brand-dark hover:bg-green-800 text-white font-extrabold text-sm shadow-md transition flex justify-center items-center gap-2">
                    <i className="fa-solid fa-paper-plane"></i> Submit for Review
                  </button>
                </div>
                <div className="text-center mt-4">
                  <a href="#" className="text-xs font-bold text-brand-dark hover:underline">Need advanced variants, barcodes, or tiered bulk pricing? Open Product Studio →</a>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Premium Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}></div>
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 animate-slide-in text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-triangle-exclamation text-red-500 text-2xl"></i>
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 mb-2">Delete Product</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">Are you sure you want to permanently delete this product? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleDeleteListing} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 shadow-md shadow-red-500/20 transition">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Products;
