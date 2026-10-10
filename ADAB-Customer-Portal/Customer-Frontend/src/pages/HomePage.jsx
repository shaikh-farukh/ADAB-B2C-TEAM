import React, { useEffect, useState } from 'react';
import { api } from '../api/api';
import ProductCard from '../components/ProductCard';
import { Link, useNavigate } from 'react-router-dom';

export default function HomePage({ onAddToCart, onNavigate, onToggleWishlist, wishlist }) {
  const [recommended, setRecommended] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stores, setStores] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [latestOrder, setLatestOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/catalog/recommended').catch(() => ({ data: { data: [] } })),
      api.get('/catalog/categories').catch(() => ({ data: { data: [] } })),
      api.get('/catalog/stores').catch(() => ({ data: { data: [] } })),
      api.get('/cart/coupons').catch(() => ({ data: { data: { coupons: [] } } })),
      api.get('/catalog/promotions').catch(() => ({ data: { data: [] } })),
      api.get('/orders').catch(() => ({ data: { data: [] } }))
    ])
      .then(([recRes, catRes, storeRes, couponRes, promoRes, orderRes]) => {
        setRecommended(recRes?.data?.data || recRes?.data || []);
        setCategories(catRes?.data?.data || catRes?.data || []);
        setStores(storeRes?.data?.data || storeRes?.data || []);
        setCoupons(couponRes?.data?.data?.coupons || couponRes?.data?.coupons || []);
        setPromotions(promoRes?.data?.data || promoRes?.data || []);
        const orders = orderRes?.data?.data || orderRes?.data || [];
        if (orders.length > 0) {
          setLatestOrder(orders[0]);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const go = (path, extra) => {
    if (onNavigate) {
      onNavigate(path, extra);
    } else {
      navigate('/' + path + (extra?.storeId ? `?store_id=${extra.storeId}` : ''));
    }
  };

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
            const initial = (shop.name || 'Store').substring(0, 2).toUpperCase();
            return (
              <button key={shop.id} onClick={() => go('stores', { storeId: shop.id, store: shop })} className="flex flex-col items-center gap-1.5 shrink-0 group">
                <div className="story-ring"><div className={`w-14 h-14 rounded-full ${colors[i % 5]} text-white font-extrabold flex items-center justify-center text-sm shadow-md group-hover:scale-105 transition-transform`}>{initial}</div></div>
                <span className="text-[11px] font-bold text-gray-800 truncate max-w-[64px]">{(shop.name || '').split(' ')[0]}</span>
              </button>
            )
          })}
          <button onClick={() => go('stores', { storeId: null, store: null })} className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="w-14 h-14 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 text-gray-500 font-bold flex items-center justify-center text-xs"><i className="fa-solid fa-plus text-base"></i></div>
            <span className="text-[11px] font-bold text-gray-600">{stores.length > 0 ? `${stores.length} Shops` : 'Shops'}</span>
          </button>
        </div>
      </div>

      {/* Active Live Order Strip from DB */}
      {latestOrder ? (
        <div onClick={() => go('track')} className="cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-4 flex items-center gap-3.5 shadow-lg shadow-emerald-700/20 hover:scale-[1.01] transition-all">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-xl shrink-0"><i className="fa-solid fa-motorcycle animate-bounce"></i></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/25">
                {latestOrder.order_status === 'PLACED' ? 'ON THE WAY' : latestOrder.order_status}
              </span>
              <span className="text-xs text-emerald-100">
                Order #{latestOrder.order_number || (latestOrder.id && latestOrder.id.slice(0, 8))}
              </span>
            </div>
            <div className="font-extrabold text-sm mt-0.5 truncate">
              Arriving in ~{latestOrder.eta_minutes || 18} min · {latestOrder.seller_orders?.[0]?.store_name || stores[0]?.name || 'Shabbir Grocery Shop'}
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-white text-emerald-800 font-extrabold text-xs shrink-0 shadow-sm">Track <i className="fa-solid fa-arrow-right ml-1 text-[10px]"></i></span>
        </div>
      ) : stores.length > 0 ? (
        <div onClick={() => go('stores', { storeId: stores[0].id, store: stores[0] })} className="cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-4 flex items-center gap-3.5 shadow-lg shadow-emerald-700/20 hover:scale-[1.01] transition-all">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-xl shrink-0"><i className="fa-solid fa-shop"></i></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/25">OPEN NOW</span>
              <span className="text-xs text-emerald-100">{stores[0].area}</span>
            </div>
            <div className="font-extrabold text-sm mt-0.5 truncate">
              Order fresh daily essentials from {stores[0].name}
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-white text-emerald-800 font-extrabold text-xs shrink-0 shadow-sm">Shop Now <i className="fa-solid fa-arrow-right ml-1 text-[10px]"></i></span>
        </div>
      ) : null}

      {/* Dynamic Deal Banners from DB */}
      <div className="flex gap-3 overflow-x-auto hide-scroll snap-x pb-1">
        {coupons.length > 0 ? (
          coupons.slice(0, 3).map((cp, idx) => {
            const bannerGradients = [
              'from-amber-500 via-orange-500 to-rose-600',
              'from-indigo-600 via-purple-600 to-pink-600',
              'from-emerald-600 via-teal-600 to-cyan-600'
            ];
            const grad = bannerGradients[idx % bannerGradients.length];
            const discountText = cp.discount_type === 'PERCENTAGE' 
              ? `${parseInt(cp.discount_value)}% OFF` 
              : `Flat ₹${parseInt(cp.discount_value)} OFF`;

            return (
              <button 
                key={cp.code || idx} 
                onClick={() => go('cart')} 
                className={`banner-slide shrink-0 bg-gradient-to-br ${grad} p-5 text-white text-left min-h-[125px] flex flex-col justify-between`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold bg-black/20 px-2.5 py-0.5 rounded-full">LIVE COUPON</span>
                  <span className="text-xs font-bold text-amber-100">
                    {cp.min_order_value > 0 ? `Min ₹${parseInt(cp.min_order_value)}` : 'No minimum'}
                  </span>
                </div>
                <div>
                  <span className="font-extrabold text-xl leading-tight block">{discountText}</span>
                  <span className="text-xs text-orange-100 mt-0.5 block">
                    Use code <code className="bg-white/25 px-1.5 py-0.5 rounded font-bold text-white">{cp.code}</code> at checkout
                  </span>
                </div>
              </button>
            );
          })
        ) : promotions.length > 0 ? (
          promotions.slice(0, 2).map((promo, idx) => (
            <button 
              key={promo.id || idx} 
              onClick={() => go('stores')} 
              className="banner-slide shrink-0 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 p-5 text-white text-left min-h-[125px] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold bg-black/20 px-2.5 py-0.5 rounded-full">{promo.promo_type || 'PROMO'}</span>
                <span className="text-xs font-bold text-amber-100">{promo.store_name || 'Active Sale'}</span>
              </div>
              <div>
                <span className="font-extrabold text-xl leading-tight block">{promo.title}</span>
                <span className="text-xs text-orange-100 mt-0.5 block">Discounts applied directly on verified seller catalog</span>
              </div>
            </button>
          ))
        ) : null}
      </div>

      {/* Category Pills */}
      <div>
        <div className="flex justify-between items-end mb-3">
          <div>
            <h2 className="section-title">What are you looking for?</h2>
            <p className="text-xs text-gray-500 mt-0.5">Explore categories across local stores</p>
          </div>
          <button onClick={() => go('categories')} className="text-brand-green text-xs font-extrabold hover:underline">View All →</button>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
          {categories.slice(0, 6).map((cat, i) => {
             const icons = ['🥬', '🥛', '🌾', '🫒', '👗', '🍿'];
             return (
              <button key={cat.id} onClick={() => go(`search?q=${cat.slug || cat.name}`)} className="cat-pill flex flex-col items-center gap-1 text-center">
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
          <button onClick={() => go('stores', { storeId: null, store: null })} className="text-brand-green text-xs font-extrabold hover:underline">All {stores.length} shops →</button>
        </div>
        <div className="space-y-3.5">
          {stores.slice(0, 2).map((shop) => (
            <div key={shop.id} className="shop-card flex bg-white cursor-pointer" onClick={() => go('stores', { storeId: shop.id, store: shop })}>
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
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate">{(Array.isArray(shop.tags) && shop.tags.length > 0 ? shop.tags.join(' & ') : 'General Store')} · {shop.area}</p>
                    <div className="mt-2 flex gap-1.5">
                        <span className="store-chip">{shop.distance || 'Local'} Delivery</span>
                        <span className="store-chip">{shop.rating} ★ Rating</span>
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
              <ProductCard 
                key={product.id} 
                product={product} 
                onAddToCart={onAddToCart} 
                onToggleWishlist={onToggleWishlist}
                wishlist={wishlist}
              />
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
              <ProductCard 
                key={product.id} 
                product={product} 
                onAddToCart={onAddToCart} 
                onToggleWishlist={onToggleWishlist}
                wishlist={wishlist}
              />
            ))}
          </div>
        </div>
      )}
      
    </div>
  );
}

