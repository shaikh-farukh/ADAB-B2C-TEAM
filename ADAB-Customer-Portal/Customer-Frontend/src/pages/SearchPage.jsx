import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../api/api';
import ProductCard from '../components/ProductCard';
import { AlertCircle, Search, ArrowLeft, Flame, RefreshCw, ThumbsUp, ThumbsDown, CheckCircle2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

let searchRecommendedCache = null;

export default function SearchPage({ onAddToCart, onToggleWishlist, wishlist }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(urlQuery);
  const [products, setProducts] = useState([]);
  const [recommended, setRecommended] = useState(searchRecommendedCache || []);
  const [recLoading, setRecLoading] = useState(!searchRecommendedCache);
  const [recLoaded, setRecLoaded] = useState(Boolean(searchRecommendedCache));
  const [recError, setRecError] = useState(null);

  const [popularSearches, setPopularSearches] = useState([]);
  const [popularLoading, setPopularLoading] = useState(true);
  const [popularLoaded, setPopularLoaded] = useState(false);
  const [popularError, setPopularError] = useState(null);

  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchLoaded, setSearchLoaded] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const navigate = useNavigate();

  const isMountedRef = useRef(true);
  const recFetchedRef = useRef(Boolean(searchRecommendedCache));
  const recInFlightRef = useRef(false);
  const popularFetchedRef = useRef(false);
  const popularInFlightRef = useRef(false);
  const lastSuggestionQueryRef = useRef('');
  const suggestionReqIdRef = useRef(0);
  const lastSearchKeyRef = useRef(null);
  const inFlightSearchKeyRef = useRef(null);
  const searchReqIdRef = useRef(0);
  const feedbackSubmittingRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sync URL query if user navigates with a new ?q= search param
  useEffect(() => {
    const qParam = searchParams.get('q');
    if (qParam !== null && qParam !== query) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery(qParam);
    }
  }, [searchParams, query]);

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

  const fetchRecommended = useCallback(async (force = false) => {
    if (recInFlightRef.current) return;
    if (!force && recFetchedRef.current) return;
    recFetchedRef.current = true;
    recInFlightRef.current = true;
    if (force) {
      searchRecommendedCache = null;
      setRecLoading(true);
      setRecError(null);
    }
    try {
      const res = await api.get('/catalog/recommended');
      if (!isMountedRef.current) return;
      const list = res.data?.data ?? res.data;
      const items = Array.isArray(list) ? list : [];
      searchRecommendedCache = items;
      setRecommended(items);
      setRecLoaded(true);
      setRecError(null);
    } catch (err) {
      recFetchedRef.current = false;
      if (!isMountedRef.current) return;
      console.error('Failed to fetch recommended:', err);
      setRecError(err.response?.data?.message || 'Unable to load recommendations.');
    } finally {
      recInFlightRef.current = false;
      if (isMountedRef.current) setRecLoading(false);
    }
  }, []);

  const fetchPopularSearches = useCallback(async (force = false) => {
    if (popularInFlightRef.current) return;
    if (!force && popularFetchedRef.current) return;
    popularFetchedRef.current = true;
    popularInFlightRef.current = true;
    if (force) {
      setPopularLoading(true);
      setPopularError(null);
    }
    try {
      const res = await api.get('/catalog/search/popular');
      if (!isMountedRef.current) return;
      const list = res.data?.data ?? res.data;
      setPopularSearches(Array.isArray(list) ? list : []);
      setPopularLoaded(true);
      setPopularError(null);
    } catch (err) {
      popularFetchedRef.current = false;
      if (!isMountedRef.current) return;
      console.error('Failed to fetch popular searches:', err);
      setPopularError(err.response?.data?.message || 'Unable to load trending searches.');
    } finally {
      popularInFlightRef.current = false;
      if (isMountedRef.current) setPopularLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRecommended(false);
    fetchPopularSearches(false);
  }, [fetchRecommended, fetchPopularSearches]);

  const handleSearchFeedback = async (helpful) => {
    if (feedbackSubmittingRef.current) return;
    feedbackSubmittingRef.current = true;
    setFeedbackSubmitting(true);
    try {
      await api.post('/catalog/search/feedback', {
        query: query.trim() || 'popular_browse',
        helpful
      });
      if (!isMountedRef.current) return;
      setFeedbackSent(true);
      setTimeout(() => {
        if (isMountedRef.current) setFeedbackSent(false);
      }, 3500);
    } catch (e) {
      console.warn('Feedback submission failed', e);
    } finally {
      feedbackSubmittingRef.current = false;
      if (isMountedRef.current) setFeedbackSubmitting(false);
    }
  };

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length <= 1) {
      lastSuggestionQueryRef.current = '';
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const t = setTimeout(async () => {
      if (lastSuggestionQueryRef.current === trimmed) return;
      lastSuggestionQueryRef.current = trimmed;
      const reqId = ++suggestionReqIdRef.current;
      try {
        const res = await api.get(`/catalog/search/suggestions?q=${encodeURIComponent(trimmed)}`);
        if (!isMountedRef.current || reqId !== suggestionReqIdRef.current) return;
        setSuggestions(res.data?.data || []);
        setShowSuggestions(true);
      } catch (err) {
        lastSuggestionQueryRef.current = '';
        console.error('Error fetching suggestions', err);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const currentSearchKey = useMemo(
    () =>
      JSON.stringify({
        q: query.trim(),
        brand: filters.brand,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        minRating: filters.minRating,
        inStockOnly: filters.inStockOnly
      }),
    [query, filters]
  );

  const fetchProducts = useCallback(
    async (keyToLoad, force = false) => {
      if (!force && inFlightSearchKeyRef.current === keyToLoad) return;
      if (!force && lastSearchKeyRef.current === keyToLoad) return;

      lastSearchKeyRef.current = keyToLoad;
      inFlightSearchKeyRef.current = keyToLoad;
      const reqId = ++searchReqIdRef.current;

      setLoading(true);
      setSearchError(null);
      try {
        const queryParams = new URLSearchParams();
        if (query.trim()) queryParams.append('q', query.trim());
        if (filters.brand) queryParams.append('brand', filters.brand);
        if (filters.minPrice) queryParams.append('minPrice', filters.minPrice);
        if (filters.maxPrice) queryParams.append('maxPrice', filters.maxPrice);
        if (filters.minRating) queryParams.append('minRating', filters.minRating);
        if (filters.inStockOnly) queryParams.append('inStockOnly', 'true');

        const res = await api.get(`/catalog/search?${queryParams.toString()}`);
        if (!isMountedRef.current || reqId !== searchReqIdRef.current) return;
        setProducts(Array.isArray(res.data?.data) ? res.data.data : []);
        setSearchLoaded(true);
        setSearchError(null);
      } catch (err) {
        if (lastSearchKeyRef.current === keyToLoad) {
          lastSearchKeyRef.current = null;
        }
        if (!isMountedRef.current || reqId !== searchReqIdRef.current) return;
        console.error('Error in SearchPage fetchProducts:', err);
        setProducts([]);
        setSearchError(err.response?.data?.message || 'Unable to search products right now. Please try again.');
      } finally {
        if (inFlightSearchKeyRef.current === keyToLoad) {
          inFlightSearchKeyRef.current = null;
        }
        if (isMountedRef.current && reqId === searchReqIdRef.current) {
          setLoading(false);
        }
      }
    },
    [query, filters]
  );

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts(currentSearchKey, false);
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [currentSearchKey, fetchProducts]);

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
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchParams(e.target.value.trim() ? { q: e.target.value } : {});
              }}
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
                    setSearchParams({ q: suggestion });
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

        {/* Popular & Trending Searches Pills (hidden until API returns) */}
        {!query.trim() && (
          popularLoading ? (
            <div className="mt-3 flex items-center gap-2 py-1">
              {[...Array(4)].map((_, idx) => (
                <div key={idx} className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
              ))}
            </div>
          ) : popularError ? (
            <div className="mt-3 flex items-center justify-between gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-1.5">
              <span>{popularError}</span>
              <button
                type="button"
                disabled={popularLoading}
                onClick={() => fetchPopularSearches(true)}
                className="font-bold text-red-800 hover:underline inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3 h-3 ${popularLoading ? 'animate-spin' : ''}`} /> Retry
              </button>
            </div>
          ) : popularLoaded && popularSearches.length > 0 ? (
            <div className="mt-3 flex items-center gap-2 overflow-x-auto hide-scroll py-1">
              <span className="text-[11px] font-extrabold text-amber-600 flex items-center gap-1 shrink-0 uppercase tracking-wide">
                <Flame className="w-3.5 h-3.5 fill-current" />
                Trending:
              </span>
              {popularSearches.map((term, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuery(term);
                    setSearchParams({ q: term });
                  }}
                  className="px-3 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 text-gray-700 text-xs font-bold rounded-full border border-gray-200 transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
                >
                  {term}
                </button>
              ))}
            </div>
          ) : null
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-2xl aspect-[3/4]"></div>
          ))}
        </div>
      ) : searchError ? (
        <div className="bg-white rounded-3xl border border-red-100 p-8 text-center max-w-md mx-auto shadow-sm my-6">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-gray-900 text-base mb-1">Search Failed</h3>
          <p className="text-xs text-gray-500 mb-4">{searchError}</p>
          <button
            type="button"
            disabled={loading}
            onClick={() => fetchProducts(currentSearchKey, true)}
            className="px-5 py-2.5 bg-brand-green text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition inline-flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Retry
          </button>
        </div>
      ) : searchLoaded && products.length > 0 ? (
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
                  disabled={feedbackSubmitting}
                  onClick={() => handleSearchFeedback(true)}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 text-xs font-bold text-gray-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Yes</span>
                </button>
                <button
                  type="button"
                  disabled={feedbackSubmitting}
                  onClick={() => handleSearchFeedback(false)}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-800 text-xs font-bold text-gray-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span>No</span>
                </button>
              </div>
            )}
          </div>
        </>
      ) : searchLoaded && query.trim() ? (
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
                disabled={feedbackSubmitting}
                onClick={() => handleSearchFeedback(false)}
                className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Report missing product
              </button>
            )}
          </div>
        </div>
      ) : searchLoaded ? (
        <div className="mt-6">
          <div className="mb-4">
            <h2 className="text-lg font-black text-gray-900">Recommended for you</h2>
            <p className="text-xs text-gray-500 mt-0.5">Top picks based on your recent activity</p>
          </div>
          {recLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-200 rounded-2xl aspect-[3/4]"></div>
              ))}
            </div>
          ) : recError ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between text-xs text-red-700">
              <span>{recError}</span>
              <button
                type="button"
                disabled={recLoading}
                onClick={() => fetchRecommended(true)}
                className="px-3 py-1.5 bg-white border border-red-200 rounded-xl font-bold text-red-800 hover:bg-red-100 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3 h-3 ${recLoading ? 'animate-spin' : ''}`} /> Retry
              </button>
            </div>
          ) : recLoaded && recommended.length > 0 ? (
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
          ) : recLoaded ? (
            <div className="text-center py-10 text-gray-500">
              <p className="font-semibold text-lg">Start typing to search!</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
