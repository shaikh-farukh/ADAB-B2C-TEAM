import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { api } from '../api/api';
import { Heart, RefreshCw, ShoppingBag, ArrowRight } from 'lucide-react';

let cachedWishlistProducts = {};

export default function WishlistPage({ onAddToCart, onToggleWishlist, onMoveToCart, wishlist }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState(null);

  const [recommended, setRecommended] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [recLoaded, setRecLoaded] = useState(false);
  const [recError, setRecError] = useState(null);

  const isMountedRef = useRef(true);
  const lastWishlistKeyRef = useRef(null);
  const inFlightKeyRef = useRef(null);
  const itemsReqIdRef = useRef(0);
  const recFetchedRef = useRef(false);
  const recInFlightRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const wishlistKey = useMemo(
    () => (Array.isArray(wishlist) ? wishlist.join(',') : ''),
    [wishlist]
  );

  const loadWishlistItems = useCallback(
    async (force = false) => {
      const ids = Array.isArray(wishlist) ? wishlist : [];
      if (ids.length === 0) {
        lastWishlistKeyRef.current = '';
        setProducts([]);
        setHasLoaded(true);
        setLoading(false);
        setError(null);
        return;
      }

      if (!force && inFlightKeyRef.current === wishlistKey) return;
      if (!force && lastWishlistKeyRef.current === wishlistKey) return;

      lastWishlistKeyRef.current = wishlistKey;
      inFlightKeyRef.current = wishlistKey;
      const reqId = ++itemsReqIdRef.current;

      setLoading(true);
      setError(null);

      try {
        const missingIds = ids.filter(id => !cachedWishlistProducts[id]);

        if (missingIds.length === 0) {
          const cachedProducts = ids.map(id => cachedWishlistProducts[id]).filter(Boolean);
          if (!isMountedRef.current || reqId !== itemsReqIdRef.current) return;
          setProducts(cachedProducts);
          setHasLoaded(true);
          setError(null);
          return;
        }

        const fetchResults = await Promise.all(
          missingIds.map(id =>
            api
              .get(`/catalog/products/${id}`)
              .then(res => ({ id, status: 'ok', data: res.data?.data || null }))
              .catch(err => ({
                id,
                status: err.response?.status === 404 ? 'not_found' : 'error',
                error: err
              }))
          )
        );

        if (!isMountedRef.current || reqId !== itemsReqIdRef.current) return;

        const fatalError = fetchResults.find(r => r.status === 'error');
        if (fatalError && fetchResults.every(r => r.status !== 'ok')) {
          throw fatalError.error;
        }

        fetchResults.forEach(r => {
          if (r.status === 'ok' && r.data) {
            cachedWishlistProducts[r.data.id] = r.data;
          }
        });

        const finalProducts = ids.map(id => cachedWishlistProducts[id]).filter(Boolean);
        setProducts(finalProducts);
        setHasLoaded(true);
        setError(null);

        // Clean up orphaned/unapproved 404 wishlist items only
        const notFoundIds = fetchResults.filter(r => r.status === 'not_found').map(r => r.id);
        notFoundIds.forEach(invId => {
          api.delete(`/customers/me/wishlist/items/${invId}`).catch(() => {});
        });
      } catch (err) {
        if (lastWishlistKeyRef.current === wishlistKey) {
          lastWishlistKeyRef.current = null;
        }
        if (!isMountedRef.current || reqId !== itemsReqIdRef.current) return;
        console.error('Error loading wishlist items:', err);
        setError('Unable to retrieve your wishlist items right now. Please check your connection.');
      } finally {
        if (inFlightKeyRef.current === wishlistKey) {
          inFlightKeyRef.current = null;
        }
        if (isMountedRef.current && reqId === itemsReqIdRef.current) {
          setLoading(false);
        }
      }
    },
    [wishlist, wishlistKey]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWishlistItems(false);
  }, [loadWishlistItems]);

  // Load recommendations only when wishlist is empty (StrictMode-safe once)
  const fetchRecommended = useCallback(async (force = false) => {
    if (recInFlightRef.current) return;
    if (!force && recFetchedRef.current) return;
    recFetchedRef.current = true;
    recInFlightRef.current = true;
    setRecLoading(true);
    setRecError(null);
    try {
      const res = await api.get('/catalog/recommended');
      if (!isMountedRef.current) return;
      if (res.data?.success && Array.isArray(res.data.data)) {
        setRecommended(res.data.data.slice(0, 4));
      } else {
        setRecommended([]);
      }
      setRecLoaded(true);
    } catch (err) {
      recFetchedRef.current = false;
      if (!isMountedRef.current) return;
      setRecError(err.response?.data?.message || 'Unable to load recommended products.');
    } finally {
      recInFlightRef.current = false;
      if (isMountedRef.current) setRecLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasLoaded && !error && products.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchRecommended(false);
    }
  }, [hasLoaded, error, products.length, fetchRecommended]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">My Wishlist</h1>
          <p className="text-xs text-gray-500 mt-0.5">Save items to buy later or monitor for special deals</p>
        </div>
        {hasLoaded && !error && (
          <div className="text-xs font-extrabold bg-rose-50 text-brand-coral px-3 py-1.5 rounded-full border border-rose-100">
            {products.length} Saved {products.length === 1 ? 'Item' : 'Items'}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-2xl aspect-[3/4]"></div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation text-red-500"></i>
            <span>{error}</span>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => loadWishlistItems(true)}
            className="flex items-center gap-1 font-bold text-red-800 hover:underline cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Retry
          </button>
        </div>
      ) : hasLoaded && products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(product => {
            const handleAddToCart = (productId, productName) => {
              if (onAddToCart) {
                return onAddToCart(productId, productName);
              } else if (onMoveToCart) {
                return onMoveToCart(productId, productName);
              }
            };
            return (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                onToggleWishlist={onToggleWishlist}
                onRemove={() => onToggleWishlist(product.id)}
                wishlist={wishlist}
                actionButtonText="ADD TO CART"
                customClassName="border-gray-200/80 hover:shadow-lg transition-all duration-300"
              />
            );
          })}
        </div>
      ) : hasLoaded ? (
        /* Polished Empty State with Call to Action */
        <div className="space-y-10">
          <div className="py-16 text-center bg-white rounded-3xl border border-gray-100 shadow-sm p-6 max-w-xl mx-auto">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-coral border border-rose-100">
              <Heart className="w-9 h-9 fill-rose-100" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Your wishlist is empty</h3>
            <p className="text-gray-500 text-xs max-w-sm mx-auto mb-6 leading-relaxed">
              Explore hundreds of verified farm-fresh produce and daily grocery items, and tap the heart icon to save them.
            </p>
            <button
              type="button"
              onClick={() => navigate('/browse')}
              className="inline-flex items-center gap-2 bg-brand-green hover:bg-green-700 text-white font-bold text-xs px-6 py-3 rounded-2xl shadow-md shadow-brand-green/20 transition cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              Explore Marketplace
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          {/* Trending Suggestions below Empty State (hidden until returned) */}
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
                className="flex items-center gap-1 font-bold text-red-800 hover:underline cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3 h-3 ${recLoading ? 'animate-spin' : ''}`} /> Retry
              </button>
            </div>
          ) : recLoaded && recommended.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-gray-700">
                  Trending Items You Might Like
                </h3>
                <button
                  type="button"
                  onClick={() => navigate('/browse')}
                  className="text-xs font-bold text-brand-green hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {recommended.map(item => (
                  <ProductCard
                    key={item.id}
                    product={item}
                    onAddToCart={onAddToCart}
                    onToggleWishlist={onToggleWishlist}
                    wishlist={wishlist}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
