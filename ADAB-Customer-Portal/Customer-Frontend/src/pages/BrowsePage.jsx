import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api/api';
import ProductCard from '../components/ProductCard';
import { Filter } from 'lucide-react';

export default function BrowsePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter & Sort States
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialQ = searchParams.get('q') || '';
  
  const [q, setQ] = useState(initialQ);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sortOrder, setSortOrder] = useState('Relevance');

  useEffect(() => {
    setQ(initialQ);
  }, [initialQ]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.append('q', q);
        if (selectedCategories.length > 0) params.append('categories', selectedCategories.join(','));
        if (priceMin) params.append('minPrice', priceMin);
        if (priceMax) params.append('maxPrice', priceMax);
        if (sortOrder && sortOrder !== 'Relevance') params.append('sortOrder', sortOrder);

        const res = await api.get(`/catalog/search?${params.toString()}`);
        setProducts(res.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [q, selectedCategories, priceMin, priceMax, sortOrder]);

  const handleCategoryChange = (catName) => {
    setSelectedCategories(prev => 
      prev.includes(catName) 
        ? prev.filter(c => c !== catName)
        : [...prev, catName]
    );
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start animate-fade-in">
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
              {['Fresh Produce', 'Dairy & Eggs', 'Pantry Staples'].map(cat => (
                <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="rounded text-brand-green focus:ring-brand-green" 
                    checked={selectedCategories.includes(cat)}
                    onChange={() => handleCategoryChange(cat)}
                  /> {cat}
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-bold mb-3 uppercase tracking-wider text-gray-500">Price Range</h3>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                placeholder="Min" 
                value={priceMin}
                onChange={e => setPriceMin(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
              />
              <span className="text-gray-400">-</span>
              <input 
                type="number" 
                placeholder="Max" 
                value={priceMax}
                onChange={e => setPriceMax(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Product Grid */}
      <div className="flex-1 w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-gray-900">
            {q ? `Results for "${q}"` : 'All Products'}
          </h1>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Sort by:</span>
            <select 
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              className="border-none bg-transparent font-bold text-gray-900 focus:ring-0 cursor-pointer"
            >
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
            {products.length > 0 ? (
              products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-gray-500">
                No products match your filters.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
