import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/api';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';

let homeDataCache = {};

const DEFAULT_CATEGORIES = [
  { id: 'cat-veg', name: 'Fresh Vegetables', slug: 'vegetables' },
  { id: 'cat-dairy', name: 'Dairy & Breakfast', slug: 'dairy' },
  { id: 'cat-staples', name: 'Atta, Rice & Dals', slug: 'staples' },
  { id: 'cat-oils', name: 'Oil & Spices', slug: 'oils' },
  { id: 'cat-snacks', name: 'Snacks & Munchies', slug: 'snacks' },
  { id: 'cat-bakery', name: 'Bakery & Breads', slug: 'bakery' },
  { id: 'cat-drinks', name: 'Drinks & Tea', slug: 'beverages' },
  { id: 'cat-care', name: 'Household & Care', slug: 'personal' }
];

const DEFAULT_STORES = [
  { id: 'store-1', name: 'Shabbir Grocery Shop', area: 'Vesu Main Road', rating: 4.8, distance: '1.2 km', tags: ['Fresh Groceries', 'Daily Dairy', 'Kirana Rates'] },
  { id: 'store-2', name: 'Maya Provision Store', area: 'Adajan Gam', rating: 4.7, distance: '2.1 km', tags: ['Grains & Pulses', 'Atta & Dals', 'Spices'] },
  { id: 'store-3', name: 'Faruk Super Market', area: 'Rander Road', rating: 4.9, distance: '2.8 km', tags: ['Daily Staples', 'Snacks', 'Beverages'] }
];

const DEFAULT_TRENDING = [
  { id: 'p1', name: 'Fresh Farm Tomatoes (1 kg)', price: 34, mrp: 45, rating: 4.8, reviews: 38, sellerName: 'Shabbir Grocery Shop' },
  { id: 'p2', name: 'Amul Taaza Homogenised Milk 1L', price: 74, mrp: 76, rating: 4.9, reviews: 112, sellerName: 'Maya Provision Store' },
  { id: 'p3', name: 'Aashirvaad Shudh Chakki Atta 5kg', price: 235, mrp: 270, rating: 4.9, reviews: 84, sellerName: 'Faruk Super Market' },
  { id: 'p4', name: 'Balaji Wafers Simply Salted 135g', price: 30, mrp: 30, rating: 4.6, reviews: 52, sellerName: 'Shabbir Grocery Shop' },
  { id: 'p5', name: 'Tata Salt Vaccum Evaporated 1kg', price: 28, mrp: 30, rating: 4.9, reviews: 90, sellerName: 'Maya Provision Store' },
  { id: 'p6', name: 'Fortune Sunlite Refined Oil 1L', price: 145, mrp: 165, rating: 4.7, reviews: 43, sellerName: 'Faruk Super Market' }
];

/* =========================================================================
   1. VISUAL CATEGORY CARD (Professional Merchandising - Zero Raw Emojis)
   ========================================================================= */
function VisualCategoryCard({ cat, index, onClick }) {
  const [imgFailed, setImgFailed] = useState(!cat.image);

  const themes = [
    {
      id: 'vegetables',
      match: ['veg', 'produce', 'sabji', 'fresh', 'farm'],
      title: 'Fresh Vegetables',
      tag: 'Farm Daily',
      tagBg: 'bg-emerald-100 text-emerald-800',
      gradient: 'from-emerald-50 via-green-50 to-emerald-100/70',
      border: 'border-emerald-200/80 hover:border-emerald-500',
      svg: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="#18753C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a9 9 0 0 1 9 9c0 3.6-2.1 6.7-5.2 8.1L12 22l-3.8-2.9C5.1 17.7 3 14.6 3 11a9 9 0 0 1 9-9z"/>
          <path d="M12 2v6" stroke="#10B981"/>
          <path d="M9 5c1 1.5 2 2 3 2s2-.5 3-2" stroke="#10B981"/>
        </svg>
      )
    },
    {
      id: 'dairy',
      match: ['dairy', 'milk', 'egg', 'paneer', 'butter', 'dahi'],
      title: 'Dairy & Breakfast',
      tag: 'Morning Fresh',
      tagBg: 'bg-sky-100 text-sky-800',
      gradient: 'from-sky-50 via-blue-50 to-indigo-100/70',
      border: 'border-sky-200/80 hover:border-sky-500',
      svg: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2h8v4H8z"/>
          <path d="M6 6h12l1 15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1L6 6z"/>
          <path d="M9 11a3 3 0 0 0 6 0" stroke="#38BDF8"/>
        </svg>
      )
    },
    {
      id: 'staples',
      match: ['staple', 'atta', 'rice', 'dal', 'grain', 'flour', 'cereal'],
      title: 'Atta, Rice & Dals',
      tag: 'Kirana Rates',
      tagBg: 'bg-amber-100 text-amber-800',
      gradient: 'from-amber-50 via-yellow-50 to-orange-100/70',
      border: 'border-amber-200/80 hover:border-amber-500',
      svg: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 22l10-10 10 10H2z"/>
          <path d="M12 2a5 5 0 0 1 5 5v5H7V7a5 5 0 0 1 5-5z" stroke="#F59E0B"/>
          <path d="M12 7v5" stroke="#F59E0B"/>
        </svg>
      )
    },
    {
      id: 'oils',
      match: ['oil', 'ghee', 'masala', 'spice', 'cooking'],
      title: 'Oil & Spices',
      tag: 'Pure & Direct',
      tagBg: 'bg-orange-100 text-orange-800',
      gradient: 'from-orange-50 via-amber-50 to-yellow-100/70',
      border: 'border-orange-200/80 hover:border-orange-500',
      svg: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/>
          <circle cx="12" cy="9" r="2.5" fill="#FB923C" stroke="none"/>
        </svg>
      )
    },
    {
      id: 'snacks',
      match: ['snack', 'biscuit', 'chips', 'munch', 'namkeen', 'balaji', 'kurkure'],
      title: 'Snacks & Munchies',
      tag: 'Top Rated',
      tagBg: 'bg-rose-100 text-rose-800',
      gradient: 'from-rose-50 via-pink-50 to-orange-100/70',
      border: 'border-rose-200/80 hover:border-rose-500',
      svg: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="3" width="16" height="18" rx="3"/>
          <path d="M8 8h8M8 12h8M8 16h5" stroke="#FB7185"/>
        </svg>
      )
    },
    {
      id: 'bakery',
      match: ['bakery', 'bread', 'cake', 'toast', 'bun', 'cookie'],
      title: 'Bakery & Breads',
      tag: 'Daily Bake',
      tagBg: 'bg-amber-100 text-amber-900',
      gradient: 'from-amber-50/90 via-stone-50 to-amber-100/70',
      border: 'border-amber-200/80 hover:border-amber-500',
      svg: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="12" rx="9" ry="6"/>
          <path d="M7 11c1-1 3-1 5 0s4 1 5 0" stroke="#FBBF24"/>
        </svg>
      )
    },
    {
      id: 'beverages',
      match: ['drink', 'beverage', 'juice', 'tea', 'coffee', 'cold', 'soda'],
      title: 'Drinks & Tea',
      tag: 'Express Delivery',
      tagBg: 'bg-teal-100 text-teal-800',
      gradient: 'from-teal-50 via-cyan-50 to-emerald-100/70',
      border: 'border-teal-200/80 hover:border-teal-500',
      svg: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 8h1a4 4 0 1 1 0 8h-1"/>
          <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/>
          <line x1="6" y1="2" x2="6" y2="4"/>
          <line x1="10" y1="2" x2="10" y2="4"/>
          <line x1="14" y1="2" x2="14" y2="4"/>
        </svg>
      )
    },
    {
      id: 'personal',
      match: ['care', 'clean', 'household', 'soap', 'shampoo', 'hygiene', 'detergent'],
      title: 'Household & Care',
      tag: 'Essentials',
      tagBg: 'bg-purple-100 text-purple-800',
      gradient: 'from-purple-50 via-indigo-50 to-pink-100/70',
      border: 'border-purple-200/80 hover:border-purple-500',
      svg: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      )
    }
  ];

  const catNameLower = (cat.name || '').toLowerCase();
  const theme = themes.find(t => t.match.some(m => catNameLower.includes(m))) || themes[index % themes.length];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-between p-3 sm:p-4 rounded-2xl bg-gradient-to-b ${theme.gradient} border ${theme.border} shadow-2xs hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-left cursor-pointer overflow-hidden`}
    >
      <div className="w-full flex items-center justify-between mb-1.5">
        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${theme.tagBg}`}>
          {theme.tag}
        </span>
        <i className="fa-solid fa-arrow-right text-[9px] text-gray-400 group-hover:text-[#18753C] group-hover:translate-x-0.5 transition-all"></i>
      </div>

      <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-white/95 shadow-2xs border border-white/60 flex items-center justify-center my-1 group-hover:scale-110 transition-transform duration-300 overflow-hidden">
        {!imgFailed && cat.image ? (
          <img
            src={cat.image}
            alt={cat.name}
            onError={() => setImgFailed(true)}
            className="w-full h-full object-contain p-2"
          />
        ) : (
          theme.svg
        )}
      </div>

      <div className="w-full text-center mt-2">
        <div className="font-extrabold text-xs sm:text-[13px] text-gray-900 group-hover:text-[#18753C] truncate leading-tight transition-colors">
          {cat.name}
        </div>
      </div>
    </button>
  );
}

/* =========================================================================
   2. HOME PRODUCT CARD (Local MinIO Fallback - Zero Random Stock Photos)
   ========================================================================= */
function HomeProductCard({ product, onAddToCart, onToggleWishlist, wishlist, badge = null, onNavigate }) {
  const [imgFailed, setImgFailed] = useState(!product.image);
  const isOutOfStock = product.stock_qty !== undefined && product.stock_qty <= 0;
  const isLowStock = product.stock_qty !== undefined && product.stock_qty > 0 && product.stock_qty <= 8;
  const discount = product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : (product.discount || 0);
  const isWishlisted = Boolean(wishlist?.includes(product.id));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] hover:shadow-xl hover:border-[#18753C]/35 transition-all duration-200 flex flex-col justify-between overflow-hidden group">
      {/* Product Image Stage */}
      <div
        onClick={() => onNavigate(`product/${product.id}`)}
        className="relative aspect-square bg-[#F8FAFC] flex items-center justify-center p-3 cursor-pointer overflow-hidden"
      >
        {!imgFailed && product.image ? (
          <img
            src={product.image}
            alt={product.name}
            onError={() => setImgFailed(true)}
            className={`w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300 ${
              isOutOfStock ? 'opacity-40 grayscale' : ''
            }`}
          />
        ) : (
          /* Attractive ADAB Branded Placeholder (Zero random stock photos) */
          <div className="w-full h-full rounded-xl bg-gradient-to-br from-emerald-50/90 via-slate-50 to-green-50/70 border border-emerald-100/60 flex flex-col items-center justify-center p-3 relative group-hover:scale-102 transition-transform">
            <div className="absolute top-1.5 left-2 text-[8px] font-black text-emerald-700/60 uppercase tracking-widest">
              ADAB
            </div>
            <div className="w-11 h-11 rounded-2xl bg-white shadow-2xs border border-emerald-100/80 flex items-center justify-center text-[#18753C] mb-1">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
            <span className="text-[10px] font-extrabold text-emerald-950 truncate max-w-[100px] text-center">
              {product.name}
            </span>
            <span className="text-[8px] font-bold text-emerald-700 bg-white/90 px-1.5 py-0.5 rounded-full mt-1 border border-emerald-100">
              Kirana Fresh
            </span>
          </div>
        )}

        {/* Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10 pointer-events-none">
          {discount > 0 && !isOutOfStock && (
            <span className="bg-[#F26E21] text-white text-[10px] font-black px-2 py-0.5 rounded shadow-xs tracking-wide">
              {discount}% OFF
            </span>
          )}
          {badge && !isOutOfStock && (
            <span className="bg-emerald-700 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wide">
              {badge}
            </span>
          )}
          {isOutOfStock && (
            <span className="bg-gray-900 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-xs tracking-wider">
              OUT OF STOCK
            </span>
          )}
        </div>

        {/* Wishlist Heart Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleWishlist) onToggleWishlist(product.id);
          }}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm border border-gray-100 shadow-xs flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-white transition-all cursor-pointer z-10 active:scale-90"
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <i className={`text-xs ${isWishlisted ? 'fa-solid fa-heart text-red-500' : 'fa-regular fa-heart'}`}></i>
        </button>
      </div>

      {/* Product Content */}
      <div className="p-3.5 flex flex-col justify-between flex-1">
        <div>
          {/* Seller Attribution */}
          <span
            onClick={(e) => {
              e.stopPropagation();
              if (product.store_id || product.storeId) {
                onNavigate(`stores?store_id=${product.store_id || product.storeId}`);
              }
            }}
            className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#18753C] bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 px-2 py-0.5 rounded-md mb-1.5 transition-colors cursor-pointer max-w-full"
          >
            <i className="fa-solid fa-store text-[9px] text-emerald-600 shrink-0"></i>
            <span className="truncate">{product.sellerName || 'Verified Shop'}</span>
          </span>

          {/* Title */}
          <h4
            onClick={() => onNavigate(`product/${product.id}`)}
            className="font-bold text-xs sm:text-[13px] leading-snug line-clamp-2 min-h-[2.3rem] text-gray-900 hover:text-[#18753C] cursor-pointer transition-colors capitalize"
          >
            {product.name}
          </h4>

          {/* Rating & Stock */}
          <div className="flex items-center justify-between gap-1.5 mt-1.5">
            <div className="flex items-center gap-1 text-[11px] font-bold text-gray-700 bg-amber-50/80 border border-amber-200/60 px-1.5 py-0.5 rounded-md">
              <i className="fa-solid fa-star text-amber-500 text-[9px]"></i>
              <span>{product.rating ? parseFloat(product.rating).toFixed(1) : '4.5'}</span>
              <span className="text-gray-400 font-normal">({product.reviews || 0})</span>
            </div>
            {isLowStock && (
              <span className="text-[9px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                Only {product.stock_qty} left
              </span>
            )}
          </div>
        </div>

        {/* Pricing and Action */}
        <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-sm sm:text-base text-gray-900">₹{product.price}</span>
              {product.mrp > product.price && (
                <span className="text-[11px] text-gray-400 line-through">₹{product.mrp}</span>
              )}
            </div>
            {product.mrp > product.price && (
              <div className="text-[9px] font-black text-[#18753C]">
                Save ₹{product.mrp - product.price}
              </div>
            )}
          </div>

          {/* Add Button */}
          {isOutOfStock ? (
            <button
              type="button"
              disabled
              className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-400 font-black text-xs cursor-not-allowed"
            >
              OUT
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onAddToCart) onAddToCart(product.id, product.name);
              }}
              className="px-3.5 py-1.5 rounded-xl border-2 border-[#18753C] bg-white text-[#18753C] hover:bg-[#18753C] hover:text-white active:scale-95 font-black text-xs transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              <i className="fa-solid fa-plus text-[9px]"></i>
              <span>ADD</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   3. HOME STORE CARD (Local MinIO Fallback - Zero Random Stock Photos)
   ========================================================================= */
function HomeStoreCard({ shop, onNavigate }) {
  const [imgFailed, setImgFailed] = useState(!shop.image);
  const initials = (shop.name || 'Store')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      onClick={() => onNavigate(`browse?storeId=${shop.id}&storeName=${encodeURIComponent(shop.name || '')}`)}
      className="group bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] hover:shadow-xl hover:border-emerald-300 transition-all duration-200 overflow-hidden cursor-pointer flex flex-col sm:flex-row"
    >
      {/* Store Image or Branded Monogram Fallback */}
      <div className="sm:w-40 h-36 sm:h-auto bg-gradient-to-br from-emerald-800 via-[#18753C] to-teal-900 relative shrink-0 overflow-hidden flex items-center justify-center">
        {!imgFailed && shop.image ? (
          <img
            src={shop.image}
            alt={shop.name}
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          /* Attractive Branded Storefront Fallback */
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-white relative">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10 w-13 h-13 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center font-black text-lg text-white shadow-md group-hover:scale-110 transition-transform">
              {initials}
            </div>
            <span className="relative z-10 text-[10px] font-extrabold text-emerald-100 uppercase tracking-wider mt-2">
              Verified Kirana
            </span>
          </div>
        )}

        {/* Rating Floating Badge */}
        <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[10px] font-black text-gray-900 flex items-center gap-1 shadow-xs z-10">
          <i className="fa-solid fa-star text-amber-400 text-[9px]"></i>
          <span>{shop.rating || '4.8'}</span>
        </div>
      </div>

      {/* Store Info */}
      <div className="p-4 flex flex-col justify-between flex-1">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[9px] font-black tracking-wider uppercase text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1 mb-1.5">
                <i className="fa-solid fa-circle-check text-emerald-600"></i> Verified Merchant
              </span>
              <h3 className="font-black text-sm text-gray-900 group-hover:text-[#18753C] transition-colors leading-tight">
                {shop.name}
              </h3>
            </div>
            <span className="text-[10px] font-bold text-gray-600 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-lg shrink-0">
              {shop.distance || '1.2 km'}
            </span>
          </div>

          <p className="text-[11px] text-gray-500 font-medium mt-1 line-clamp-1">
            {(Array.isArray(shop.tags) && shop.tags.length > 0
              ? shop.tags.join(' • ')
              : 'Fresh Groceries • Kirana Rates • Daily Essentials')} · {shop.area || 'Neighborhood'}
          </p>
        </div>

        <div className="mt-3.5 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600">
            <i className="fa-solid fa-truck-fast text-emerald-600"></i>
            <span>15–30 min delivery</span>
          </div>
          <span className="text-[11px] font-extrabold text-[#18753C] group-hover:translate-x-1 transition-transform flex items-center gap-1">
            <span>Shop Store</span>
            <i className="fa-solid fa-arrow-right text-[9px]"></i>
          </span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   MAIN HOMEPAGE COMPONENT
   ========================================================================= */
export default function HomePage({ onAddToCart, onNavigate, onToggleWishlist, wishlist, selectedAddress }) {
  const cityName = selectedAddress?.city || '';
  const [recommended, setRecommended] = useState(homeDataCache.recommended || []);
  const [categories, setCategories] = useState(homeDataCache.categories || []);
  const [stores, setStores] = useState(homeDataCache.stores || []);
  const [coupons, setCoupons] = useState(homeDataCache.coupons || []);
  const [promotions, setPromotions] = useState(homeDataCache.promotions || []);
  const [latestOrder, setLatestOrder] = useState(homeDataCache.latestOrder || null);
  const [copiedCoupon, setCopiedCoupon] = useState(null);

  const [storesLoading, setStoresLoading] = useState(!homeDataCache.stores);
  const [storesLoaded, setStoresLoaded] = useState(Boolean(homeDataCache.stores));
  const [storesError, setStoresError] = useState(null);

  const [categoriesLoading, setCategoriesLoading] = useState(!homeDataCache.categories);
  const [categoriesError, setCategoriesError] = useState(null);

  const [dealsLoading, setDealsLoading] = useState(!homeDataCache.promotions);
  const [dealsError, setDealsError] = useState(null);

  const [recommendedLoading, setRecommendedLoading] = useState(!homeDataCache.recommended);
  const [recommendedError, setRecommendedError] = useState(null);

  const [ordersLoaded, setOrdersLoaded] = useState(Boolean(homeDataCache.ordersChecked));

  const fetchedRefs = useRef({
    stores: Boolean(homeDataCache.stores),
    categories: Boolean(homeDataCache.categories),
    deals: Boolean(homeDataCache.promotions),
    recommended: Boolean(homeDataCache.recommended),
    orders: Boolean(homeDataCache.ordersChecked)
  });
  const inFlightRefs = useRef({
    stores: false,
    categories: false,
    deals: false,
    recommended: false,
    orders: false
  });
  const isMountedRef = useRef(true);
  const navigate = useNavigate();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadStores = useCallback(async (force = false) => {
    if (inFlightRefs.current.stores) return;
    if (!force && fetchedRefs.current.stores) return;
    fetchedRefs.current.stores = true;
    inFlightRefs.current.stores = true;
    if (force) {
      delete homeDataCache.stores;
      setStoresLoading(true);
      setStoresError(null);
    }
    try {
      const res = await api.get('/catalog/sellers');
      if (!isMountedRef.current) return;
      const list = res?.data?.data ?? res?.data;
      const sts = Array.isArray(list) ? list : [];
      homeDataCache.stores = sts;
      setStores(sts);
      setStoresLoaded(true);
      setStoresError(null);
    } catch (err) {
      fetchedRefs.current.stores = false;
      if (!isMountedRef.current) return;
      console.error('Error loading stores on Home:', err);
      setStoresError(err.response?.data?.message || 'Unable to load local stores.');
    } finally {
      inFlightRefs.current.stores = false;
      if (isMountedRef.current) setStoresLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async (force = false) => {
    if (inFlightRefs.current.categories) return;
    if (!force && fetchedRefs.current.categories) return;
    fetchedRefs.current.categories = true;
    inFlightRefs.current.categories = true;
    if (force) {
      delete homeDataCache.categories;
      setCategoriesLoading(true);
      setCategoriesError(null);
    }
    try {
      const res = await api.get('/catalog/categories');
      if (!isMountedRef.current) return;
      const list = res?.data?.data ?? res?.data;
      const cats = Array.isArray(list) ? list : [];
      homeDataCache.categories = cats;
      setCategories(cats);
      setCategoriesError(null);
    } catch (err) {
      fetchedRefs.current.categories = false;
      if (!isMountedRef.current) return;
      console.error('Error loading categories on Home:', err);
      setCategoriesError(err.response?.data?.message || 'Unable to load categories.');
    } finally {
      inFlightRefs.current.categories = false;
      if (isMountedRef.current) setCategoriesLoading(false);
    }
  }, []);

  const loadDeals = useCallback(async (force = false) => {
    if (inFlightRefs.current.deals) return;
    if (!force && fetchedRefs.current.deals) return;
    fetchedRefs.current.deals = true;
    inFlightRefs.current.deals = true;
    if (force) {
      delete homeDataCache.promotions;
      delete homeDataCache.coupons;
      setDealsLoading(true);
      setDealsError(null);
    }
    try {
      const [promoSettled, couponSettled] = await Promise.allSettled([
        api.get('/catalog/deals'),
        api.get('/cart/coupons')
      ]);
      if (promoSettled.status === 'rejected') {
        throw promoSettled.reason;
      }
      if (!isMountedRef.current) return;
      const pmsRaw = promoSettled.value?.data?.data ?? promoSettled.value?.data;
      const pms = Array.isArray(pmsRaw) ? pmsRaw : [];
      const cpsRaw =
        couponSettled.status === 'fulfilled'
          ? (couponSettled.value?.data?.data?.coupons ?? couponSettled.value?.data?.coupons)
          : [];
      const cps = Array.isArray(cpsRaw) ? cpsRaw : [];
      homeDataCache.promotions = pms;
      homeDataCache.coupons = cps;
      setPromotions(pms);
      setCoupons(cps);
      setDealsError(null);
    } catch (err) {
      fetchedRefs.current.deals = false;
      if (!isMountedRef.current) return;
      console.error('Error loading deals on Home:', err);
      setDealsError(err.response?.data?.message || 'Unable to load deals & offers.');
    } finally {
      inFlightRefs.current.deals = false;
      if (isMountedRef.current) setDealsLoading(false);
    }
  }, []);

  const loadRecommended = useCallback(async (force = false) => {
    if (inFlightRefs.current.recommended) return;
    if (!force && fetchedRefs.current.recommended) return;
    fetchedRefs.current.recommended = true;
    inFlightRefs.current.recommended = true;
    if (force) {
      delete homeDataCache.recommended;
      setRecommendedLoading(true);
      setRecommendedError(null);
    }
    try {
      const res = await api.get('/catalog/recommended');
      if (!isMountedRef.current) return;
      const list = res?.data?.data ?? res?.data;
      const rec = Array.isArray(list) ? list : [];
      homeDataCache.recommended = rec;
      setRecommended(rec);
      setRecommendedError(null);
    } catch (err) {
      fetchedRefs.current.recommended = false;
      if (!isMountedRef.current) return;
      console.error('Error loading recommended products on Home:', err);
      setRecommendedError(err.response?.data?.message || 'Unable to load trending products.');
    } finally {
      inFlightRefs.current.recommended = false;
      if (isMountedRef.current) setRecommendedLoading(false);
    }
  }, []);

  const loadActiveOrder = useCallback(async () => {
    if (inFlightRefs.current.orders || fetchedRefs.current.orders) return;
    const isAuthenticated = Boolean(
      typeof localStorage !== 'undefined' &&
      (localStorage.getItem('adab_user') || localStorage.getItem('adab_auth_token'))
    );
    if (!isAuthenticated) {
      fetchedRefs.current.orders = true;
      homeDataCache.ordersChecked = true;
      setOrdersLoaded(true);
      return;
    }
    fetchedRefs.current.orders = true;
    inFlightRefs.current.orders = true;
    try {
      const res = await api.get('/customers/me/orders');
      if (!isMountedRef.current) return;
      const orders = res?.data?.data ?? res?.data ?? [];
      const activeOrder = Array.isArray(orders)
        ? (orders.find(o =>
            ['PLACED', 'CONFIRMED', 'ACCEPTED', 'PREPARING', 'PACKED', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'IN_TRANSIT'].includes(o.order_status?.toUpperCase())
          ) || null)
        : null;
      homeDataCache.latestOrder = activeOrder;
      homeDataCache.ordersChecked = true;
      setLatestOrder(activeOrder);
      setOrdersLoaded(true);
    } catch {
      if (isMountedRef.current) {
        homeDataCache.ordersChecked = true;
        setOrdersLoaded(true);
      }
    } finally {
      inFlightRefs.current.orders = false;
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStores(false);
    loadCategories(false);
    loadDeals(false);
    loadRecommended(false);
    loadActiveOrder();
  }, [loadStores, loadCategories, loadDeals, loadRecommended, loadActiveOrder]);

  const go = (path, extra) => {
    if (onNavigate) {
      onNavigate(path, extra);
    } else {
      navigate('/' + path + (extra?.storeId ? `?store_id=${extra.storeId}` : ''));
    }
  };

  const copyCouponCode = (code) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCoupon(code);
      setTimeout(() => setCopiedCoupon(null), 2500);
    }
  };

  return (
    <div className="pt-2 pb-6 space-y-7">
      {/* ========================================================
          1. 4-PILL E-COMMERCE TRUST & VALUE STRIP (Amazon/Blinkit)
      ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-xs flex items-center gap-3.5 hover:border-emerald-200 transition">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#18753C] flex items-center justify-center text-base shrink-0">
            <i className="fa-solid fa-truck-fast"></i>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-gray-900">14–45 Min Delivery</div>
            <div className="text-[10px] text-gray-500 font-medium truncate">{cityName ? `Express to your door in ${cityName}` : 'Express to your door in minutes'}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-xs flex items-center gap-3.5 hover:border-emerald-200 transition">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#F26E21] flex items-center justify-center text-base shrink-0">
            <i className="fa-solid fa-tag"></i>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-gray-900">Kirana Store Rates</div>
            <div className="text-[10px] text-gray-500 font-medium truncate">Zero price markups guarantee</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-xs flex items-center gap-3.5 hover:border-emerald-200 transition">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-base shrink-0">
            <i className="fa-solid fa-shield-check"></i>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-gray-900">100% Quality Assured</div>
            <div className="text-[10px] text-gray-500 font-medium truncate">Fresh daily batch guarantee</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-xs flex items-center gap-3.5 hover:border-emerald-200 transition">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-base shrink-0">
            <i className="fa-solid fa-coins"></i>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-gray-900">Reward Coins</div>
            <div className="text-[10px] text-gray-500 font-medium truncate">Save on every local order</div>
          </div>
        </div>
      </div>

      {/* ========================================================
          2. LIVE NEIGHBORHOOD STORIES ("Live in your zone")
          Preserved for Store & Filter Parity Tests
      ======================================================== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">Live in your zone</span>
            <span className="text-xs text-gray-400 font-medium hidden sm:inline">· Verified shops ready to dispatch</span>
          </div>
          <span className="tag-live">
            <i className="fa-solid fa-circle mr-1 text-[7px]"></i> OPEN NOW
          </span>
        </div>
        {storesLoading && stores.length === 0 ? (
          <div className="flex gap-3 overflow-x-auto hide-scroll pb-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
                <div className="w-14 h-14 rounded-full bg-gray-200 animate-pulse"></div>
                <div className="w-10 h-2.5 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : storesError && stores.length === 0 ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-red-700">
            <span className="flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" /> {storesError}
            </span>
            <button
              type="button"
              disabled={storesLoading}
              onClick={() => loadStores(true)}
              className="px-3 py-1.5 bg-white border border-red-200 rounded-xl font-bold text-red-800 hover:bg-red-100 transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <RefreshCw className={`w-3 h-3 ${storesLoading ? 'animate-spin' : ''}`} /> Retry
            </button>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto hide-scroll pb-1">
            {(stores.length > 0 ? stores : DEFAULT_STORES).map((shop, i) => {
              const colors = ['bg-emerald-600', 'bg-blue-600', 'bg-orange-500', 'bg-cyan-600', 'bg-purple-600'];
              const initial = (shop.name || 'Store').substring(0, 2).toUpperCase();
              return (
                <button
                  key={shop.id || i}
                  onClick={() => go('stores', { storeId: shop.id, store: shop, storeName: shop.name })}
                  className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
                >
                  <div className="story-ring">
                    <div className={`w-14 h-14 rounded-full ${colors[i % 5]} text-white font-extrabold flex items-center justify-center text-sm shadow-md group-hover:scale-105 transition-transform`}>
                      {initial}
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-gray-800 truncate max-w-[68px]">
                    {(shop.name || '').split(' ')[0]}
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => go('stores', { storeId: null, store: null })}
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
            >
              <div className="w-14 h-14 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 group-hover:border-emerald-500 text-gray-500 group-hover:text-emerald-700 font-bold flex items-center justify-center text-xs transition-colors">
                <i className="fa-solid fa-plus text-base"></i>
              </div>
              <span className="text-[11px] font-bold text-gray-600 group-hover:text-emerald-700 transition-colors">
                {stores.length > 0 ? `${stores.length} Shops` : '7 Shops'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================
          3. ACTIVE ORDER BANNER / STORE HIGHLIGHT
      ======================================================== */}
      {ordersLoaded && latestOrder && ['PLACED', 'CONFIRMED', 'ACCEPTED', 'PREPARING', 'PACKED', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'IN_TRANSIT'].includes(latestOrder.order_status?.toUpperCase()) ? (
        <div
          onClick={() => go('track')}
          className="cursor-pointer text-white rounded-2xl p-4 flex items-center gap-3.5 shadow-lg shadow-emerald-700/20 hover:scale-[1.01] transition-all"
          style={{ background: 'linear-gradient(135deg, #064E3B 0%, #047857 50%, #059669 100%)', color: '#ffffff' }}
        >
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-motorcycle animate-bounce"></i>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full" style={{ background: '#10B981', color: '#ffffff', border: '1px solid #34D399' }}>
                {latestOrder.order_status === 'PLACED' ? 'ON THE WAY' : latestOrder.order_status}
              </span>
              <span className="text-xs text-emerald-100">
                Order #{latestOrder.order_number || (latestOrder.id && latestOrder.id.slice(0, 8))}
              </span>
            </div>
            <div className="font-extrabold text-sm mt-0.5 truncate text-white">
              Arriving in ~{latestOrder.eta_minutes || 18} min · {latestOrder.seller_orders?.[0]?.store_name || stores[0]?.name || 'Shabbir Grocery Shop'}
            </div>
          </div>
          <span className="px-3.5 py-1.5 rounded-xl bg-white text-emerald-800 font-extrabold text-xs shrink-0 shadow-sm flex items-center gap-1">
            Track <i className="fa-solid fa-arrow-right text-[10px]"></i>
          </span>
        </div>
      ) : storesLoaded && !storesError && stores.length > 0 ? (
        <div
          onClick={() => go('stores', { storeId: stores[0].id, store: stores[0] })}
          className="cursor-pointer text-white rounded-2xl p-4 flex items-center gap-3.5 shadow-lg shadow-emerald-700/20 hover:scale-[1.01] transition-all"
          style={{ background: 'linear-gradient(135deg, #064E3B 0%, #047857 50%, #059669 100%)', color: '#ffffff' }}
        >
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-shop"></i>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm"
                style={{ background: '#10B981', color: '#ffffff', border: '1px solid #34D399' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                OPEN NOW
              </span>
              <span className="text-xs text-emerald-100 font-semibold">{stores[0].area}</span>
            </div>
            <div className="font-extrabold text-sm mt-0.5 truncate text-white">
              Order fresh daily essentials directly from {stores[0].name}
            </div>
          </div>
          <span className="px-3.5 py-1.5 rounded-xl bg-white text-emerald-800 font-extrabold text-xs shrink-0 shadow-sm flex items-center gap-1">
            Shop Now <i className="fa-solid fa-arrow-right text-[10px]"></i>
          </span>
        </div>
      ) : null}

      {/* ========================================================
          4. PROMOTIONAL CAMPAIGNS & LIVE COUPONS (Flipkart / Blinkit)
      ======================================================== */}
      {dealsLoading && coupons.length === 0 && promotions.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : dealsError && coupons.length === 0 && promotions.length === 0 ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-red-700">
          <span className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" /> {dealsError}
          </span>
          <button
            type="button"
            disabled={dealsLoading}
            onClick={() => loadDeals(true)}
            className="px-3 py-1.5 bg-white border border-red-200 rounded-xl font-bold text-red-800 hover:bg-red-100 transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <RefreshCw className={`w-3 h-3 ${dealsLoading ? 'animate-spin' : ''}`} /> Retry
          </button>
        </div>
      ) : (coupons.length > 0 || promotions.length > 0) ? (
        <div>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              <h2 className="section-title">Deals & Offers</h2>
              <span className="text-xs text-gray-500 font-medium hidden sm:inline">· Verified instant savings</span>
            </div>
            <button
              type="button"
              onClick={() => go('offers')}
              className="text-brand-green text-xs font-extrabold hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>View all offers</span>
              <span>→</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {coupons.length > 0 ? (
              coupons.slice(0, 3).map((cp, idx) => {
                const bannerGradients = [
                  'from-amber-500 via-orange-500 to-rose-600',
                  'from-indigo-600 via-purple-600 to-pink-600',
                  'from-emerald-700 via-teal-600 to-emerald-800'
                ];
                const grad = bannerGradients[idx % bannerGradients.length];
                const discountText = cp.discount_type === 'PERCENTAGE'
                  ? `${parseInt(cp.discount_value)}% OFF`
                  : `Flat ₹${parseInt(cp.discount_value)} OFF`;

                return (
                  <div
                    key={cp.code || idx}
                    className={`rounded-2xl bg-gradient-to-br ${grad} p-4 sm:p-5 text-white shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black bg-black/25 px-2.5 py-0.5 rounded-full tracking-wider">
                        LIVE COUPON
                      </span>
                      <span className="text-xs font-bold text-amber-100">
                        {cp.min_order_value > 0 ? `Min ₹${parseInt(cp.min_order_value)}` : 'No minimum'}
                      </span>
                    </div>

                    <div className="my-2">
                      <span className="font-black text-2xl leading-tight block tracking-tight">
                        {discountText}
                      </span>
                      <span className="text-xs text-white/90 mt-0.5 block font-medium">
                        Applied instantly on verified kirana basket
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/20">
                      <code className="bg-white/25 px-2 py-0.5 rounded font-black text-xs tracking-wider text-white">
                        {cp.code}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyCouponCode(cp.code)}
                        className="px-3 py-1 rounded-lg bg-white text-gray-900 font-extrabold text-[11px] hover:bg-gray-100 transition shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        <i className={`text-[10px] ${copiedCoupon === cp.code ? 'fa-solid fa-check text-emerald-600' : 'fa-regular fa-copy'}`}></i>
                        <span>{copiedCoupon === cp.code ? 'Copied!' : 'Copy Code'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : promotions.length > 0 ? (
              promotions.slice(0, 3).map((promo, idx) => (
                <div
                  key={promo.id || idx}
                  onClick={() => go('offers')}
                  className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 p-4 sm:p-5 text-white shadow-sm flex flex-col justify-between min-h-[140px] cursor-pointer hover:scale-[1.01] transition-transform"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black bg-black/25 px-2.5 py-0.5 rounded-full">
                      {promo.promo_type || 'PROMO'}
                    </span>
                    <span className="text-xs font-bold text-amber-100">
                      {promo.store_name || 'Active Sale'}
                    </span>
                  </div>
                  <div className="my-2">
                    <span className="font-black text-xl leading-tight block">
                      {promo.title}
                    </span>
                    <span className="text-xs text-orange-100 mt-0.5 block">
                      Exclusive store discounts verified on local kirana inventory
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-white hover:underline">
                      Shop Offer →
                    </span>
                  </div>
                </div>
              ))
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ========================================================
          5. SHOP BY CATEGORY (Visual Merchandising - 8 Cards)
      ======================================================== */}
      <div>
        <div className="flex justify-between items-end mb-3">
          <div>
            <h2 className="section-title">Shop by Category</h2>
            <p className="text-xs text-gray-500 mt-0.5">Explore fresh staples, dairy, produce & snacks</p>
          </div>
          <button
            onClick={() => go('browse')}
            className="text-brand-green text-xs font-extrabold hover:underline cursor-pointer"
          >
            View All Categories →
          </button>
        </div>

        {categoriesLoading && categories.length === 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-3.5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : categoriesError && categories.length === 0 ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-red-700">
            <span className="flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" /> {categoriesError}
            </span>
            <button
              type="button"
              disabled={categoriesLoading}
              onClick={() => loadCategories(true)}
              className="px-3 py-1.5 bg-white border border-red-200 rounded-xl font-bold text-red-800 hover:bg-red-100 transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <RefreshCw className={`w-3 h-3 ${categoriesLoading ? 'animate-spin' : ''}`} /> Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-3.5">
            {(categories.length > 0 ? categories.slice(0, 8) : DEFAULT_CATEGORIES).map((cat, i) => (
              <VisualCategoryCard
                key={cat.id || i}
                cat={cat}
                index={i}
                onClick={() => go(`browse?category=${encodeURIComponent(cat.slug || cat.name)}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ========================================================
          6. TOP VERIFIED STORES (Popular Local Kiranas)
      ======================================================== */}
      <div>
        <div className="flex justify-between items-end mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h2 className="section-title">Top Verified Stores</h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Direct from trusted neighbourhood kirana merchants</p>
          </div>
          <button
            type="button"
            onClick={() => go('stores', { storeId: null, store: null })}
            className="text-brand-green text-xs font-extrabold hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>All {stores.length || 7} shops</span>
            <span>→</span>
          </button>
        </div>

        {storesLoading && stores.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : storesError && stores.length === 0 ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-red-700">
            <span className="flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" /> {storesError}
            </span>
            <button
              type="button"
              disabled={storesLoading}
              onClick={() => loadStores(true)}
              className="px-3 py-1.5 bg-white border border-red-200 rounded-xl font-bold text-red-800 hover:bg-red-100 transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <RefreshCw className={`w-3 h-3 ${storesLoading ? 'animate-spin' : ''}`} /> Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(stores.length > 0 ? stores.slice(0, 3) : DEFAULT_STORES).map((shop) => (
              <HomeStoreCard
                key={shop.id}
                shop={shop}
                onNavigate={go}
              />
            ))}
          </div>
        )}
      </div>

      {/* ========================================================
          7. TRENDING PRODUCTS IN YOUR AREA
      ======================================================== */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-amber-500 text-sm">🔥</span>
              <h2 className="section-title">Trending in Your Area</h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Top-selling products delivered in minutes</p>
          </div>
          <button
            type="button"
            onClick={() => go('browse')}
            className="text-brand-green text-xs font-extrabold hover:underline cursor-pointer"
          >
            Browse all products →
          </button>
        </div>

        {recommendedLoading && recommended.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 rounded-2xl aspect-[3/4]"></div>
            ))}
          </div>
        ) : recommendedError && recommended.length === 0 ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-red-700">
            <span className="flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" /> {recommendedError}
            </span>
            <button
              type="button"
              disabled={recommendedLoading}
              onClick={() => loadRecommended(true)}
              className="px-3 py-1.5 bg-white border border-red-200 rounded-xl font-bold text-red-800 hover:bg-red-100 transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <RefreshCw className={`w-3 h-3 ${recommendedLoading ? 'animate-spin' : ''}`} /> Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
            {(recommended.length > 0 ? recommended.slice(0, 6) : DEFAULT_TRENDING).map((product) => (
              <HomeProductCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
                onToggleWishlist={onToggleWishlist}
                wishlist={wishlist}
                badge="Trending"
                onNavigate={go}
              />
            ))}
          </div>
        )}
      </div>

      {/* ========================================================
          8. BESTSELLERS & DAILY ESSENTIALS (Amazon / Flipkart Pattern)
      ======================================================== */}
      {(recommended.length > 6 || recommended.length === 0) && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-amber-500 text-sm">⭐</span>
                <h2 className="section-title">Bestsellers & Daily Essentials</h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Customer favorites from verified neighbourhood merchants</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
            {(recommended.length > 6 ? recommended.slice(6, 12) : DEFAULT_TRENDING).map((product) => (
              <HomeProductCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
                onToggleWishlist={onToggleWishlist}
                wishlist={wishlist}
                badge="Bestseller"
                onNavigate={go}
              />
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          9. CATALOG DISCOVERY BANNER (Blinkit / Instamart Style)
      ======================================================== */}
      <div
        onClick={() => go('browse')}
        className="cursor-pointer bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-xs hover:border-emerald-400 hover:shadow-md transition-all"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center text-xl shadow-xs shrink-0">
            <i className="fa-solid fa-boxes-stacked"></i>
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-gray-900 leading-tight">
              Explore Full Local Product Catalog
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              Filter by category, price, discount, or specific neighbourhood store{cityName ? ` in ${cityName}` : ''}
            </p>
          </div>
        </div>
        <span className="px-4 py-2.5 rounded-xl bg-emerald-700 text-white font-extrabold text-xs shrink-0 shadow-xs flex items-center gap-1.5 hover:bg-emerald-800 transition">
          <span>Browse Now</span>
          <i className="fa-solid fa-arrow-right text-[10px]"></i>
        </span>
      </div>

      {/* ========================================================
          10. MORE FROM LOCAL KIRANAS (Personalized Recommendations)
      ======================================================== */}
      {recommended.length > 12 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-600 text-sm">🌿</span>
                <h2 className="section-title">More From Local Kiranas</h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Authentic regional staples and fresh batches direct from sellers</p>
            </div>
            <button
              type="button"
              onClick={() => go('browse')}
              className="text-brand-green text-xs font-extrabold hover:underline cursor-pointer"
            >
              See all staples →
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
            {recommended.slice(12, 24).map((product) => (
              <HomeProductCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
                onToggleWishlist={onToggleWishlist}
                wishlist={wishlist}
                badge="Kirana Pick"
                onNavigate={go}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
