import React, { useEffect, useState } from 'react';
import ProductCard from '../components/ProductCard';
import { api } from '../api/api';

let cachedWishlistProducts = {};

export default function WishlistPage({ onAddToCart, onToggleWishlist, onMoveToCart, wishlist }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If wishlist is empty, we don't need to fetch anything
    if (!wishlist || wishlist.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
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

    Promise.all(fetchPromises).then(results => {
      // Filter out nulls (failed requests)
      const newProducts = results.filter(p => p !== null);
      newProducts.forEach(p => {
        cachedWishlistProducts[p.id] = p;
      });
      
      // Combine cached + newly fetched in the order of wishlist
      const finalProducts = wishlist.map(id => cachedWishlistProducts[id]).filter(Boolean);
      setProducts(finalProducts);
      setLoading(false);
    });

  }, [wishlist]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900">My Wishlist</h1>
        <div className="text-sm font-bold text-gray-500">
          {wishlist?.length || 0} items
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-2xl aspect-[3/4]"></div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map(product => {
            const handleMoveToCart = (productId, productName) => {
              if (onMoveToCart) {
                onMoveToCart(productId, productName);
              } else {
                onAddToCart(productId, productName);
                onToggleWishlist(productId);
              }
            };
            return (
              <ProductCard 
                key={product.id} 
                product={product} 
                onAddToCart={handleMoveToCart}
                onToggleWishlist={onToggleWishlist}
                wishlist={wishlist}
                actionButtonText="MOVE"
              />
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-4 text-brand-coral">
            <i className="fa-solid fa-heart text-2xl"></i>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Your wishlist is empty</h3>
          <p className="text-gray-500 text-sm mb-6">Explore products and tap the heart icon to save them for later.</p>
        </div>
      )}
    </div>
  );
}
