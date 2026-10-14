import { useState, useEffect } from 'react';
import { api } from '../api/api';
import ProductCard from '../components/ProductCard';
import { Search, ArrowLeft, Flame, ThumbsUp, ThumbsDown, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

let searchRecommendedCache = null;

export default function SearchPage({ onAddToCart, onToggleWishlist, wishlist }) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [popularSearches, setPopularSearches] = useState([]);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    brand: '',
    minPrice: '',
    maxPrice: '',
    minRating: '',
    inStockOnly: false
  });
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    // 1. Fetch recommended
    const fetchRecommended = async () => {
      if (searchRecommendedCache) {
        setRecommended(searchRecommendedCache);
        return;
      }
      try {
        const res = await api.get('/catalog/recommended');
        if (res.data?.success) {
          searchRecommendedCache = res.data.data;
          setRecommended(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch recommended:", err);
      }
    };
    fetchRecommended();

    // 2. Fetch popular/trending searches
    api.get('/catalog/search/popular')
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          setPopularSearches(res.data.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleSearchFeedback = async (helpful) => {
    try {
      await api.post('/catalog/search/feedback', {
        query: query.trim() || 'popular_browse',
        helpful
      });
      setFeedbackSent(true);
      setTimeout(() => setFeedbackSent(false), 3500);
    } catch (e) {
      console.warn('Feedback submission failed', e);
    }
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.trim().length > 1) {
        try {
          const res = await api.get(`/catalog/search/suggestions?q=${encodeURIComponent(query)}`);
          setSuggestions(res.data?.data || []);
          setShowSuggestions(true);
        } catch (err) {
          console.error("Error fetching suggestions", err);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };
    const t = setTimeout(fetchSuggestions, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (query.trim()) queryParams.append('q', query);
        if (filters.brand) queryParams.append('brand', filters.brand);
        if (filters.minPrice) queryParams.append('minPrice', filters.minPrice);
        if (filters.maxPrice) queryParams.append('maxPrice', filters.maxPrice);
        if (filters.minRating) queryParams.append('minRating', filters.minRating);
        if (filters.inStockOnly) queryParams.append('inStockOnly', 'true');

        const res = await api.get(`/catalog/search?${queryParams.toString()}`);
        setProducts(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchProducts();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query, filters]);

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 bg-[#F6F9F6] pt-2 pb-4">
        <div className="relative">
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
            <button onClick={() => navigate('/home')} className="text-gray-500 hover:text-black cursor-pointer">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Search className="w-5 h-5 text-brand-green" />
            <input 
              type="text" 
              autoFocus
              className="w-full bg-transparent border-none focus:outline-none text-sm font-medium text-gray-900 placeholder-gray-400"
              placeholder="Search shops, products, brands..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              className={`text-sm font-medium px-3 py-1 rounded-full cursor-pointer ${showFilters ? 'bg-brand-green text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Filters
            </button>
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden text-gray-800">
              {suggestions.map((suggestion, idx) => (
                <div 
                  key={idx}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setQuery(suggestion);
                    setShowSuggestions(false);
                  }}
                  className="px-4 py-3 hover:bg-green-50 cursor-pointer text-sm font-semibold text-gray-700 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                >
                  <Search className="w-4 h-4 text-gray-400" />
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 mt-2 shadow-sm flex flex-col gap-3">
            <h3 className="font-semibold text-gray-800">Filters</h3>
            <div className="grid grid-cols-2 gap-3">
              <input 
                type="text" 
                placeholder="Brand" 
                value={filters.brand}
                onChange={e => setFilters({...filters, brand: e.target.value})}
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-green"
              />
              <select 
                value={filters.minRating}
                onChange={e => setFilters({...filters, minRating: e.target.value})}
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-green"
              >
                <option value="">Any Rating</option>
                <option value="4">4+ Stars</option>
                <option value="3">3+ Stars</option>
                <option value="2">2+ Stars</option>
              </select>
              <input 
                type="number" 
                placeholder="Min Price" 
                value={filters.minPrice}
                onChange={e => setFilters({...filters, minPrice: e.target.value})}
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-green"
              />
              <input 
                type="number" 
                placeholder="Max Price" 
                value={filters.maxPrice}
                onChange={e => setFilters({...filters, maxPrice: e.target.value})}
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-green"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 mt-1 cursor-pointer">
              <input 
                type="checkbox" 
                checked={filters.inStockOnly}
                onChange={e => setFilters({...filters, inStockOnly: e.target.checked})}
                className="accent-brand-green"
              />
              In Stock Only
            </label>
          </div>
        )}

        {/* Popular & Trending Searches Pills */}
        {!query.trim() && popularSearches.length > 0 && (
          <div className="mt-3 flex items-center gap-2 overflow-x-auto hide-scroll py-1">
            <span className="text-[11px] font-extrabold text-amber-600 flex items-center gap-1 shrink-0 uppercase tracking-wide">
              <Flame className="w-3.5 h-3.5 fill-current" />
              Trending:
            </span>
            {popularSearches.map((term, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setQuery(term)}
                className="px-3 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 text-gray-700 text-xs font-bold rounded-full border border-gray-200 transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
              >
                {term}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-2xl aspect-[3/4]"></div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
            {products.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onAddToCart={onAddToCart} 
                onToggleWishlist={onToggleWishlist}
                wishlist={wishlist}
              />
            ))}
          </div>

          {/* Search Feedback Widget */}
          <div className="mt-8 py-3.5 px-5 bg-white border border-gray-100 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
            <div className="text-xs text-gray-600 font-semibold text-center sm:text-left">
              Did you find what you were looking for?
            </div>
            {feedbackSent ? (
              <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Thank you for your feedback!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSearchFeedback(true)}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 text-xs font-bold text-gray-700 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Yes</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSearchFeedback(false)}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-800 text-xs font-bold text-gray-700 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span>No</span>
                </button>
              </div>
            )}
          </div>
        </>
      ) : query.trim() ? (
        <div className="text-center py-20 text-gray-500 bg-white border border-gray-100 rounded-3xl p-8">
          <p className="font-black text-lg text-gray-900 mb-1">No results found for "{query}"</p>
          <p className="text-xs text-gray-500 mb-4">Try checking for typos or searching a broader keyword like "snacks", "milk", or "oil".</p>
          
          {/* Search Feedback on 0 results */}
          <div className="inline-flex items-center gap-3 pt-2 border-t border-gray-100 mt-2">
            <span className="text-xs text-gray-400">Help us improve:</span>
            {feedbackSent ? (
              <span className="text-xs font-bold text-emerald-700">Noted! ✓</span>
            ) : (
              <button
                type="button"
                onClick={() => handleSearchFeedback(false)}
                className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                Report missing product
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <div className="mb-4">
            <h2 className="text-lg font-black text-gray-900">Recommended for you</h2>
            <p className="text-xs text-gray-500 mt-0.5">Top picks based on your recent activity</p>
          </div>
          {recommended.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {recommended.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onAddToCart={onAddToCart} 
                  onToggleWishlist={onToggleWishlist}
                  wishlist={wishlist}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              <p className="font-semibold text-lg">Start typing to search!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
