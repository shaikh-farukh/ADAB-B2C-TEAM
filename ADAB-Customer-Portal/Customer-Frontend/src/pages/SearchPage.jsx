import React, { useState, useEffect } from 'react';
import { api } from '../api/api';
import ProductCard from '../components/ProductCard';
import { Search, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SearchPage({ onAddToCart, onToggleWishlist, wishlist }) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
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
    const fetchSuggestions = async () => {
      if (query.trim().length > 1) {
        try {
          const res = await api.get(`/catalog/suggest?q=${encodeURIComponent(query)}`);
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
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-2xl aspect-[3/4]"></div>
          ))}
        </div>
      ) : products.length > 0 ? (
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
      ) : query.trim() ? (
        <div className="text-center py-20 text-gray-500">
          <p className="font-semibold text-lg">No results found for "{query}"</p>
          <p className="text-sm">Try searching for something else.</p>
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500">
          <p className="font-semibold text-lg">Start typing to search!</p>
        </div>
      )}
    </div>
  );
}
