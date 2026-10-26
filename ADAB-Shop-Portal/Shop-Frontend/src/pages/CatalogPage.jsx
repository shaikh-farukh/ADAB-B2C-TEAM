import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sellerApi } from '../api/sellerApi';
import listingService from '../services/listingService';
import { useTranslation } from '../context/LanguageContext';

export default function CatalogPage() {
  const { t } = useTranslation();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [toastMessage, setToastMessage] = useState('');

  // Add to Store Inventory Modal State
  const [adoptModalItem, setAdoptModalItem] = useState(null);
  const [customSellPrice, setCustomSellPrice] = useState('');
  const [customStock, setCustomStock] = useState('20');
  const [isAdopting, setIsAdopting] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (selectedCat !== 'all') params.category_id = selectedCat;

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
  }, [selectedCat]);

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
        // Update local state to show 'already_in_store = true'
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

  return (
    <section id="sec-catalog" className="space-y-4 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <i className="fa-solid fa-circle-check text-emerald-400 text-base"></i>
          <span>{toastMessage}</span>
          <Link to="/products" className="ml-2 underline text-blue-300 hover:text-blue-200 text-xs">
            View Inventory
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">
            {t('navCatalog', 'National FMCG Catalog')}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Verified master products from national FMCG brands — 1-click addition to your live inventory & POS
          </p>
        </div>
        <Link to="/products" className="btn-soft !text-xs self-start sm:self-auto flex items-center gap-1.5">
          <i className="fa-solid fa-boxes-stacked"></i> My Store Inventory
        </Link>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="card p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by brand (Amul, Maggi, Parle...), product name, or 13-digit EAN barcode..."
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
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Master Categories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id.toString())}
              className={`px-3 py-1.5 rounded-full font-bold transition whitespace-nowrap cursor-pointer ${
                selectedCat === c.id.toString()
                  ? 'bg-indigo-600 text-white'
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
          Loading national master catalog...
        </div>
      ) : products.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">
          <i className="fa-solid fa-box-open text-4xl text-gray-300 mb-3 block"></i>
          <div className="font-extrabold text-gray-800 text-sm">No master products found</div>
          <p className="text-xs text-gray-400 mt-1">
            {searchQuery ? `No products match "${searchQuery}". Try broadening your search or switching categories.` : 'No products found for this category filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((item) => (
            <div
              key={item.id}
              className="card p-3.5 flex flex-col justify-between hover:border-indigo-300 transition-all border border-gray-200"
            >
              <div>
                {/* Brand Badge & Category */}
                <div className="flex items-center justify-between text-[10px] font-bold mb-2">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 uppercase">
                    {item.brand_name}
                  </span>
                  <span className="text-gray-400">{item.category_name}</span>
                </div>

                {/* Product Name */}
                <h3 className="font-bold text-xs text-gray-900 leading-snug line-clamp-2">
                  {item.product_name}
                </h3>

                {/* Barcode & Unit */}
                <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400 font-mono">
                  <span>{item.barcode ? `EAN: ${item.barcode}` : 'Standard FMCG'}</span>
                  <span className="uppercase text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                    {item.standard_unit || 'pcs'}
                  </span>
                </div>
              </div>

              {/* Price & Action */}
              <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">MRP</span>
                  <span className="text-base font-black text-gray-900">
                    ₹{Number(item.printed_mrp || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                {item.already_in_store ? (
                  <span className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-1">
                    <i className="fa-solid fa-check"></i> In Store
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => openAdoptModal(item)}
                    className="btn-primary !text-xs !py-1.5 !px-3 flex items-center gap-1 cursor-pointer"
                  >
                    <i className="fa-solid fa-plus"></i> Add to Store
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADOPT / ADD TO STORE INVENTORY MODAL */}
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
                  Add to Store Inventory
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAdoptModalItem(null)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center"
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
                  Your Selling Price (₹) *
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
    </section>
  );
}
