import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import listingService from '../services/listingService';

export default function MasterSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryFromUrl = searchParams.get('q') || '';
  
  const [searchInput, setSearchInput] = useState(queryFromUrl);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDistance, setSelectedDistance] = useState('all');
  const [sortBy, setSortBy] = useState('price');
  const [cart, setCart] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSearchInput(queryFromUrl);
  }, [queryFromUrl]);

  useEffect(() => {
    async function fetchSearchItems() {
      try {
        setLoading(true);
        const res = await listingService.getListings({ search: searchInput, limit: 30 });
        const liveItems = res.data || [];
        if (liveItems.length > 0) {
          setResults(liveItems.map(item => ({
            id: item.id,
            name: item.title,
            store: 'Verified ADAB Merchant',
            dist: 3,
            price: Number(item.sell_price) || 0,
            rating: '4.8',
            minOrder: item.min_order_qty || 1,
            cat: item.product_type ? item.product_type.toLowerCase() : 'grocery'
          })));
        } else {
          setResults([
            { id: 'S-1', name: 'Sunflower Oil 15L Tin', store: 'Gujarat Agro Mill', dist: 3, price: 1420, rating: '4.8', minOrder: 10, cat: 'grocery' },
            { id: 'S-2', name: 'Fortune Sunflower Oil 15L', store: 'Vesu Wholesale', dist: 8, price: 1380, rating: '4.6', minOrder: 5, cat: 'grocery' },
            { id: 'S-3', name: 'Cotton Kurtis (50 pcs bundle)', store: 'Textile Park Store', dist: 5, price: 19500, rating: '4.9', minOrder: 1, cat: 'clothing' },
            { id: 'S-4', name: 'Basmati Rice 100kg Bag', store: 'Punjab Grain Co', dist: 120, price: 6200, rating: '4.7', minOrder: 1, cat: 'grocery' },
            { id: 'S-5', name: 'Turmeric Powder 5kg', store: 'Spice Traders', dist: 15, price: 2100, rating: '4.5', minOrder: 1, cat: 'spices' },
            { id: 'S-6', name: 'Amul Butter 500g x 24 crate', store: 'Dairy Collective', dist: 4, price: 8400, rating: '4.8', minOrder: 1, cat: 'dairy' }
          ]);
        }
      } catch (err) {
        console.error('Error fetching master search:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSearchItems();
  }, [searchInput]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams(searchInput.trim() ? { q: searchInput.trim() } : {});
  };

  const handleAddToCart = (item) => {
    setCart(prev => [...prev, item]);
    alert(`Added "${item.name}" to Purchase Cart!`);
  };

  const filteredResults = results.filter(item => {
    const matchesCat = selectedCategory === 'all' || item.cat.includes(selectedCategory);
    const matchesDist = selectedDistance === 'all' || item.dist <= Number(selectedDistance);
    const matchesQuery = !searchInput || item.name.toLowerCase().includes(searchInput.toLowerCase());
    return matchesCat && matchesDist && matchesQuery;
  }).sort((a, b) => {
    if (sortBy === 'price') return a.price - b.price;
    if (sortBy === 'near') return a.dist - b.dist;
    if (sortBy === 'rating') return Number(b.rating) - Number(a.rating);
    return 0;
  });

  return (
    <section id="sec-mastersearch" className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900">Search &amp; Buy Anything</h1>
        <p className="text-sm text-gray-500">Search all registered supplier stores across ADAB — compare prices and restock</p>
      </div>

      <div className="card p-5 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white">
        <form onSubmit={handleSearchSubmit} className="relative">
          <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 text-lg"></i>
          <input 
            type="search" 
            value={searchInput} 
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="e.g. sunflower oil, kurti, rice 25kg, garam masala..." 
            className="w-full pl-12 pr-24 py-4 rounded-2xl border-2 border-blue-200 text-base outline-none focus:border-blue-500 bg-white" 
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 btn-primary !text-xs !py-2 !px-4">
            Search
          </button>
        </form>

        <div className="flex gap-2 mt-3 flex-wrap text-xs font-bold">
          {['Oil', 'Rice', 'Kurti', 'Dal', 'Masala', 'Milk'].map(tag => (
            <button 
              key={tag}
              onClick={() => setSearchInput(tag)}
              className="px-3 py-1.5 rounded-full bg-white border border-gray-200 hover:border-blue-300 hover:text-blue-700 transition"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <select 
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)} 
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
        >
          <option value="all">All Categories</option>
          <option value="grocery">Grocery</option>
          <option value="clothing">Clothing</option>
          <option value="dairy">Dairy</option>
          <option value="spices">Spices</option>
        </select>
        <select 
          value={selectedDistance} 
          onChange={(e) => setSelectedDistance(e.target.value)} 
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
        >
          <option value="all">Any Distance</option>
          <option value="5">Within 5 km</option>
          <option value="15">Within 15 km</option>
          <option value="50">Within 50 km</option>
        </select>
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)} 
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
        >
          <option value="price">Lowest Price</option>
          <option value="near">Nearest Store</option>
          <option value="rating">Best Rated</option>
        </select>
        {cart.length > 0 && (
          <div className="px-3 py-2 rounded-xl bg-blue-100 text-blue-800 text-xs font-bold flex items-center gap-1.5 self-center">
            <i className="fa-solid fa-cart-shopping"></i> {cart.length} items in Cart
          </div>
        )}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="card p-8 text-center text-gray-500 text-sm">
            <i className="fa-solid fa-spinner fa-spin mr-2"></i> Searching stores nationwide...
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="card p-8 text-center text-gray-500">
            <i className="fa-solid fa-search text-3xl text-gray-300 mb-3 block"></i>
            <div className="font-bold text-gray-800">No products found</div>
            <p className="text-sm mt-1 text-gray-400">Try a different keyword or broaden your filter criteria</p>
          </div>
        ) : (
          filteredResults.map(item => (
            <div key={item.id} className="card p-4 hover:border-blue-300 transition">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 text-xl font-bold shrink-0">
                    <i className="fa-solid fa-box-open"></i>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.store} • {item.dist} km • ★ {item.rating} • Min Order: {item.minOrder}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <div className="text-right">
                    <div className="text-xl font-extrabold text-green-700">₹{item.price}</div>
                    <div className="text-[10px] text-gray-400">Direct Merchant Price</div>
                  </div>
                  <button 
                    onClick={() => handleAddToCart(item)} 
                    className="btn-soft !text-xs whitespace-nowrap"
                  >
                    <i className="fa-solid fa-cart-plus mr-1"></i> Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
