import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sellerApi } from '../api/sellerApi';
import { useSeller } from '../context/SellerContext';

export default function PartnerBrandsPage() {
  const { store } = useSeller();

  const [products, setProducts] = useState([]);
  const [myAdded, setMyAdded] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedStore, setSelectedStore] = useState('all');

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [customPrice, setCustomPrice] = useState('');
  const [customStock, setCustomStock] = useState('20');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [brandsRes, myAddedRes] = await Promise.allSettled([
        sellerApi.getOtherStoreBrands(),
        sellerApi.getMyAddedOtherStoreBrands()
      ]);

      if (brandsRes.status === 'fulfilled') {
        const raw = brandsRes.value?.data !== undefined ? brandsRes.value.data : brandsRes.value;
        setProducts(Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []));
      } else {
        setProducts([]);
      }

      if (myAddedRes.status === 'fulfilled') {
        const raw = myAddedRes.value?.data !== undefined ? myAddedRes.value.data : myAddedRes.value;
        setMyAdded(Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []));
      } else {
        setMyAdded([]);
      }
    } catch (err) {
      console.error('Failed to load other store brands:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = (product) => {
    setSelectedProduct(product);
    setCustomPrice(product.mrp || product.wholesale_price || '');
    setCustomStock('20');
  };

  const closeAddModal = () => {
    setSelectedProduct(null);
    setIsSubmitting(false);
  };

  const handleConfirmAdd = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      setIsSubmitting(true);
      await sellerApi.addOtherStoreBrandToMyStore({
        originalListingId: selectedProduct.id,
        sellPrice: Number(customPrice) || Number(selectedProduct.wholesale_price || selectedProduct.mrp),
        stockQty: Number(customStock) || 20
      });

      showToast(`Added "${selectedProduct.title}" to your store catalog!`);
      closeAddModal();
      loadData(); // Refresh list
    } catch (err) {
      console.error('Failed to add product to store:', err);
      showToast(err?.response?.data?.error || 'Failed to add product');
      setIsSubmitting(false);
    }
  };

  // Filtered list
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      (p.title || '').toLowerCase().includes(q) ||
      (p.brand_tag || '').toLowerCase().includes(q) ||
      (p.store_name || '').toLowerCase().includes(q);

    const matchCat =
      selectedCat === 'all' || (p.category || '').toLowerCase().includes(selectedCat.toLowerCase());

    const matchStore =
      selectedStore === 'all' || String(p.store_id) === String(selectedStore);

    return matchSearch && matchCat && matchStore;
  });

  // Extract distinct store options
  const storeOptions = Array.from(
    new Map(
      products.map((p) => [p.store_id, { id: p.store_id, name: p.store_name }])
    ).values()
  );

  // Extract categories
  const categoriesList = Array.from(
    new Set(
      products
        .map((p) => p.category)
        .filter(Boolean)
        .concat(['Clothing', 'Food & Snacks', 'Beauty', 'Home Care', 'Grocery'])
    )
  );

  return (
    <section id="sec-partnerbrands" className="space-y-5 fade-in">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-2 animate-bounce">
          <i className="fa-solid fa-check-circle text-green-400"></i>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">Other Store Brands</h1>
            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-extrabold uppercase tracking-wide">
              Own Brand Network
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Browse private labels and own-brand products created by other merchant stores on ADAB. Add them to your shop with your own retail pricing.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200">
            {products.length} store brand products available
          </span>
        </div>
      </div>

      {/* Explanatory Banner */}
      <div className="card p-4 bg-gradient-to-r from-blue-50 to-indigo-50/50 border-blue-200 text-xs sm:text-sm text-blue-950 flex items-start gap-3 shadow-sm">
        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-base">
          <i className="fa-solid fa-lightbulb"></i>
        </div>
        <div>
          <strong className="font-extrabold text-blue-900 block mb-0.5">How Other Store Brands Work:</strong>
          <span className="text-blue-800/90 leading-relaxed">
            When another verified store creates an <strong>Own Brand</strong> product and publishes it, it appears here for mutual resale. You add it to your catalog with your chosen retail price — when nearby customers buy from your store, the producing store supplies the stock!
          </span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card p-3 flex flex-col sm:flex-row items-center gap-2 bg-white">
        <div className="relative flex-1 w-full">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product, brand, or store name..."
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm outline-none focus:border-amber-500 transition"
          />
        </div>

        <select
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium outline-none focus:border-amber-500 bg-white"
        >
          <option value="all">All Categories</option>
          {categoriesList.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Quick Store Filter Pills */}
      {storeOptions.length > 0 && (
        <div className="flex gap-2 text-xs font-bold flex-wrap items-center">
          <span className="text-gray-400 text-[11px] font-semibold">Filter by Maker:</span>
          <button
            type="button"
            onClick={() => setSelectedStore('all')}
            className={`px-3 py-1.5 rounded-full transition ${
              selectedStore === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Stores
          </button>
          {storeOptions.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setSelectedStore(st.id)}
              className={`px-3 py-1.5 rounded-full transition ${
                selectedStore === st.id
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st.name}
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="card p-12 text-center text-gray-500 text-sm space-y-3">
          <i className="fa-solid fa-circle-notch fa-spin text-3xl text-amber-600"></i>
          <div className="font-bold text-gray-700">Loading Other Store Brands from Database...</div>
          <p className="text-xs text-gray-400">Filtering for approved 'Own Brand' listings from partner stores.</p>
        </div>
      )}

      {/* Products Grid */}
      {!loading && (
        <>
          {filteredProducts.length === 0 ? (
            /* Real Clean Empty State */
            <div className="card p-10 sm:p-14 text-center border-dashed border-2 border-gray-200 space-y-4 max-w-2xl mx-auto my-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto text-2xl shadow-inner">
                <i className="fa-solid fa-boxes-packing"></i>
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">No Other Store Brands Available Yet</h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
                  This page only displays products with type <strong>'Own Brand'</strong> manufactured or packed by <em>other</em> registered merchant shops.
                </p>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl text-left border border-gray-200 text-xs text-gray-600 space-y-2">
                <div className="font-bold text-gray-800 flex items-center gap-1.5">
                  <i className="fa-solid fa-circle-info text-blue-600"></i> Multi-Seller Testing Rules:
                </div>
                <ul className="list-disc list-inside space-y-1 text-gray-500 pl-1">
                  <li>Your own store's Own Brands (like SG FOOD Wafers) belong to you and are excluded here.</li>
                  <li>When you log into the <strong>2nd seller account</strong> (Merchant Store) and create an 'Own Brand' product, it will automatically appear here for other stores to sell!</li>
                </ul>
              </div>

              <div className="flex gap-2 justify-center pt-2">
                <Link to="/products" className="btn-primary !text-xs !py-2.5 !px-4">
                  Manage My Own Brands
                </Link>
                <Link to="/buy" className="btn-soft !text-xs !py-2.5 !px-4">
                  Browse Nearby Restock
                </Link>
              </div>
            </div>
          ) : (
            /* Live Cards Grid */
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((p) => {
                const isAlreadyAdded = myAdded.some((m) => m.title === p.title);
                return (
                  <div
                    key={p.id}
                    className="card p-4 space-y-3 hover:shadow-md hover:border-amber-200 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 shrink-0 text-xl font-black">
                          {p.brand_tag ? p.brand_tag.charAt(0) : 'B'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-bold text-purple-700 flex items-center justify-between">
                            <span className="truncate">{p.store_name}</span>
                            <span className="bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded text-[9px] uppercase font-extrabold">
                              Own Brand
                            </span>
                          </div>
                          <h3 className="font-extrabold text-gray-900 text-sm truncate mt-0.5">{p.title}</h3>
                          <div className="text-xs text-gray-500">
                            Brand: <span className="font-bold text-gray-700">{p.brand_tag || 'Store Brand'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 bg-gray-50 rounded-xl space-y-1 text-xs border border-gray-100">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Wholesale Price:</span>
                          <span className="font-extrabold text-emerald-700">
                            ₹{Number(p.wholesale_price || p.mrp || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        {p.mrp && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Suggested MRP:</span>
                            <span className="font-bold text-gray-700">₹{Number(p.mrp).toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-[11px]">
                          <span className="text-gray-400">Stores selling:</span>
                          <span className="font-bold text-gray-600">{p.stores_selling_count || 1} stores</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openAddModal(p)}
                      disabled={isAlreadyAdded}
                      className={`w-full py-2.5 rounded-xl font-extrabold text-xs transition flex items-center justify-center gap-1.5 ${
                        isAlreadyAdded
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                      }`}
                    >
                      <i className={`fa-solid ${isAlreadyAdded ? 'fa-check' : 'fa-plus'}`}></i>
                      <span>{isAlreadyAdded ? 'Already Added' : 'Add to My Store'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Already Added to My Store Table */}
      <div className="card p-5 space-y-3 bg-white">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base text-gray-900">
            Already Added from Other Store Brands
          </h3>
          <span className="text-xs font-bold text-gray-400">{myAdded.length} items active</span>
        </div>

        {myAdded.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            You haven't added any partner store brands to your catalog yet. Click "Add to My Store" on any product above to start reselling.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="px-3 py-2 font-bold">Product</th>
                  <th className="px-3 py-2 font-bold">Original Producer</th>
                  <th className="px-3 py-2 font-bold">Wholesale</th>
                  <th className="px-3 py-2 font-bold">Your Price</th>
                  <th className="px-3 py-2 font-bold">Your Stock</th>
                  <th className="px-3 py-2 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {myAdded.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2.5 font-bold text-gray-900">
                      {item.title}
                      {item.brand_tag && (
                        <span className="ml-1 text-[10px] text-purple-700 font-semibold">({item.brand_tag})</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">{item.original_store_name || 'Partner Store'}</td>
                    <td className="px-3 py-2.5 text-gray-500">₹{item.wholesale_price || '-'}</td>
                    <td className="px-3 py-2.5 font-bold text-emerald-700">₹{item.sell_price}</td>
                    <td className="px-3 py-2.5">{item.stock_qty} {item.unit || 'pcs'}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded">
                        Live in Store
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add to My Store Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl fade-in">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wide">
                  Add Store Brand
                </span>
                <h3 className="font-extrabold text-lg text-gray-900 leading-tight">
                  {selectedProduct.title}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Made by {selectedProduct.store_name} ({selectedProduct.brand_tag || 'Own Brand'})
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddModal}
                className="text-gray-400 hover:text-gray-600 text-lg p-1"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-900 border border-amber-200">
              <div className="flex justify-between font-bold">
                <span>Producer Wholesale Price:</span>
                <span>₹{selectedProduct.wholesale_price || selectedProduct.mrp}</span>
              </div>
              {selectedProduct.mrp && (
                <div className="flex justify-between text-gray-600 mt-1">
                  <span>Suggested MRP:</span>
                  <span>₹{selectedProduct.mrp}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleConfirmAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Your Selling Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold text-emerald-800 outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-gray-400">
                  The retail price your customers will pay on ADAB.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Initial Stock Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={customStock}
                  onChange={(e) => setCustomStock(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="btn-soft flex-1 !text-xs !py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex-1 !text-xs !py-2.5 flex items-center justify-center gap-1"
                >
                  {isSubmitting ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fa-solid fa-check"></i>
                  )}
                  <span>Confirm &amp; Add</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
