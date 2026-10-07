import React, { useEffect, useState } from 'react';
import { api } from '../api/api';
import ProductCard from '../components/ProductCard';
import { Filter } from 'lucide-react';

export default function BrowsePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real scenario, we'd pass query params (filters, pagination, etc.)
    api.get('/catalog/search?q=')
      .then(res => setProducts(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

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
                <input type="checkbox" className="rounded text-brand-green focus:ring-brand-green" /> Fresh Produce
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded text-brand-green focus:ring-brand-green" /> Dairy & Eggs
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded text-brand-green focus:ring-brand-green" /> Pantry Staples
              </label>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-bold mb-3 uppercase tracking-wider text-gray-500">Price Range</h3>
            <div className="flex items-center gap-2">
              <input type="number" placeholder="Min" className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
              <span className="text-gray-400">-</span>
              <input type="number" placeholder="Max" className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
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
            <select className="border-none bg-transparent font-bold text-gray-900 focus:ring-0 cursor-pointer">
              <option>Relevance</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Customer Rating</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 rounded-2xl aspect-[3/4]"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
