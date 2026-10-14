import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { api } from '../api/api';
import { Heart, RefreshCw, ShoppingBag, ArrowRight } from 'lucide-react';

let cachedWishlistProducts = {};

export default function WishlistPage({ onAddToCart, onToggleWishlist, onMoveToCart, wishlist }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recommended, setRecommended] = useState([]);

  const loadWishlistItems = async () => {
    // If wishlist is empty, we don't need to fetch product details
    if (!wishlist || wishlist.length === 0) {
      setProducts([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Find what we need to fetch
      const missingIds = wishlist.filter(id => !cachedWishlistProducts[id]);
      const cachedProducts = wishlist.map(id => cachedWishlistProducts[id]).filter(Boolean);

      if (missingIds.length === 0) {
        setProducts(cachedProducts);
        setLoading(false);
        return;
      }

      // Fetch product details for missing items
      const fetchPromises = missingIds.map(id => 
        api.get(`/catalog/products/${id}`)
          .then(res => res.data.data)
          .catch(err => {
            console.error(`Failed to fetch product ${id}`, err);
            return null;
          })
      );

      const results = await Promise.all(fetchPromises);
      const newProducts = results.filter(p => p !== null);
      newProducts.forEach(p => {
        cachedWishlistProducts[p.id] = p;
      });
      
      const finalProducts = wishlist.map(id => cachedWishlistProducts[id]).filter(Boolean);
      setProducts(finalProducts);

      // If any wishlist item was orphaned or unapproved (returned 404), sync local wishlist state
      const validProductIds = finalProducts.map(p => p.id);
      if (validProductIds.length > 0 && validProductIds.length !== wishlist.length && onToggleWishlist) {
        const invalidIds = wishlist.filter(id => !validProductIds.includes(id));
        invalidIds.forEach(invId => {
          api.delete('/wishlist', { data: { userId: '11111111-1111-1111-1111-111111111111', listingId: invId } }).catch(() => {});
        });
      }
    } catch (err) {
      console.error('Error loading wishlist items:', err);
      setError('Unable to retrieve your wishlist items right now. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlistItems();
  }, [wishlist]);

  // Load recommendations for empty state
  useEffect(() => {
    api.get('/catalog/recommended')
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          setRecommended(res.data.data.slice(0, 4));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">My Wishlist</h1>
          <p className="text-xs text-gray-500 mt-0.5">Save items to buy later or monitor for special deals</p>
        </div>
        <div className="text-xs font-extrabold bg-rose-50 text-brand-coral px-3 py-1.5 rounded-full border border-rose-100">
          {products?.length ?? wishlist?.length ?? 0} Saved {(products?.length ?? wishlist?.length) === 1 ? 'Item' : 'Items'}
        </div>
      </div>

      {/* Error state with retry */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation text-red-500"></i>
            <span>{error}</span>
          </div>
          <button
            onClick={loadWishlistItems}
            className="flex items-center gap-1 font-bold text-red-800 hover:underline cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-red-200"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-2xl aspect-[3/4]"></div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(product => {
            const handleAddToCart = (productId, productName) => {
              if (onAddToCart) {
                onAddToCart(productId, productName);
              } else if (onMoveToCart) {
                onMoveToCart(productId, productName);
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
      ) : (
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
              onClick={() => navigate('/browse')}
              className="inline-flex items-center gap-2 bg-brand-green hover:bg-green-700 text-white font-bold text-xs px-6 py-3 rounded-2xl shadow-md shadow-brand-green/20 transition cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              Explore Marketplace
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          {/* Trending Suggestions below Empty State */}
          {recommended.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-gray-700">
                  Trending Items You Might Like
                </h3>
                <button
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
          )}
        </div>
      )}
    </div>
  );
}
