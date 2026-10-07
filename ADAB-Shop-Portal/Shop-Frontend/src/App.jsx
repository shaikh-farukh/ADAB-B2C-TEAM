import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import PlaceholderPage from './components/common/PlaceholderPage';

// Mayank's Implemented Domain Pages
import HomePage from './pages/HomePage';
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
import OffersPage from './pages/OffersPage';
import FreightPage from './pages/FreightPage';
import MessagesPage from './pages/MessagesPage';
import RecommendationsPage from './pages/RecommendationsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          {/* Main Dashboard */}
          <Route index element={<HomePage />} />
          
          {/* Mayank's Domain */}
          <Route path="orders" element={<OrdersPage />} />
          <Route path="pos" element={<POSPage />} />
          <Route path="partner" element={<PartnerPage />} />
          <Route path="delivery" element={<DeliveryPage />} />
          <Route path="zones" element={<ZonesPage />} />
          <Route path="finance" element={<FinancePage />} />
          <Route path="credit-apply" element={<CreditApplyPage />} />
          <Route path="onboarding" element={<OnboardingPage />} />
          <Route path="regstatus" element={<RegStatusPage />} />
          <Route path="returns" element={<ReturnsPage />} />
          
          {/* Buy & Restock Pages */}
          <Route path="mastersearch" element={<MasterSearchPage />} />
          <Route path="buy" element={<BuyNearbyPage />} />
          <Route path="buycart" element={<BuyCartPage />} />

          {/* Finance & Credit Pages */}
          <Route path="creditterms" element={<CreditTermsPage />} />
          <Route path="points" element={<PointsPage />} />
          <Route path="offers" element={<OffersPage />} />

          {/* Operations & Utilities Pages */}
          <Route path="freight" element={<FreightPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="recommendations" element={<RecommendationsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />

          {/* Shabbir's Domain Routes with Dedicated Notice */}
          <Route 
            path="products" 
            element={
              <PlaceholderPage 
                title="My Products Catalog" 
                fileName="ProductsPage.jsx" 
                description="Product inventory listings, stock quantity adjustment, pricing, barcodes, and low-stock alerts." 
              />
            } 
          />
          <Route 
            path="create" 
            element={
              <PlaceholderPage 
                title="Add New Product (Studio)" 
                fileName="CreateProductPage.jsx" 
                description="Fast product creation with barcode scanner, photo upload, category, price, and GST slab." 
              />
            } 
          />
          <Route 
            path="catalog" 
            element={
              <PlaceholderPage 
                title="National FMCG Catalog" 
                fileName="CatalogPage.jsx" 
                description="5,000+ FMCG national master catalog with 1-click addition to seller inventory." 
              />
            } 
          />
          <Route 
            path="partnerbrands" 
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
