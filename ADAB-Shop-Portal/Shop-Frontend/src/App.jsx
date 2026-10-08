import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Products from './pages/Products';
import Marketing from './pages/Marketing';
import Pricing from './pages/Pricing';
import sellerService from './services/sellerService';
import Settings from './pages/Settings';
import HomePage from './pages/HomePage';
import NotificationBell from './components/NotificationBell';
import PlaceholderPage from './components/common/PlaceholderPage';
import { SellerProvider } from './context/SellerContext';

// Mayank's Domain Pages
import OrdersPage from './pages/OrdersPage';
import POSPage from './pages/POSPage';
import PartnerPage from './pages/PartnerPage';
import DeliveryPage from './pages/DeliveryPage';
import ZonesPage from './pages/ZonesPage';
import FinancePage from './pages/FinancePage';
import CreditApplyPage from './pages/CreditApplyPage';
import OnboardingPage from './pages/OnboardingPage';
import RegStatusPage from './pages/RegStatusPage';
import ReturnsPage from './pages/ReturnsPage';
import MasterSearchPage from './pages/MasterSearchPage';
import BuyNearbyPage from './pages/BuyNearbyPage';
import BuyCartPage from './pages/BuyCartPage';
import CreditTermsPage from './pages/CreditTermsPage';
import PointsPage from './pages/PointsPage';
import FreightPage from './pages/FreightPage';
import MessagesPage from './pages/MessagesPage';
import RecommendationsPage from './pages/RecommendationsPage';
import ReportsPage from './pages/ReportsPage';

// --- LAYOUT COMPONENTS ---
const SidebarItem = ({ to, icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold mb-1 transition-colors ${isActive ? 'nav-on' : 'text-gray-600 hover:bg-gray-100'}`}
    >
      <i className={`fa-solid ${icon} w-5 text-center ${isActive ? 'text-brand-dark' : 'text-gray-400'}`}></i>
      <span className="text-sm">{label}</span>
    </Link>
  );
};

const MainLayout = ({ children, store, profile }) => {
  const storeName = store?.store_name || 'Shri Balaji Store';
  const initial = store?.store_name ? store.store_name.substring(0, 2).toUpperCase() : 'SB';

  return (
    <div className="bg-gray-50 text-gray-800 min-h-screen">
      
      {/* Top Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="w-full px-4 lg:px-6 py-3 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button className="lg:hidden w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 text-lg">
              <i className="fa-solid fa-bars"></i>
            </button>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-dark text-white flex items-center justify-center font-extrabold text-base sm:text-lg">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div>
              <div className="font-extrabold text-gray-900 leading-tight text-sm sm:text-base">ADAB Seller</div>
              <div className="text-xs text-gray-400 hidden xs:block truncate max-w-[120px] sm:max-w-none">{storeName}</div>
            </div>
          </div>
          
          <div className="flex-1 min-w-[130px] max-w-lg mx-1">
            <div className="relative">
              <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 text-xs sm:text-sm"></i>
              <input type="search" placeholder="Search anything to buy from stores..." className="w-full pl-8 sm:pl-9 pr-14 sm:pr-20 py-2 sm:py-2.5 rounded-xl border-2 border-blue-100 text-xs sm:text-sm outline-none focus:border-blue-500 bg-blue-50/50" />
              <button className="absolute right-1 top-1/2 -translate-y-1/2 btn-primary !text-[10px] sm:!text-xs !py-1 sm:!py-1.5 !px-2 sm:!px-3 bg-brand-dark text-white rounded-lg font-bold">Search</button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button className="hidden xl:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-xs font-bold text-amber-900">
              <i className="fa-solid fa-volume-high text-amber-600"></i>
              <span className="hidden md:inline">Soundbox: ON</span>
            </button>
            <button className="hidden lg:flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm font-bold text-gray-700">
              <i className="fa-solid fa-globe text-green-700"></i> EN <i className="fa-solid fa-chevron-down text-[9px] text-gray-400"></i>
            </button>
            <Link to="/buycart" className="relative hidden xl:flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full bg-blue-50 text-blue-800 text-xs sm:text-sm font-bold border border-blue-200">
              <i className="fa-solid fa-cart-shopping"></i> <span className="hidden md:inline">Buy Cart</span>
            </Link>
            <button className="hidden lg:flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-full bg-green-50 text-green-800 text-xs sm:text-sm font-bold border border-green-200">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Open
            </button>
            <NotificationBell />
            <Link to="/settings" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors">
              <i className="fa-solid fa-store text-green-700"></i> <span className="hidden sm:inline">Store Account</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="w-full px-4 lg:px-6 py-4 sm:py-5 flex flex-col lg:flex-row gap-6">
        
        {/* Sidebar */}
        <aside className="hidden lg:block lg:w-60 lg:p-0 shrink-0">
          <nav className="card p-2.5 text-sm sticky top-20 shadow-sm border border-gray-200/80 space-y-1 bg-white rounded-xl max-h-[calc(100vh-100px)] overflow-y-auto">
            {/* Store Quick Profile Badge */}
            <div className="p-2.5 mb-2 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-extrabold flex items-center justify-center text-xs shrink-0 shadow-sm">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-xs text-emerald-950 truncate">{storeName}</div>
                <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Verified Merchant
                </div>
              </div>
            </div>

            {/* Nav Sections */}
            <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider px-3 pb-1 pt-2">Home</div>
            <SidebarItem to="/" icon="fa-house" label="Dashboard" />
            <SidebarItem to="/pos" icon="fa-cash-register" label={<span className="flex items-center justify-between w-full">Bill Counter <span className="bg-indigo-100 text-indigo-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">Fast</span></span>} />
            <SidebarItem to="/onboarding" icon="fa-clipboard-check" label={<span className="flex items-center justify-between w-full">Store KYC Stepper <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">KYC</span></span>} />
            <SidebarItem to="/regstatus" icon="fa-clock-rotate-left" label={<span className="flex items-center justify-between w-full">Application Tracker <span className="w-2 h-2 rounded-full bg-emerald-500"></span></span>} />

            <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider px-3 pb-1 pt-4">Sell & Orders</div>
            <SidebarItem to="/orders" icon="fa-bag-shopping" label={<span className="flex items-center justify-between w-full">App Orders <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">14</span></span>} />
            <SidebarItem to="/partner" icon="fa-store" label={<span className="flex items-center justify-between w-full">B2B Store Orders <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">8</span></span>} />
            <SidebarItem to="/products" icon="fa-boxes-stacked" label={<span className="text-gray-700 font-bold">My Products</span>} />
            <SidebarItem to="/create" icon="fa-circle-plus" label="Add New Product" />
            <SidebarItem to="/returns" icon="fa-rotate-left" label={<span className="flex items-center justify-between w-full">Returns <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">3</span></span>} />

            <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider px-3 pb-1 pt-4">Finance & Operations</div>
            <SidebarItem to="/finance" icon="fa-wallet" label="Bank Payouts" />
            <SidebarItem to="/delivery" icon="fa-motorcycle" label="Delivery Fleet" />
            <SidebarItem to="/messages" icon="fa-comments" label="Store Messages" />
            <SidebarItem to="/reports" icon="fa-chart-line" label="Sales Reports" />

            <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider px-3 pb-1 pt-4">Offers & Pricing</div>
            <SidebarItem to="/marketing" icon="fa-ticket" label="Coupons & Promos" />
            <SidebarItem to="/pricing" icon="fa-tags" label="Pricing Schedules" />

            <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider px-3 pb-1 pt-4">Buy Stock</div>
            <SidebarItem to="/mastersearch" icon="fa-magnifying-glass" label="Search & Buy" />
          </nav>
        </aside>
        
        {/* Main Content Area */}
        <main className="flex-1 min-w-0 fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

// --- APP ENTRY ---
function App() {
  const [profile, setProfile] = useState(null);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSellerData = async () => {
      try {
        const [profileRes, storeRes] = await Promise.all([
          sellerService.getProfile().catch(() => ({ data: null })),
          sellerService.getStore().catch(() => ({ data: null }))
        ]);
        setProfile(profileRes.data);
        setStore(storeRes.data);
      } catch (err) {
        console.error('Error fetching seller data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSellerData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading Store Portal...</div>;
  }

  return (
    <BrowserRouter>
      <SellerProvider>
        <MainLayout profile={profile} store={store}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<Products />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/marketing" element={<Marketing />} />
            <Route path="/settings" element={<Settings />} />

            {/* Mayank's Routes */}
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/pos" element={<POSPage />} />
            <Route path="/partner" element={<PartnerPage />} />
            <Route path="/delivery" element={<DeliveryPage />} />
            <Route path="/zones" element={<ZonesPage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/credit-apply" element={<CreditApplyPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/regstatus" element={<RegStatusPage />} />
            <Route path="/returns" element={<ReturnsPage />} />
            <Route path="/mastersearch" element={<MasterSearchPage />} />
            <Route path="/buy" element={<BuyNearbyPage />} />
            <Route path="/buycart" element={<BuyCartPage />} />
            <Route path="/creditterms" element={<CreditTermsPage />} />
            <Route path="/points" element={<PointsPage />} />
            <Route path="/freight" element={<FreightPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/reports" element={<ReportsPage />} />

            {/* Catalog & Brand expansions */}
            <Route 
              path="/create" 
              element={
                <PlaceholderPage 
                  title="Add New Product (Studio)" 
                  fileName="CreateProductPage.jsx" 
                  description="Fast product creation with barcode scanner, photo upload, category, price, and GST slab." 
                />
              } 
            />
            <Route 
              path="/catalog" 
              element={
                <PlaceholderPage 
                  title="National FMCG Catalog" 
                  fileName="CatalogPage.jsx" 
                  description="5,000+ FMCG national master catalog with 1-click addition to seller inventory." 
                />
              } 
            />
            <Route 
              path="/partnerbrands" 
              element={
                <PlaceholderPage 
                  title="Partner Brands & Packs" 
                  fileName="PartnerBrandsPage.jsx" 
                  description="White-label and manufacturer packs from other registered merchant brands." 
                />
              } 
            />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MainLayout>
      </SellerProvider>
    </BrowserRouter>
  );
}

export default App;
