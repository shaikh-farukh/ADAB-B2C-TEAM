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
import { SocketProvider } from './context/SocketProvider';
import GlobalBulkUploadWidget from './components/GlobalBulkUploadWidget';

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
import Sidebar from './components/layout/Sidebar';

const MainLayout = ({ children, store, profile }) => {
  const storeName = store?.store_name || 'Shri Balaji Store';
  const initial = store?.store_name ? store.store_name.substring(0, 2).toUpperCase() : 'SB';

  return (
    <div className="bg-gray-50 text-gray-800 min-h-screen">
      
      {/* Mobile Drawer Overlay */}
      <div 
        id="drawerOverlaySeller" 
        className="mobile-seller-overlay" 
        onClick={() => {
          document.getElementById('sellerDrawer')?.classList.remove('open');
          document.getElementById('drawerOverlaySeller')?.classList.remove('open');
        }}
      ></div>

      {/* Top Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="w-full px-4 lg:px-6 py-3 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button 
              onClick={() => {
                const drawer = document.getElementById('sellerDrawer');
                const overlay = document.getElementById('drawerOverlaySeller');
                drawer?.classList.toggle('open');
                overlay?.classList.toggle('open');
              }}
              className="lg:hidden w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 text-lg hover:bg-gray-200 transition"
              aria-label="Toggle navigation menu"
            >
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
        <Sidebar />
        
        {/* Main Content Area */}
        <main className="flex-1 min-w-0 fade-in">
          {children}
        </main>
      </div>

      <GlobalBulkUploadWidget />
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
      <SocketProvider>
        <SellerProvider>
          <MainLayout profile={profile} store={store}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<Products />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/marketing" element={<Marketing />} />
              <Route path="/offers" element={<Marketing />} />
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
      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;
