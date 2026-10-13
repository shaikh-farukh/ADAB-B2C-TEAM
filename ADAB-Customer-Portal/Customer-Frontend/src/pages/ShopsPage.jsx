import React, { useEffect, useState } from 'react';
import { api } from '../api/api';
import { Store, Star, MapPin, Truck, ChevronRight, Search, ShieldCheck, ShoppingBag, ArrowLeft } from 'lucide-react';

export default function ShopsPage({ onNavigate }) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      try {
        const res = await api.get('/catalog/stores');
        setStores(res.data?.data || res.data || []);
      } catch (err) {
        console.error('Error fetching stores:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStores();
  }, []);

  const storeImages = [
    'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&w=600&q=80'
  ];

  const filteredStores = stores.filter(shop => {
    const matchesSearch = !searchFilter || 
      (shop.name || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (shop.area || '').toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || 
      (Array.isArray(shop.tags) && shop.tags.some(t => t.toLowerCase().includes(selectedCategory.toLowerCase())));
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="animate-fade-in pb-16">
      {/* Top Header Banner - Clean, Production-Level Aesthetic */}
      <div className="mb-6 bg-gradient-to-br from-emerald-50/80 via-white to-slate-50 border border-emerald-100/80 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xs">
        {/* Subtle decorative background accents */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-emerald-500/5 -skew-x-12 pointer-events-none"></div>
        <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <span className="bg-emerald-100/80 text-emerald-800 border border-emerald-200/90 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> Verified Merchant Directory
            </span>
            <span className="bg-amber-100 text-amber-900 border border-amber-300/80 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
              Hyperlocal Delivery
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">
            Local Neighborhood Stores
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1.5 font-medium leading-relaxed">
            Discover verified merchant partners delivering authentic groceries & essentials directly to your door in 15–30 minutes. Click any store to browse their live catalog.
          </p>

          {/* Search bar inside header */}
          <div className="mt-5 relative max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search shops by name, specialty or locality..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-200/90 rounded-2xl pl-10 pr-9 py-2.5 text-xs font-semibold placeholder-gray-400 shadow-xs outline-none focus:border-[#18753C] focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
            {searchFilter && (
              <button 
                onClick={() => setSearchFilter('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Control Bar: Stores count & Category Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-[#18753C]" />
          <h2 className="font-black text-gray-900 text-base">
            All Stores ({filteredStores.length})
          </h2>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto hide-scroll pb-1">
          {['ALL', 'Grocery', 'Supermarket', 'Fresh'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer shrink-0 ${
                selectedCategory === cat 
                  ? 'bg-[#18753C] text-white shadow-xs' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat === 'ALL' ? 'All Merchants' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Stores Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-2xl border border-gray-100 p-4 shadow-sm h-64">
              <div className="bg-gray-200 rounded-xl h-36 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filteredStores.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStores.map((shop, i) => (
            <div 
              key={shop.id}
              onClick={() => onNavigate(`browse?storeId=${shop.id}&storeName=${encodeURIComponent(shop.name)}`)}
              className="group bg-white rounded-2xl border border-gray-200/80 hover:border-emerald-500/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col justify-between shadow-2xs"
            >
              <div>
                {/* Store Cover Image & Badges */}
                <div className="relative h-40 bg-gray-100 overflow-hidden">
                  <img 
                    src={shop.image || storeImages[i % storeImages.length]} 
                    alt={shop.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                  
                  {/* Rating Badge */}
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-black text-gray-900 flex items-center gap-1 shadow-xs">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{shop.rating ? Number(shop.rating).toFixed(1) : '4.8'}</span>
                  </div>

                  {/* Delivery Distance */}
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <Truck className="w-3 h-3 text-emerald-400" />
                    <span>{shop.distance || '1.2 km'}</span>
                  </div>

                  {/* Store Name overlay at image bottom */}
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-600/90 backdrop-blur-md px-2 py-0.5 rounded text-white inline-flex items-center gap-1 mb-1 shadow-xs">
                      <ShieldCheck className="w-3 h-3 text-white" /> Verified Store
                    </span>
                    <h3 className="text-base font-black text-white leading-tight drop-shadow-sm truncate">
                      {shop.name}
                    </h3>
                  </div>
                </div>

                {/* Store Details Body */}
                <div className="p-4 space-y-2.5">
                  <div className="flex items-start gap-1.5 text-xs text-gray-500">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{shop.area || 'Local Market Area, Surat'}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {Array.isArray(shop.tags) && shop.tags.length > 0 ? (
                      shop.tags.map((tag, idx) => (
                        <span key={idx} className="text-[10px] font-bold bg-gray-50 border border-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] font-bold bg-gray-50 border border-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">
                        Grocery & Essentials
                      </span>
                    )}
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100/80 px-2 py-0.5 rounded-lg">
                      15-30m Express
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button Footer */}
              <div className="p-4 pt-0">
                <div className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-[#18753C] text-[#18753C] hover:text-white rounded-xl font-extrabold text-xs transition-colors flex items-center justify-between shadow-2xs group-hover:bg-[#18753C] group-hover:text-white">
                  <span>Browse Store Products</span>
                  <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
          <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-black text-base text-gray-900">No stores found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            No merchants match "{searchFilter}". Try clearing your search query to see all local partner shops.
          </p>
          <button 
            onClick={() => setSearchFilter('')}
            className="mt-4 px-4 py-2 bg-[#18753C] text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition"
          >
            Show All Stores
          </button>
        </div>
      )}
    </div>
  );
}
