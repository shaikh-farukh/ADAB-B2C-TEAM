import React, { useEffect, useState } from 'react';
import { api } from '../api/api';
import ProductCard from '../components/ProductCard';
import { Link, useNavigate } from 'react-router-dom';

export default function HomePage() {
  const [recommended, setRecommended] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/catalog/recommended').catch(() => ({ data: { data: [] } })),
      api.get('/catalog/categories').catch(() => ({ data: { data: [] } })),
      api.get('/catalog/stores').catch(() => ({ data: { data: [] } }))
    ])
      .then(([recRes, catRes, storeRes]) => {
        setRecommended(recRes?.data?.data || []);
        setCategories(catRes?.data?.data || []);
        setStores(storeRes?.data?.data || []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const go = (path) => navigate('/' + path);

  return (
    <div className="pt-4 pb-4 space-y-6">
      {/* Live Neighborhood Stories / Quick Shop Avatars */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">Live in your zone</span>
          <span className="tag-live"><i className="fa-solid fa-circle mr-1 text-[7px]"></i> OPEN NOW</span>
        </div>
        <div className="flex gap-3 overflow-x-auto hide-scroll pb-1">
          {stores.map((shop, i) => {
            const colors = ['bg-emerald-600', 'bg-blue-600', 'bg-orange-500', 'bg-cyan-600', 'bg-purple-600'];
            const initial = shop.name.substring(0, 2).toUpperCase();
            return (
              <button key={shop.id} onClick={() => go('stores')} className="flex flex-col items-center gap-1.5 shrink-0 group">
                <div className="story-ring"><div className={`w-14 h-14 rounded-full ${colors[i % 5]} text-white font-extrabold flex items-center justify-center text-sm shadow-md group-hover:scale-105 transition-transform`}>{initial}</div></div>
                <span className="text-[11px] font-bold text-gray-800 truncate max-w-[64px]">{shop.name.split(' ')[0]}</span>
              </button>
            )
          })}
          <button onClick={() => go('stores')} className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="w-14 h-14 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 text-gray-500 font-bold flex items-center justify-center text-xs"><i className="fa-solid fa-plus text-base"></i></div>
            <span className="text-[11px] font-bold text-gray-600">{stores.length}+ More</span>
          </button>
        </div>
      </div>

      {/* Active Live Order Strip */}
      <div onClick={() => go('track')} className="cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-4 flex items-center gap-3.5 shadow-lg shadow-emerald-700/20 hover:scale-[1.01] transition-all">
        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-xl shrink-0"><i className="fa-solid fa-motorcycle animate-bounce"></i></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/25">ON THE WAY</span>
            <span className="text-xs text-emerald-100">Order #9021</span>
          </div>
          <div className="font-extrabold text-sm mt-0.5 truncate">Arriving in ~18 min · Shri Balaji Store</div>
        </div>
        <span className="px-3 py-1.5 rounded-xl bg-white text-emerald-800 font-extrabold text-xs shrink-0 shadow-sm">Track <i className="fa-solid fa-arrow-right ml-1 text-[10px]"></i></span>
      </div>

      {/* Hero Deal Banners */}
      <div className="flex gap-3 overflow-x-auto hide-scroll snap-x pb-1">
        <button onClick={() => go('offers')} className="banner-slide shrink-0 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 p-5 text-white text-left min-h-[125px] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold bg-black/20 px-2.5 py-0.5 rounded-full">FLASH DEAL</span>
            <span className="text-xs font-bold text-amber-100">Ends in 2 hrs</span>
          </div>
          <div>
            <span className="font-extrabold text-xl leading-tight block">15% OFF at Balaji Store</span>
            <span className="text-xs text-orange-100 mt-0.5 block">Use code <code className="bg-white/25 px-1.5 py-0.5 rounded font-bold text-white">BALAJI15</code> on daily essentials</span>
          </div>
        </button>

        <button onClick={() => go('offers')} className="banner-slide shrink-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-5 text-white text-left min-h-[125px] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold bg-white/20 px-2.5 py-0.5 rounded-full">NEW CUSTOMER</span>
            <span className="text-xs font-bold text-indigo-200">Zero Delivery Fee</span>
          </div>
          <div>
            <span className="font-extrabold text-xl leading-tight block">Flat ₹100 Off First Order</span>
            <span className="text-xs text-indigo-100 mt-0.5 block">Across any neighborhood shop with <code className="bg-white/25 px-1.5 py-0.5 rounded font-bold text-white">ADAB100</code></span>
          </div>
        </button>
      </div>

      {/* Category Pills */}
      <div>
        <div className="flex justify-between items-end mb-3">
          <div>
            <h2 className="section-title">What are you looking for?</h2>
            <p className="text-xs text-gray-500 mt-0.5">Explore 10+ categories across local stores</p>
          </div>
          <button onClick={() => go('categories')} className="text-brand-green text-xs font-extrabold hover:underline">View All →</button>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
          {categories.slice(0, 6).map((cat, i) => {
             const icons = ['🥬', '🥛', '🌾', '🫒', '👗', '🍿'];
             return (
              <button key={cat.id} onClick={() => go(`search?q=${cat.slug}`)} className="cat-pill flex flex-col items-center gap-1 text-center">
                <span className="text-2xl transform hover:scale-110 transition-transform">{icons[i % 6]}</span>
                <span className="text-[11px] font-extrabold text-gray-800">{cat.name}</span>
              </button>
             )
          })}
        </div>
      </div>

      {/* Featured Nearby Stores */}
      <div>
        <div className="flex justify-between items-end mb-3">
          <div>
            <h2 className="section-title">Top Verified Stores</h2>
            <p className="text-xs text-gray-500 mt-0.5">Direct from your trusted local merchants</p>
          </div>
          <button onClick={() => go('stores')} className="text-brand-green text-xs font-extrabold hover:underline">All {stores.length} shops →</button>
        </div>
        <div className="space-y-3.5">
          {stores.slice(0, 2).map((shop) => (
            <div key={shop.id} className="shop-card flex bg-white cursor-pointer" onClick={() => go('stores')}>
                <div className="w-1/3 bg-gray-200 relative">
                    <img src={shop.image} alt={shop.name} className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded text-[10px] font-extrabold text-emerald-700 flex items-center gap-1">
                        <i className="fa-solid fa-star text-amber-400"></i> {shop.rating}
                    </div>
                </div>
                <div className="p-3 w-2/3">
                    <div className="flex justify-between items-start">
                        <h3 className="font-extrabold text-sm text-gray-900 leading-tight">{shop.name}</h3>
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{shop.distance}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate">{shop.tags.join(' & ')} · {shop.area}</p>
                    <div className="mt-2 flex gap-1.5">
                        <span className="store-chip">14m Delivery</span>
                        <span className="store-chip">15% OFF</span>
                    </div>
                </div>
            </div>
          ))}
        </div>
      </div>

      {/* Popular Picks Grid */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="section-title">Trending in Your Area</h2>
            <p className="text-xs text-gray-500 mt-0.5">Top-selling products delivered in minutes</p>
          </div>
          <button onClick={() => go('search')} className="text-brand-green text-xs font-extrabold hover:underline">Search all →</button>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 rounded-2xl aspect-[3/4]"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {recommended.slice(0, 6).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {/* Fresh Arrivals */}
      {recommended.length > 6 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="section-title">More From Local Kiranas</h2>
              <p className="text-xs text-gray-500 mt-0.5">Authentic regional staples and fresh batches</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {recommended.slice(6, 12).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
      
    </div>
  );
}

