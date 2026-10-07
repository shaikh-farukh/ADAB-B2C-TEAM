import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sellerApi } from '../api/sellerApi';

export default function BuyNearbyPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');

  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoading(true);
        const res = await sellerApi.getNearbyCatalog();
        if (res.data && res.data.success) {
          setItems(res.data.data || []);
        } else {
          setItems([]);
        }
      } catch (e) {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesCat = selectedCat === 'all' || (item.category || '').toLowerCase().includes(selectedCat);
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || (item.name || '').toLowerCase().includes(q) || (item.store_name || '').toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <section id="sec-buy" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold" data-i18n="buyTitle">Buy from Nearby Stores</h1>
          <p className="text-sm text-gray-500" data-i18n="buyDesc">
            Quick restock from stores close to you — or use <Link to="/mastersearch" className="text-blue-700 font-bold underline">Search &amp; Buy</Link> to find anything
          </p>
        </div>
        <div className="flex gap-2 text-xs flex-wrap">
          <span className="px-3 py-1.5 rounded-full bg-purple-50 text-purple-800 font-bold border border-purple-200">Credit: Available</span>
          <span className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200"><i className="fa-solid fa-star text-amber-500"></i> Active Rewards</span>
        </div>
      </div>

      <div className="card p-3 flex flex-col sm:flex-row gap-2 flex-wrap" id="buyBrowseFilters">
        <input 
          type="search" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products or stores..." 
          className="flex-1 min-w-[160px] px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500" 
        />
        <select 
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
        >
          <option value="all">All categories</option>
          <option value="grocery">Grocery</option>
          <option value="clothing">Clothing</option>
          <option value="dairy">Dairy</option>
          <option value="spices">Spices</option>
        </select>
      </div>

      <div id="buyPanelBrowse">
        {loading && (
          <div className="card p-6 text-center text-gray-500 text-sm">
            <i className="fa-solid fa-spinner fa-spin mr-2"></i> Loading nearby suppliers and stock...
          </div>
        )}

        {!loading && filteredItems.length === 0 && (
          <div className="card p-6 text-center text-gray-500 text-sm">
            No restock items available matching your filter. Check back soon or search nationwide in <Link to="/mastersearch" className="text-blue-600 font-bold">Search &amp; Buy</Link>.
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" id="buyBrowseGrid">
          {!loading && filteredItems.map((item, idx) => (
            <div key={item.id || idx} className="card p-4 space-y-3">
              <div className="text-xs text-gray-500">From: {item.store_name || 'Nearby Hub'} · {item.distance || '3 km'}</div>
              <h3 className="font-bold text-gray-900">{item.name}</h3>
              <div className="text-green-700 font-extrabold text-lg">
                ₹{Number(item.price || item.mrp || 0).toLocaleString('en-IN')} 
                {item.min_order > 1 && <span className="text-xs text-gray-400 font-normal"> · min {item.min_order}</span>}
              </div>
              <div className="text-[10px] text-orange-700 font-semibold">14 days shop credit · Porter delivery</div>
              <div className="flex gap-2">
                <button onClick={() => alert(`Added ${item.name} to Cart`)} className="btn-soft flex-1 !text-xs">
                  <i className="fa-solid fa-cart-plus mr-1"></i> Add to Cart
                </button>
                <button onClick={() => alert(`Purchased ${item.name}`)} className="btn-primary flex-1 !text-xs">
                  Buy Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

