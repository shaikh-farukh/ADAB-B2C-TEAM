import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/api';
import ProductCard from '../components/ProductCard';
import { Filter } from 'lucide-react';

export default function BrowsePage({ onAddToCart, onToggleWishlist, wishlist }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Read URL State
  const category = searchParams.get('category') || '';
  const sortBy = searchParams.get('sortBy') || 'relevance';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const page = parseInt(searchParams.get('page')) || 1;

  useEffect(() => {
    setLoading(true);
    
    // Construct Backend URL params
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (sortBy) params.append('sortBy', sortBy);
    if (minPrice) params.append('minPrice', minPrice);
    if (maxPrice) params.append('maxPrice', maxPrice);
    params.append('page', page);
    params.append('limit', 10);

    api.get(`/catalog/search?${params.toString()}`)
      .then(res => setProducts(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [category, sortBy, minPrice, maxPrice, page]);

  // Handlers for Filter changes
  const updateFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.set('page', 1); // Reset page on filter change
    setSearchParams(newParams);
  };

  const toggleCategory = (catId) => {
    updateFilter('category', category === catId ? '' : catId);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      {/* Sidebar Filters */}
      <aside className="w-full md:w-64 bg-white border border-gray-200 rounded-2xl p-5 shrink-0 sticky top-20">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
          <Filter className="w-5 h-5 text-gray-500" />
          <h2 className="font-black text-gray-900">Filters</h2>
        </div>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold mb-3 uppercase tracking-wider text-gray-500">Categories</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={category === '1'}
                  onChange={() => toggleCategory('1')}
                  className="rounded text-brand-green focus:ring-brand-green" 
                /> Fresh Produce
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={category === '2'}
                  onChange={() => toggleCategory('2')}
                  className="rounded text-brand-green focus:ring-brand-green" 
                /> Dairy & Eggs
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={category === '3'}
                  onChange={() => toggleCategory('3')}
                  className="rounded text-brand-green focus:ring-brand-green" 
                /> Pantry Staples
              </label>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-bold mb-3 uppercase tracking-wider text-gray-500">Price Range</h3>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                placeholder="Min" 
                value={minPrice}
                onChange={(e) => updateFilter('minPrice', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
              />
              <span className="text-gray-400">-</span>
              <input 
                type="number" 
                placeholder="Max" 
                value={maxPrice}
                onChange={(e) => updateFilter('maxPrice', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Product Grid */}
      <div className="flex-1 w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-gray-900">All Products</h1>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Sort by:</span>
            <select 
              value={sortBy}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              className="border-none bg-transparent font-bold text-gray-900 focus:ring-0 cursor-pointer"
            >
              <option value="relevance">Relevance</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating_desc">Highest Rated</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 rounded-2xl aspect-[3/4]"></div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            
            {/* Pagination Controls */}
            <div className="flex justify-center items-center gap-4 mt-10">
              <button 
                disabled={page <= 1}
                onClick={() => updateFilter('page', page - 1)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm disabled:opacity-50 font-bold"
              >
                Previous
              </button>
              <span className="text-sm font-bold text-gray-700">Page {page}</span>
              <button 
                onClick={() => updateFilter('page', page + 1)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-store-slash text-2xl text-gray-400"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No products found</h3>
            <p className="text-gray-500 text-sm">Try adjusting your filters or search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
