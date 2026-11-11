import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sellerApi } from '../api/sellerApi';
import listingService from '../services/listingService';
import { useTranslation } from '../context/LanguageContext';
import useRestockCart from '../hooks/useRestockCart';
import RestockCartDrawer from '../components/catalog/RestockCartDrawer';

export default function CatalogPage() {
  const { t } = useTranslation();
  const { totalCartons } = useRestockCart();
  const [isRestockCartOpen, setIsRestockCartOpen] = useState(false);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [storePincode, setStorePincode] = useState('400001');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [toastMessage, setToastMessage] = useState('');

  // Add to Store Inventory Modal State
  const [adoptModalItem, setAdoptModalItem] = useState(null);
  const [customSellPrice, setCustomSellPrice] = useState('');
  const [customStock, setCustomStock] = useState('20');
  const [isAdopting, setIsAdopting] = useState(false);

  // B2B Restock Order Modal State
  const [restockModalItem, setRestockModalItem] = useState(null);
  const [restockCases, setRestockCases] = useState(1);
  const [isRestocking, setIsRestocking] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 5000);
  };

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (selectedCat !== 'all') params.category_id = selectedCat;
      if (selectedBrand !== 'all') params.brand = selectedBrand;

      const [catRes, masterRes] = await Promise.allSettled([
        listingService.getCategories(),
        sellerApi.getMasterCatalog(params)
      ]);

      if (catRes.status === 'fulfilled' && catRes.value?.data) {
        const catList = Array.isArray(catRes.value.data) ? catRes.value.data : (catRes.value.data?.data || []);
        setCategories(catList);
      }

      if (masterRes.status === 'fulfilled' && masterRes.value?.data) {
        const raw = masterRes.value.data;
        const items = raw?.data?.items || raw?.items || (Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []));
        setProducts(items);

        if (raw?.data?.brands && Array.isArray(raw.data.brands)) {
          setBrands(raw.data.brands);
        } else if (raw?.brands && Array.isArray(raw.brands)) {
          setBrands(raw.brands);
        }

        if (raw?.data?.storePincode) {
          setStorePincode(raw.data.storePincode);
        }
      }
    } catch (err) {
      console.error('Error fetching master catalog:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, [selectedCat, selectedBrand]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadCatalog();
  };

  const openAdoptModal = (item) => {
    setAdoptModalItem(item);
    setCustomSellPrice(item.printed_mrp ? Number(item.printed_mrp).toString() : '50');
    setCustomStock('20');
  };

  const handleConfirmAdopt = async (e) => {
    e.preventDefault();
    if (!adoptModalItem) return;

    try {
      setIsAdopting(true);
      const res = await sellerApi.adoptMasterCatalogItem({
        masterCatalogId: adoptModalItem.id,
        sellPrice: Number(customSellPrice),
        stockQty: Number(customStock)
      });

      if (res?.success || res?.data?.adopted) {
        showToast(`✓ Added "${adoptModalItem.product_name}" to your store inventory!`);
        setProducts(prev => prev.map(p => p.id === adoptModalItem.id ? { ...p, already_in_store: true } : p));
        setAdoptModalItem(null);
      } else {
        showToast('Failed to add product to inventory.');
      }
    } catch (err) {
      console.error('Adopt catalog item error:', err);
      showToast(err?.response?.data?.error || err.message || 'Error adopting product.');
    } finally {
      setIsAdopting(false);
    }
  };

  const openRestockModal = (item) => {
    setRestockModalItem(item);
    setRestockCases(1);
  };

  const handleConfirmRestock = async (e) => {
    e.preventDefault();
    if (!restockModalItem) return;

    try {
      setIsRestocking(true);
      const res = await sellerApi.orderRestockCases({
        masterCatalogId: restockModalItem.id,
        orderedCases: Math.max(1, parseInt(restockCases, 10) || 1)
      });

      const orderData = res?.data?.data || res?.data || {};
      if (res?.success || res?.data?.success || orderData.order_number) {
        showToast(`🎉 Restock Order Placed! #${orderData.order_number || 'B2B-ORD'} routed to ${orderData.assigned_distributor || 'Local Distributor'}`);
        setRestockModalItem(null);
      } else {
        showToast('Failed to place restock order.');
      }
    } catch (err) {
      console.error('Restock order error:', err);
      showToast(err?.response?.data?.error || err.message || 'Error placing restock order.');
    } finally {
      setIsRestocking(false);
    }
  };

  return (
    <section id="sec-catalog" className="space-y-4 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200 border border-gray-800">
          <i className="fa-solid fa-circle-check text-emerald-400 text-lg"></i>
          <span>{toastMessage}</span>
          <Link to="/products" className="ml-2 underline text-indigo-300 hover:text-indigo-200 text-xs font-bold">
            View Inventory
          </Link>
        </div>
      )}

      {/* Header with Territory Service Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-extrabold text-gray-900">
              {t('navCatalog', 'National FMCG Catalog')}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              📍 Delivering to Pincode: {storePincode}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Verified master products from national FMCG brands — 1-click addition to your live POS, plus bulk restock cartons delivered to your store.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setIsRestockCartOpen(true)}
            className="btn-soft !text-xs flex items-center gap-1.5 relative cursor-pointer font-bold hover:border-indigo-300"
          >
            <i className="fa-solid fa-cart-shopping text-indigo-600"></i>
            <span>Restock Cart</span>
            {totalCartons > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white font-black text-[10px] animate-pulse">
                {totalCartons}
              </span>
            )}
          </button>
          <Link to="/products" className="btn-soft !text-xs flex items-center gap-1.5 shadow-2xs">
            <i className="fa-solid fa-boxes-stacked"></i> My Store Inventory
          </Link>
        </div>
      </div>

      {/* Brand Carousel Filter */}
      {brands.length > 0 && (
        <div className="card p-3 space-y-2 bg-gradient-to-r from-slate-50 to-indigo-50/30 border border-indigo-100/60">
          <div className="flex items-center justify-between text-xs font-bold text-gray-700 px-1">
            <span className="flex items-center gap-1.5">
              <i className="fa-solid fa-award text-indigo-600"></i> Verified FMCG Brands
            </span>
            <span className="text-[11px] text-gray-400 font-normal">
              Showing {products.length} master products
            </span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs hide-scroll">
            <button
              onClick={() => setSelectedBrand('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedBrand === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              All Brands
            </button>
            {brands.map((b) => (
              <button
                key={b}
                onClick={() => setSelectedBrand(b)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  selectedBrand === b
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search & Category Filter Bar */}
      <div className="card p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by brand (Amul, Britannia, Parle...), product name, or 13-digit EAN barcode..."
            className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-indigo-500 bg-white"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 btn-primary !text-xs !py-1.5 !px-3 cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs hide-scroll">
          <button
            onClick={() => setSelectedCat('all')}
            className={`px-3 py-1.5 rounded-full font-bold transition whitespace-nowrap cursor-pointer ${
              selectedCat === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Categories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id.toString())}
              className={`px-3 py-1.5 rounded-full font-bold transition whitespace-nowrap cursor-pointer ${
                selectedCat === c.id.toString()
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="card p-12 text-center text-gray-500 text-xs">
          <i className="fa-solid fa-spinner fa-spin text-2xl mb-2 text-indigo-600 block"></i>
          Loading national master catalog & checking local distributor routing...
        </div>
      ) : products.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">
          <i className="fa-solid fa-box-open text-4xl text-gray-300 mb-3 block"></i>
          <div className="font-extrabold text-gray-800 text-sm">No master products found</div>
          <p className="text-xs text-gray-400 mt-1">
            {searchQuery
              ? `No products match "${searchQuery}". Try broadening your search or switching brands.`
              : 'No products found for this category or brand filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((item) => {
            const mrp = Number(item.printed_mrp || 0);
            const wholesale = Number(item.wholesale_price || (mrp * 0.85));
            const profitPerPack = Math.max(0, mrp - wholesale);
            const marginPct = mrp > 0 ? ((profitPerPack / mrp) * 100).toFixed(1) : '15.0';
            const caseSize = item.case_size || 24;
            const caseWholesale = Number(item.case_wholesale_price || (wholesale * caseSize));

            return (
              <div
                key={item.id}
                className="card p-4 flex flex-col justify-between hover:border-indigo-300 transition-all border border-gray-200 hover:shadow-md group relative"
              >
                <div>
                  {/* Top Bar: Brand Badge & Category */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-extrabold uppercase tracking-wide border border-indigo-100">
                      {item.brand_name || 'Brand'}
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium truncate max-w-[140px]">
                      {item.category_name}
                    </span>
                  </div>

                  {/* Product Title & EAN Barcode */}
                  <Link to={`/catalog/${item.id}`} className="block group/link cursor-pointer hover:opacity-90 transition">
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-slate-50 border border-gray-200 flex items-center justify-center">
                        {item.default_image_url ? (
                          <img
                            src={item.default_image_url}
                            alt={item.product_name}
                            className="w-full h-full object-cover group-hover/link:scale-105 transition-transform duration-200"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full items-center justify-center text-gray-300 ${item.default_image_url ? 'hidden' : 'flex'}`}>
                          <i className="fa-solid fa-box text-xl"></i>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-gray-900 leading-snug line-clamp-2 group-hover/link:text-indigo-600 transition">
                          {item.product_name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400 font-mono">
                          <span>{item.barcode ? `EAN: ${item.barcode}` : 'Standard GTIN'}</span>
                          <span>•</span>
                          <span className="text-gray-500 font-sans font-medium">
                            Box of {caseSize} {item.standard_unit || 'packs'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Pricing & Retailer Margin Breakdown */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50/80 border border-gray-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Retail MRP:</span>
                      <span className="font-extrabold text-gray-900">
                        ₹{mrp.toFixed(2)} <span className="text-[10px] text-gray-400 font-normal">/ {item.standard_unit || 'pack'}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Wholesale Price:</span>
                      <span className="font-extrabold text-indigo-700">
                        ₹{wholesale.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 text-[11px]">
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        <i className="fa-solid fa-percent text-[9px]"></i> Your Margin:
                      </span>
                      <span className="font-extrabold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.2 rounded">
                        +{marginPct}% (₹{profitPerPack.toFixed(2)} profit/pack)
                      </span>
                    </div>
                  </div>

                  {/* Local Fulfillment Delivery Badge */}
                  <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50/70 border border-blue-100/80 text-[10px] text-blue-900">
                    <i className="fa-solid fa-truck-fast text-blue-600 text-xs"></i>
                    <span className="truncate">
                      <strong>⚡ Fulfilled by:</strong> {item.distributor_name || 'Apex City Stockists'} ({item.lead_time_hours || 12}h delivery)
                    </span>
                  </div>
                </div>

                {/* Dual Action Buttons */}
                <div className="pt-3 mt-3 border-t border-gray-100 flex items-center gap-2">
                  {item.already_in_store ? (
                    <span className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1 border border-emerald-200">
                      <i className="fa-solid fa-circle-check"></i> In Store
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openAdoptModal(item)}
                      className="flex-1 btn-soft !py-1.5 !px-2.5 !text-xs flex items-center justify-center gap-1 cursor-pointer font-bold hover:border-emerald-300 hover:text-emerald-700"
                      title="Add to your store POS & inventory to sell to retail buyers"
                    >
                      <i className="fa-solid fa-plus text-emerald-600"></i> Add to Store
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openRestockModal(item)}
                    className="flex-1 btn-primary !py-1.5 !px-2.5 !text-xs flex items-center justify-center gap-1 cursor-pointer font-bold shadow-xs"
                    title={`Order restock shipper cartons from ${item.distributor_name || 'Local Stockist'}`}
                  >
                    <i className="fa-solid fa-boxes-packing"></i> Restock Cases
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 1. ADOPT / ADD TO STORE INVENTORY MODAL */}
      {adoptModalItem && (
        <div
          className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setAdoptModalItem(null)}
        >
          <div
            className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded">
                  {adoptModalItem.brand_name}
                </span>
                <h3 className="text-base font-extrabold text-gray-900 mt-1">
                  1-Click Add to Store Catalog
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAdoptModalItem(null)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div>
              <div className="font-bold text-xs text-gray-800">{adoptModalItem.product_name}</div>
              <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                Barcode: {adoptModalItem.barcode || 'Standard Item'} • Printed MRP: ₹{adoptModalItem.printed_mrp}
              </div>
            </div>

            <form onSubmit={handleConfirmAdopt} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Your Retail Selling Price (₹) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  value={customSellPrice}
                  onChange={(e) => setCustomSellPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold text-sm text-gray-900 outline-none focus:border-indigo-500 bg-white"
                  required
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  Defaults to printed MRP. You may offer a merchant discount if desired.
                </span>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Initial Opening Stock Quantity ({adoptModalItem.standard_unit || 'units'}) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={customStock}
                  onChange={(e) => setCustomStock(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold text-sm text-gray-900 outline-none focus:border-indigo-500 bg-white"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAdoptModalItem(null)}
                  className="flex-1 btn-soft !py-2.5 !text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdopting}
                  className="flex-1 btn-primary !py-2.5 !text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-check"></i>
                  {isAdopting ? 'Publishing...' : 'Publish to Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. RESTOCK SHIPPER CARTONS MODAL (B2B Supply Chain Routing) */}
      {restockModalItem && (
        <div
          className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setRestockModalItem(null)}
        >
          <div
            className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold text-indigo-700 uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {restockModalItem.brand_name}
                </span>
                <h3 className="text-base font-extrabold text-gray-900 mt-1 flex items-center gap-1.5">
                  <i className="fa-solid fa-boxes-packing text-indigo-600"></i> Restock Shipper Cartons
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRestockModalItem(null)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Product & Carton Info */}
            <div className="p-3 rounded-xl bg-slate-50 border border-gray-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-gray-900">{restockModalItem.product_name}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  Pack Size: <strong>{restockModalItem.case_size || 24} units / carton</strong> • EAN: {restockModalItem.barcode}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-400 block uppercase font-bold">Case Wholesale</span>
                <span className="text-sm font-black text-indigo-700">
                  ₹{Number(restockModalItem.case_wholesale_price || (restockModalItem.wholesale_price * (restockModalItem.case_size || 24))).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Order Form */}
            <form onSubmit={handleConfirmRestock} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1.5">
                  Number of Master Cartons (Shipper Boxes) to Order:
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRestockCases(prev => Math.max(1, prev - 1))}
                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-base flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={restockCases}
                    onChange={(e) => setRestockCases(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="flex-1 py-2 text-center rounded-xl border border-gray-200 font-black text-base text-gray-900 outline-none focus:border-indigo-500 bg-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setRestockCases(prev => prev + 1)}
                    className="w-10 h-10 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-base flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Live Order Economics Box */}
              {(() => {
                const cases = Math.max(1, parseInt(restockCases, 10) || 1);
                const caseSize = restockModalItem.case_size || 24;
                const totalUnits = cases * caseSize;
                const wholesalePerPack = Number(restockModalItem.wholesale_price || (restockModalItem.printed_mrp * 0.85));
                const totalWholesale = wholesalePerPack * totalUnits;
                const totalRetail = Number(restockModalItem.printed_mrp || 0) * totalUnits;
                const totalProfit = totalRetail - totalWholesale;

                return (
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                      <span>Total Units in Delivery:</span>
                      <span className="font-extrabold text-gray-900">{totalUnits} {restockModalItem.standard_unit || 'packs'}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                      <span>Total Purchase Amount (Wholesale):</span>
                      <span className="text-sm font-black text-indigo-700">₹{totalWholesale.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                      <span>Expected Retail Return (MRP):</span>
                      <span>₹{totalRetail.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-emerald-200 text-xs font-extrabold text-emerald-800">
                      <span>Estimated Store Profit:</span>
                      <span>+₹{totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Delivery Details */}
              <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-blue-800">
                  <i className="fa-solid fa-location-dot"></i> Automated Local Delivery:
                </div>
                <div>
                  Assigned Stockist: <strong>{restockModalItem.distributor_name || 'Apex City Stockists'}</strong>
                </div>
                <div>
                  Lead SLA: <strong>{restockModalItem.lead_time_hours || 12} Hours</strong> to your store Pincode ({storePincode})
                </div>
                <div className="text-gray-500 text-[10px]">
                  Payment: Cash on Delivery (COD) / 7-Day Distributor Ledger upon delivery challan.
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setRestockModalItem(null)}
                  className="flex-1 btn-soft !py-2.5 !text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRestocking}
                  className="flex-1 btn-primary !py-2.5 !text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <i className="fa-solid fa-truck-ramp-box"></i>
                  {isRestocking ? 'Dispatching...' : 'Confirm Restock Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Wholesale Restock Cart Drawer */}
      <RestockCartDrawer
        isOpen={isRestockCartOpen}
        onClose={() => setIsRestockCartOpen(false)}
        onOrderPlaced={(order) => {
          showToast(`🎉 Bulk Restock Order placed! Van delivery in 12h.`);
        }}
      />
    </section>
  );
}
