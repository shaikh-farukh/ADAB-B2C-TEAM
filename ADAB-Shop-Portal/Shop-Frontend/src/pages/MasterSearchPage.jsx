import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import listingService from '../services/listingService';
import { sellerApi } from '../api/sellerApi';
import { useTranslation } from '../context/LanguageContext';

export default function MasterSearchPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryFromUrl = searchParams.get('q') || '';
  
  const [searchInput, setSearchInput] = useState(queryFromUrl);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDistance, setSelectedDistance] = useState('all');
  const [sortBy, setSortBy] = useState('price');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [cart, setCart] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('adab_buy_cart') || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch (e) {
      return [];
    }
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  useEffect(() => {
    const handleCartUpdate = () => {
      try {
        const saved = JSON.parse(localStorage.getItem('adab_buy_cart') || '[]');
        setCart(Array.isArray(saved) ? saved : []);
      } catch (e) {
        setCart([]);
      }
    };
    window.addEventListener('adab-cart-updated', handleCartUpdate);
    return () => window.removeEventListener('adab-cart-updated', handleCartUpdate);
  }, []);

  useEffect(() => {
    setSearchInput(queryFromUrl);
  }, [queryFromUrl]);

  useEffect(() => {
    async function fetchSearchItems() {
      try {
        setLoading(true);
        // Query live catalog from registered stores across the marketplace & store inventory
        const [nearbyRes, storeListingsRes] = await Promise.allSettled([
          sellerApi.getNearbyCatalog({ q: searchInput.trim() || undefined }),
          listingService.getListings({ search: searchInput.trim() || undefined, limit: 30 })
        ]);

        const nearbyList = nearbyRes.status === 'fulfilled' && nearbyRes.value?.data
          ? (Array.isArray(nearbyRes.value.data) ? nearbyRes.value.data : (nearbyRes.value.data?.data || []))
          : [];

        const ownListings = storeListingsRes.status === 'fulfilled' && storeListingsRes.value?.data
          ? (Array.isArray(storeListingsRes.value.data) ? storeListingsRes.value.data : [])
          : [];

        const combinedItems = [];
        const seenIds = new Set();

        for (const item of nearbyList) {
          if (item?.id && !seenIds.has(item.id)) {
            seenIds.add(item.id);
            combinedItems.push({
              id: item.id,
              name: item.name || item.title || 'Product',
              store_id: item.store_id,
              store: item.store_name || 'Verified Supplier Store',
              dist: Number(item.distance_km || 3),
              price: Number(item.price || item.sell_price || 0),
              rating: item.store_rating ? Number(item.store_rating).toFixed(1) : '4.8',
              minOrder: Number(item.min_order || item.min_order_qty || 1),
              cat: item.category ? item.category.toLowerCase() : 'grocery',
              image_url: item.image_url || null
            });
          }
        }

        for (const item of ownListings) {
          if (item?.id && !seenIds.has(item.id)) {
            seenIds.add(item.id);
            combinedItems.push({
              id: item.id,
              name: item.title || item.name || 'Product',
              store_id: item.store_id || 'my-store',
              store: 'Your Store Catalog',
              dist: 0,
              price: Number(item.sell_price || item.price || 0),
              rating: '5.0',
              minOrder: Number(item.min_order_qty || 1),
              cat: item.product_type ? item.product_type.toLowerCase() : 'grocery',
              image_url: item.image_url || null
            });
          }
        }

        // Real dynamic data only - no hardcoded fallbacks
        setResults(combinedItems);
      } catch (err) {
        console.error('Error fetching master search from live catalog:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }
    fetchSearchItems();
  }, [searchInput]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams(searchInput.trim() ? { q: searchInput.trim() } : {});
  };

  const handleAddToCart = (item) => {
    try {
      const existingCart = JSON.parse(localStorage.getItem('adab_buy_cart') || '[]');
      const cartArray = Array.isArray(existingCart) ? existingCart : [];
      const itemMinOrder = Number(item.minOrder || item.min_order || 1);
      
      const existingIdx = cartArray.findIndex(ci => ci.id === item.id);
      let updatedCart;
      if (existingIdx >= 0) {
        updatedCart = [...cartArray];
        const currentQty = Number(updatedCart[existingIdx].quantity || itemMinOrder);
        updatedCart[existingIdx] = {
          ...updatedCart[existingIdx],
          quantity: currentQty + itemMinOrder
        };
      } else {
        const newCartItem = {
          id: item.id,
          name: item.name,
          store_id: item.store_id || 'store_' + (item.id || 'sup'),
          store_name: item.store || 'Verified ADAB Merchant',
          distance_km: item.dist || 3,
          price: Number(item.price) || 0,
          quantity: itemMinOrder,
          min_order: itemMinOrder,
          unit: 'units',
          category: item.cat || 'grocery'
        };
        updatedCart = [...cartArray, newCartItem];
      }
      
      localStorage.setItem('adab_buy_cart', JSON.stringify(updatedCart));
      setCart(updatedCart);
      window.dispatchEvent(new Event('adab-cart-updated'));
      showToast(`Added "${item.name}" to Purchase Cart!`);
    } catch (err) {
      console.error('Failed to update buy cart:', err);
      showToast(`Could not add "${item.name}" to cart.`);
    }
  };

  const filteredResults = results.filter(item => {
    const matchesCat = selectedCategory === 'all' || item.cat.includes(selectedCategory);
    const matchesDist = selectedDistance === 'all' || item.dist <= Number(selectedDistance);
    const matchesQuery = !searchInput || item.name.toLowerCase().includes(searchInput.toLowerCase());
    return matchesCat && matchesDist && matchesQuery;
  }).sort((a, b) => {
    if (sortBy === 'price') return a.price - b.price;
    if (sortBy === 'near') return a.dist - b.dist;
    if (sortBy === 'rating') return Number(b.rating) - Number(a.rating);
    return 0;
  });

  return (
    <section id="sec-mastersearch" className="space-y-4 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <i className="fa-solid fa-circle-check text-emerald-400 text-base"></i>
          <span>{toastMessage}</span>
          <Link to="/buycart" className="ml-2 underline text-blue-300 hover:text-blue-200 text-xs">
            View Cart
          </Link>
        </div>
      )}

      <div>
        <h1 className="text-xl font-extrabold text-gray-900">{t('searchBuyTitle', 'Search & Buy Anything')}</h1>
        <p className="text-sm text-gray-500">{t('searchBuySubtitle', 'Search all registered supplier stores across ADAB — compare prices and restock')}</p>
      </div>

      <div className="card p-5 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white">
        <form onSubmit={handleSearchSubmit} className="relative">
          <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 text-lg"></i>
          <input 
            type="search" 
            value={searchInput} 
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('searchBuyPlaceholder', 'e.g. sunflower oil, kurti, rice 25kg, garam masala...')} 
            className="w-full pl-12 pr-24 py-4 rounded-2xl border-2 border-blue-200 text-base outline-none focus:border-blue-500 bg-white" 
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 btn-primary !text-xs !py-2 !px-4 cursor-pointer">
            {t('search', 'Search')}
          </button>
        </form>

        <div className="flex gap-2 mt-3 flex-wrap text-xs font-bold">
          {['Oil', 'Rice', 'Kurti', 'Dal', 'Masala', 'Milk'].map(tag => (
            <button 
              key={tag}
              onClick={() => setSearchInput(tag)}
              className="px-3 py-1.5 rounded-full bg-white border border-gray-200 hover:border-blue-300 hover:text-blue-700 transition cursor-pointer"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <select 
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)} 
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
        >
          <option value="all">All Categories</option>
          <option value="grocery">Grocery</option>
          <option value="clothing">Clothing</option>
          <option value="dairy">Dairy</option>
          <option value="spices">Spices</option>
        </select>
        <select 
          value={selectedDistance} 
          onChange={(e) => setSelectedDistance(e.target.value)} 
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
        >
          <option value="all">Any Distance</option>
          <option value="5">Within 5 km</option>
          <option value="15">Within 15 km</option>
          <option value="50">Within 50 km</option>
        </select>
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)} 
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
        >
          <option value="price">Lowest Price</option>
          <option value="near">Nearest Store</option>
          <option value="rating">Best Rated</option>
        </select>
        {cart.length > 0 && (
          <Link 
            to="/buycart" 
            className="px-3 py-2 rounded-xl bg-blue-100 text-blue-800 text-xs font-bold flex items-center gap-1.5 self-center hover:bg-blue-200 transition"
          >
            <i className="fa-solid fa-cart-shopping"></i> {cart.length} items in Cart
            <i className="fa-solid fa-arrow-right text-[10px] ml-1"></i>
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="card p-8 text-center text-gray-500 text-sm">
            <i className="fa-solid fa-spinner fa-spin mr-2"></i> Searching live stores nationwide...
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="card p-8 text-center text-gray-500">
            <i className="fa-solid fa-search text-3xl text-gray-300 mb-3 block"></i>
            <div className="font-bold text-gray-800">No products found</div>
            <p className="text-sm mt-1 text-gray-400">
              {searchInput ? `No live merchant listings match "${searchInput}". Try another keyword.` : 'No live merchant listings found for the selected filter.'}
            </p>
          </div>
        ) : (
          filteredResults.map(item => (
            <div key={item.id} className="card p-4 hover:border-blue-300 transition">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 text-xl font-bold shrink-0">
                    <i className="fa-solid fa-box-open"></i>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500">
                      {item.store} • {item.dist} km • ★ {item.rating} • Min Order: {item.minOrder}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <div className="text-right">
                    <div className="text-xl font-extrabold text-green-700">₹{item.price}</div>
                    <div className="text-[10px] text-gray-400">Direct Merchant Price</div>
                  </div>
                  <button 
                    onClick={() => handleAddToCart(item)} 
                    className="btn-soft !text-xs whitespace-nowrap cursor-pointer"
                  >
                    <i className="fa-solid fa-cart-plus mr-1"></i> Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
