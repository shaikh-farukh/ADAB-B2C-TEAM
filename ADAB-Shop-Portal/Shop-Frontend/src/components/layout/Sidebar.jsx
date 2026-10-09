import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSeller } from '../../context/SellerContext';

export default function Sidebar() {
  const { store } = useSeller();
  const storeName = store?.store_name || 'My Store';
  const initial = (storeName || 'S').substring(0, 2).toUpperCase();

  const navClass = ({ isActive }) =>
    `${isActive ? 'nav-on ' : 'text-gray-700 hover:bg-gray-100 '}w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition`;

  const posClass = ({ isActive }) =>
    `${isActive ? 'nav-on font-bold ' : 'text-gray-700 hover:bg-indigo-50/70 hover:text-indigo-900 '}w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition`;

  const closeDrawer = () => {
    const drawer = document.getElementById('sellerDrawer');
    if (drawer) drawer.classList.remove('open');
    const overlay = document.getElementById('drawerOverlaySeller');
    if (overlay) overlay.classList.remove('open');
  };

  return (
    <aside id="sellerDrawer" className="mobile-seller-drawer lg:static lg:transform-none lg:w-60 lg:p-0 lg:bg-transparent lg:shadow-none shrink-0">
      <div className="lg:hidden flex items-center justify-between pb-3 mb-2 border-b border-gray-100">
        <div className="font-extrabold text-base flex items-center gap-2 text-green-900">
          <div className="w-7 h-7 rounded-lg bg-green-700 text-white flex items-center justify-center text-sm">A</div> 
          ADAB Seller
        </div>
        <button 
          onClick={closeDrawer}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"
          aria-label="Close navigation"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <nav 
        onClick={(e) => {
          if (e.target.closest('a')) closeDrawer();
        }}
        className="card p-2.5 text-sm sticky top-20 sidebar-scroll shadow-sm border border-gray-200/80 space-y-1"
      >
        {/* Store Quick Profile Badge in Sidebar */}
        <div className="p-2.5 mb-2 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-extrabold flex items-center justify-center text-xs shrink-0 shadow-sm">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-xs text-emerald-950 truncate" id="sidebarStoreName">
              {storeName}
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Verified Merchant
            </div>
          </div>
        </div>

        {/* 1. MAIN */}
        <div className="nav-label" data-i18n="navHome">Main</div>
        <NavLink to="/" className={navClass}>
          <i className="fa-solid fa-house w-4 text-emerald-600"></i> <span data-i18n="navDashboard">Dashboard</span>
        </NavLink>
        <NavLink to="/pos" className={posClass}>
          <i className="fa-solid fa-cash-register w-4 text-indigo-600"></i> <span data-i18n="navPOS">Bill Counter (POS)</span>
          <span className="ml-auto text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">Fast</span>
        </NavLink>
        <NavLink to="/onboarding" className={navClass}>
          <i className="fa-solid fa-clipboard-check w-4 text-emerald-600"></i> <span>Store KYC Stepper</span>
          <span className="ml-auto bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">KYC</span>
        </NavLink>
        <NavLink to="/regstatus" className={navClass}>
          <i className="fa-solid fa-clock-rotate-left w-4 text-blue-600"></i> <span>Application Tracker</span>
          <span id="navRegStatusDot" className="ml-auto w-2 h-2 rounded-full bg-emerald-500"></span>
        </NavLink>

        {/* 2. SELL & DISPATCH */}
        <div className="nav-label pt-2" data-i18n="navSell">Sell & Orders</div>
        <NavLink to="/orders" className={navClass}>
          <i className="fa-solid fa-bag-shopping w-4 text-emerald-600"></i> <span data-i18n="navAppOrders">App Orders</span>
          <span className="ml-auto bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">14</span>
        </NavLink>
        <NavLink to="/partner" className={navClass}>
          <i className="fa-solid fa-store w-4 text-orange-600"></i> <span data-i18n="navStoreOrders">B2B Store Orders</span>
          <span className="ml-auto bg-orange-100 text-orange-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">8</span>
        </NavLink>
        <NavLink to="/products" className={navClass}>
          <i className="fa-solid fa-boxes-stacked w-4 text-purple-600"></i> <span data-i18n="navMyProducts">My Products Catalog</span>
        </NavLink>
        <NavLink to="/create" className={navClass}>
          <i className="fa-solid fa-circle-plus w-4 text-emerald-600"></i> <span data-i18n="navCreate">Add New Product</span>
        </NavLink>
        <NavLink to="/returns" className={navClass}>
          <i className="fa-solid fa-rotate-left w-4 text-rose-500"></i> <span data-i18n="navReturns">Returns & Refunds</span>
          <span className="ml-auto bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">3</span>
        </NavLink>

        {/* 3. BUY STOCK & CATALOG */}
        <div className="nav-label pt-2" data-i18n="navBuy">Buy & Restock</div>
        <NavLink to="/mastersearch" className={navClass}>
          <i className="fa-solid fa-magnifying-glass w-4 text-blue-600"></i> <span data-i18n="navMasterSearch">Search & Buy</span>
        </NavLink>
        <NavLink to="/buy" className={navClass}>
          <i className="fa-solid fa-map-pin w-4 text-teal-600"></i> <span data-i18n="navBuyNearby">Nearby Kiranas</span>
        </NavLink>
        <NavLink to="/catalog" className={navClass}>
          <i className="fa-solid fa-book-open w-4 text-indigo-600"></i> <span data-i18n="navMasterCat">National FMCG Catalog</span>
        </NavLink>
        <NavLink to="/partnerbrands" className={navClass}>
          <i className="fa-solid fa-handshake w-4 text-amber-600"></i> <span data-i18n="navPartnerPack">Partner Brands</span>
        </NavLink>
        <NavLink to="/buycart" className={navClass}>
          <i className="fa-solid fa-cart-shopping w-4 text-blue-600"></i> <span>Purchase Cart</span>
          <span id="navBuyCartBadge" className="ml-auto bg-blue-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">0</span>
        </NavLink>

        {/* 4. FINANCIALS & PAYMENTS */}
        <div className="nav-label pt-2" data-i18n="navMoney">Finance & Credit</div>
        <NavLink to="/finance" className={navClass}>
          <i className="fa-solid fa-wallet w-4 text-emerald-600"></i> <span data-i18n="navMoneyCredit">Bank Payouts & Money</span>
        </NavLink>
        <NavLink to="/credit-apply" className={navClass}>
          <i className="fa-solid fa-building-columns w-4 text-purple-600"></i> <span>Bank Credit Lines</span>
          <span className="ml-auto text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800">0% Int</span>
        </NavLink>
        <NavLink to="/creditterms" className={navClass}>
          <i className="fa-solid fa-handshake-angle w-4 text-teal-600"></i> <span>Store Credit Rules</span>
        </NavLink>
        <NavLink to="/points" className={navClass}>
          <i className="fa-solid fa-star w-4 text-amber-500"></i> <span data-i18n="navPoints">Reward Points</span>
        </NavLink>
        <NavLink to="/marketing" className={navClass}>
          <i className="fa-solid fa-ticket w-4 text-rose-500"></i> <span>Coupons & Promos</span>
        </NavLink>
        <NavLink to="/pricing" className={navClass}>
          <i className="fa-solid fa-tags w-4 text-purple-600"></i> <span>Pricing Schedules</span>
        </NavLink>

        {/* 5. LOGISTICS & OPERATIONS */}
        <div className="nav-label pt-2" data-i18n="navMore">Operations</div>
        <NavLink to="/delivery" className={navClass}>
          <i className="fa-solid fa-motorcycle w-4 text-emerald-600"></i> <span data-i18n="navDelivery">Delivery Fleet</span>
        </NavLink>
        <NavLink to="/zones" className={navClass}>
          <i className="fa-solid fa-map-location-dot w-4 text-blue-600"></i> <span>Delivery Zones</span>
        </NavLink>
        <NavLink to="/freight" className={navClass}>
          <i className="fa-solid fa-truck-ramp-box w-4 text-amber-600"></i> <span>Freight & Logistics</span>
        </NavLink>
        <NavLink to="/messages" className={navClass}>
          <i className="fa-solid fa-comments w-4 text-indigo-600"></i> <span data-i18n="navMessages">Store Messages</span>
          <span className="ml-auto bg-indigo-100 text-indigo-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">5</span>
        </NavLink>
        <NavLink to="/recommendations" className={navClass}>
          <i className="fa-solid fa-wand-magic-sparkles w-4 text-purple-600"></i> <span data-i18n="navRecommend">AI Insights</span>
        </NavLink>
        <NavLink to="/reports" className={navClass}>
          <i className="fa-solid fa-chart-line w-4 text-teal-600"></i> <span data-i18n="navReports">Sales Reports</span>
        </NavLink>
        <NavLink to="/settings" className={navClass}>
          <i className="fa-solid fa-gear w-4 text-gray-500"></i> <span data-i18n="navSettings">Store Settings</span>
        </NavLink>

        {/* 6. EXPANDABLE MORE UTILITIES */}
        <details className="mt-2 px-1 border-t border-gray-100 pt-1.5">
          <summary className="text-xs font-extrabold text-gray-400 hover:text-gray-700 cursor-pointer py-1 flex items-center justify-between" data-i18n="navShowMore">
            <span>More Utilities</span> <i className="fa-solid fa-chevron-down text-[10px]"></i>
          </summary>
          <div className="space-y-0.5 mt-1">
            <NavLink to="/" className={({ isActive }) => `${isActive ? 'nav-on font-bold ' : 'text-gray-600 hover:bg-gray-100 '}w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center`}>Order History Archive</NavLink>
            <NavLink to="/" className={({ isActive }) => `${isActive ? 'nav-on font-bold ' : 'text-gray-600 hover:bg-gray-100 '}w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center`}>Customer Ratings &amp; Reviews</NavLink>
            <NavLink to="/" className={({ isActive }) => `${isActive ? 'nav-on font-bold ' : 'text-gray-600 hover:bg-gray-100 '}w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center`}>Help &amp; Support</NavLink>
            <NavLink to="/" className={({ isActive }) => `${isActive ? 'nav-on font-bold ' : 'text-gray-600 hover:bg-gray-100 '}w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center`}>Merchant FAQ</NavLink>
            <NavLink to="/" className={({ isActive }) => `${isActive ? 'nav-on font-bold ' : 'text-gray-600 hover:bg-gray-100 '}w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center`}>Driver Management</NavLink>
            <NavLink to="/" className={({ isActive }) => `${isActive ? 'nav-on font-bold ' : 'text-gray-600 hover:bg-gray-100 '}w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center`}>Export &amp; IEC Trade</NavLink>
            <NavLink to="/" className={({ isActive }) => `${isActive ? 'nav-on font-bold ' : 'text-gray-600 hover:bg-gray-100 '}w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center`}>Certificates &amp; FSSAI</NavLink>
            <NavLink to="/" className={({ isActive }) => `${isActive ? 'nav-on font-bold ' : 'text-gray-600 hover:bg-gray-100 '}w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center`}>Store Health &amp; Audits</NavLink>
            <NavLink to="/" className={({ isActive }) => `${isActive ? 'nav-on font-bold ' : 'text-gray-600 hover:bg-gray-100 '}w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center`}>Notifications Log</NavLink>
          </div>
        </details>
      </nav>
    </aside>
  );
}
