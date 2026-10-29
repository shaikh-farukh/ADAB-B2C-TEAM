import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSeller } from '../../context/SellerContext';
import { useTranslation } from '../../context/LanguageContext';
import StoreStatusButton from './StoreStatusButton';
import LanguageSelector from './LanguageSelector';
import AiCopilotDrawer from '../AiCopilotDrawer';

export default function Header() {
  const navigate = useNavigate();
  const { profile, store } = useSeller();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  const storeName = store?.store_name || 'My Store';
  const initial = (storeName || 'S').charAt(0).toUpperCase();

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
          <Link to="/" className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-dark text-white flex items-center justify-center font-extrabold text-base sm:text-lg hover:opacity-90 shadow-sm">
            {initial}
          </Link>
          <div>
            <Link to="/" className="font-extrabold text-gray-900 leading-tight text-sm sm:text-base hover:text-green-800">
              {t('appName', 'ADAB Seller')}
            </Link>
            <div className="text-xs text-gray-500 font-medium hidden xs:block truncate max-w-[140px] sm:max-w-none" id="hdrStoreName">
              {storeName}
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
              placeholder={t('searchToBuyPlaceholder', 'Search to buy...')} 
              className="w-full pl-8 sm:pl-9 pr-14 sm:pr-20 py-2 sm:py-2.5 rounded-xl border-2 border-blue-100 text-xs sm:text-sm outline-none focus:border-blue-500 bg-blue-50/50" 
            />
            <button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 btn-primary !text-[10px] sm:!text-xs !py-1 sm:!py-1.5 !px-2 sm:!px-3">
              {t('search', 'Search')}
            </button>
          </form>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            id="btn-header-ai-copilot-layout"
            onClick={() => setIsCopilotOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-extrabold shadow-sm hover:shadow transition-all duration-200 cursor-pointer border border-indigo-400/30 active:scale-95 shrink-0"
            title="Open ADAB AI Copilot (Gemini 3.5)"
          >
            <i className="fa-solid fa-wand-magic-sparkles text-amber-300 text-xs"></i>
            <span className="hidden md:inline">{t('aiCopilot', 'AI Copilot')}</span>
            <span className="md:hidden font-bold">AI</span>
            <span className="hidden xl:inline text-[9px] bg-white/20 text-indigo-100 px-1 py-0.2 rounded-md font-bold">
              FREE
            </span>
          </button>
          <LanguageSelector />
          <StoreStatusButton />
          <Link to="/onboarding" className="btn-primary text-xs !py-1.5 !px-2.5 hidden xl:flex items-center gap-1">
            <i className="fa-solid fa-list-check"></i> {t('setup', 'Setup')}
          </Link>
          <Link to="/settings" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-xs font-bold text-gray-700 bg-white">
            <i className="fa-solid fa-store text-green-700"></i> 
            <span className="hidden sm:inline">{t('storeAccount', 'Store Account')}</span>
          </Link>
        </div>
      </div>

      {/* Mobile quick horizontal tab strip */}
      <div className="lg:hidden px-3 py-1.5 border-t border-gray-100 flex gap-2 overflow-x-auto hide-scroll text-xs bg-gray-50/50">
        <button 
          type="button"
          onClick={() => setIsCopilotOpen(true)}
          className="px-3 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold whitespace-nowrap text-xs shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
        >
          <i className="fa-solid fa-wand-magic-sparkles text-amber-300 text-xs"></i> {t('aiCopilot', 'AI Copilot')}
        </button>
        <Link to="/" className="px-3 py-1 rounded-full bg-white border border-gray-200 font-bold whitespace-nowrap text-green-800">
          <i className="fa-solid fa-house mr-1 text-green-600"></i> {t('navDashboard', 'Dashboard')}
        </Link>
        <Link to="/pos" className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 font-bold whitespace-nowrap text-indigo-800">
          <i className="fa-solid fa-cash-register mr-1 text-indigo-600"></i> {t('navPOS', 'POS')}
        </Link>
        <Link to="/orders" className="px-3 py-1 rounded-full bg-white border border-gray-200 font-bold whitespace-nowrap text-gray-700">
          <i className="fa-solid fa-bag-shopping mr-1 text-green-600"></i> {t('navAppOrders', 'Orders')}
        </Link>
        <Link to="/products" className="px-3 py-1 rounded-full bg-white border border-gray-200 font-bold whitespace-nowrap text-gray-700">
          <i className="fa-solid fa-box mr-1 text-emerald-600"></i> {t('navMyProducts', 'Products')}
        </Link>
        <Link to="/finance" className="px-3 py-1 rounded-full bg-white border border-gray-200 font-bold whitespace-nowrap text-gray-700">
          <i className="fa-solid fa-wallet mr-1 text-emerald-600"></i> {t('navMoneyCredit', 'Finance')}
        </Link>
      </div>
      <AiCopilotDrawer isOpen={isCopilotOpen} onClose={() => setIsCopilotOpen(false)} />
    </header>
  );
}
