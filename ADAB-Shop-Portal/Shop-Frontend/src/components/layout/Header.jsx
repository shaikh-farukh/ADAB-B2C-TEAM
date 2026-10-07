import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [soundboxOn, setSoundboxOn] = useState(true);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/mastersearch?q=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/mastersearch');
    }
  };

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="w-full px-4 sm:px-6 py-3 flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button 
            onClick={() => {
              const drawer = document.getElementById('sellerDrawer');
              if (drawer) drawer.classList.toggle('open');
            }} 
            className="lg:hidden w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 text-lg hover:bg-gray-200 transition"
          >
            <i className="fa-solid fa-bars"></i>
          </button>
          <Link to="/" className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-dark text-white flex items-center justify-center font-extrabold text-base sm:text-lg hover:opacity-90">
            A
          </Link>
          <div>
            <Link to="/" className="font-extrabold text-gray-900 leading-tight text-sm sm:text-base hover:text-green-800">
              ADAB Seller
            </Link>
            <div className="text-xs text-gray-400 hidden xs:block truncate max-w-[120px] sm:max-w-none" id="hdrStoreName">
              Shri Balaji Store
            </div>
          </div>
        </div>
        
        <div className="flex-1 min-w-[130px] max-w-lg mx-1">
          <form onSubmit={handleSearch} className="relative">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 text-xs sm:text-sm"></i>
            <input 
              type="search" 
              id="globalSearch" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search to buy..." 
              className="w-full pl-8 sm:pl-9 pr-14 sm:pr-20 py-2 sm:py-2.5 rounded-xl border-2 border-blue-100 text-xs sm:text-sm outline-none focus:border-blue-500 bg-blue-50/50" 
            />
            <button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 btn-primary !text-[10px] sm:!text-xs !py-1 sm:!py-1.5 !px-2 sm:!px-3">
              Search
            </button>
          </form>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button 
            type="button"
            onClick={() => setSoundboxOn(!soundboxOn)} 
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition ${soundboxOn ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-gray-200 bg-gray-50 text-gray-500'}`}
          >
            <i className={`fa-solid ${soundboxOn ? 'fa-volume-high text-amber-600' : 'fa-volume-xmark text-gray-400'}`}></i>
            <span className="hidden md:inline">Soundbox: {soundboxOn ? 'ON' : 'OFF'}</span>
          </button>
          <Link to="/buycart" className="relative flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full bg-blue-50 text-blue-800 text-xs sm:text-sm font-bold border border-blue-200 hover:bg-blue-100">
            <i className="fa-solid fa-cart-shopping"></i> 
            <span className="hidden md:inline">Buy Cart</span>
          </Link>
          <div className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-full bg-green-50 text-green-800 text-xs sm:text-sm font-bold border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> 
            <span>Open</span>
          </div>
          <Link to="/onboarding" className="btn-primary text-xs !py-1.5 !px-2.5 hidden xl:flex items-center gap-1">
            <i className="fa-solid fa-list-check"></i> Setup
          </Link>
          <Link to="/settings" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-xs font-bold text-gray-700 bg-white">
            <i className="fa-solid fa-store text-green-700"></i> 
            <span className="hidden sm:inline">Store Account</span>
          </Link>
        </div>
      </div>

      {/* Mobile quick horizontal tab strip */}
      <div className="lg:hidden px-3 py-1.5 border-t border-gray-100 flex gap-2 overflow-x-auto hide-scroll text-xs bg-gray-50/50">
        <Link to="/" className="px-3 py-1 rounded-full bg-white border border-gray-200 font-bold whitespace-nowrap text-green-800">
          <i className="fa-solid fa-house mr-1 text-green-600"></i> Dashboard
        </Link>
        <Link to="/pos" className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 font-bold whitespace-nowrap text-indigo-800">
          <i className="fa-solid fa-cash-register mr-1 text-indigo-600"></i> POS
        </Link>
        <Link to="/orders" className="px-3 py-1 rounded-full bg-white border border-gray-200 font-bold whitespace-nowrap text-gray-700">
          <i className="fa-solid fa-bag-shopping mr-1 text-green-600"></i> Orders
        </Link>
        <Link to="/products" className="px-3 py-1 rounded-full bg-white border border-gray-200 font-bold whitespace-nowrap text-gray-700">
          <i className="fa-solid fa-box mr-1 text-emerald-600"></i> Products
        </Link>
        <Link to="/finance" className="px-3 py-1 rounded-full bg-white border border-gray-200 font-bold whitespace-nowrap text-gray-700">
          <i className="fa-solid fa-wallet mr-1 text-emerald-600"></i> Finance
        </Link>
      </div>
    </header>
  );
}
