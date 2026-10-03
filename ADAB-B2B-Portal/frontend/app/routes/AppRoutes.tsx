import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../layout/AppLayout';
import RoleGuard from '../guards/RoleGuard';
import { useAuthStore } from '../../store/useAuthStore';

// Page Placeholders (Phase 1 & 2)
import AuthPages from '../../pages/auth';
import ManufacturerPages from '../../pages/manufacturer';
import ProfilePage from '../../pages/manufacturer/ProfilePage';
import ProductListPage from '../../pages/manufacturer/ProductListPage';
import ProductManagementPage from '../../pages/manufacturer/ProductManagementPage';
import ProductDetailsPage from '../../pages/manufacturer/ProductDetailsPage';
import ProductEditPage from '../../pages/manufacturer/ProductEditPage';
import DistributorRequestPage from '../../pages/manufacturer/DistributorRequestPage';
import DistributorListPage from '../../pages/manufacturer/DistributorListPage';
import DistributorDetailPage from '../../pages/manufacturer/DistributorDetailPage';
import OrderListPage from '../../pages/manufacturer/OrderListPage';
import OrderDetailPageManufacturer from '../../pages/manufacturer/OrderDetailPage';
import SettlementsPage from '../../pages/manufacturer/SettlementsPage';
import CampaignsPage from '../../pages/manufacturer/CampaignsPage';
import LogisticsProvidersPage from '../../pages/manufacturer/LogisticsProvidersPage';
import DriversPage from '../../pages/manufacturer/DriversPage';
import VehiclesPage from '../../pages/manufacturer/VehiclesPage';
import AgingReportPage from '../../pages/manufacturer/AgingReportPage';
import LedgerStatementPage from '../../pages/manufacturer/LedgerStatementPage';
import ReconciliationDashboardPage from '../../pages/manufacturer/ReconciliationDashboardPage';
import ManufacturerAuditLogsPage from '../../pages/manufacturer/AuditLogsPage';
import DistributorPages from '../../pages/distributor';
import DistributorProfilePage from '../../pages/distributor/DistributorProfilePage';
import ManufacturerListPage from '../../pages/distributor/ManufacturerListPage';
import RequestStatusPage from '../../pages/distributor/RequestStatusPage';
import ProductCatalogPage from '../../pages/distributor/ProductCatalogPage';
import CartPage from '../../pages/distributor/CartPage';
import OrderHistoryPage from '../../pages/distributor/OrderHistoryPage';
import OrderDetailPageDistributor from '../../pages/distributor/OrderDetailPage';
import PaymentsPage from '../../pages/distributor/PaymentsPage';
import InventoryPage from '../../pages/distributor/InventoryPage';
import DistributorShopOrdersPage from '../../pages/distributor/ShopOrdersPage';
import ManufacturerDetailPage from '../../pages/distributor/ManufacturerDetailPage';
import ProductDetailPage from '../../pages/distributor/ProductDetailPage';
import DistributorAuditLogsPage from '../../pages/distributor/AuditLogsPage';
import CommonPages from '../../pages/common';
import ShopsByAreaPage from '../../pages/common/ShopsByAreaPage';
import ProductAvailabilityPage from '../../pages/common/ProductAvailabilityPage';
import AuditLogsPage from '../../pages/admin/AuditLogsPage';
import TerritoryManagementPage from '../../pages/distributor/TerritoryManagement';
import ShopsNearMePage from '../../pages/discovery/ShopsNearMePage';
import FeaturedShopsPage from '../../pages/discovery/FeaturedShopsPage';
import AdminDashboardPage from '../../pages/admin/AdminDashboardPage';
import KycApprovalsPage from '../../pages/admin/KycApprovalsPage';
import PlatformFeeSettingsPage from '../../pages/admin/PlatformFeeSettingsPage';

/**
 * Root redirection logic based on user role.
 */
const HomeRedirect = () => {
  const { role, isLoggedIn } = useAuthStore();
  
  if (!isLoggedIn) return <Navigate to="/auth" replace />;
  
  if (role === 'manufacturer') {
    return <Navigate to="/manufacturer/dashboard" replace />;
  } else if (role === 'distributor') {
    return <Navigate to="/distributor/dashboard" replace />;
  } else if (role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  } else {
    return <Navigate to="/auth" replace />;
  }
};

/**
 * Responsibility: Main application router.
 * Defines the mapping between URLs and UI components.
 */
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public/Auth Routes */}
      <Route path="/auth/*" element={<AuthPages />} />

      {/* Root Path Redirection */}
      <Route path="/" element={<HomeRedirect />} />

      {/* Main App Layout Wrapped Routes */}
      <Route element={<AppLayout />}>
        {/* Manufacturer Module */}
        <Route
          path="/manufacturer/*"
          element={
            <RoleGuard allowedRole="manufacturer">
              <Routes>
                <Route path="dashboard" element={<ManufacturerPages />} />
                <Route path="profile-setup" element={<ProfilePage />} />
                <Route path="products" element={<ProductListPage />} />
                <Route path="products/view/:id" element={<ProductDetailsPage />} />
                <Route path="products/edit/:id" element={<ProductEditPage />} />
                <Route path="product-management" element={<ProductManagementPage />} />
                <Route path="orders" element={<OrderListPage />} />
                <Route path="orders/view/:id" element={<OrderDetailPageManufacturer />} />
                <Route path="aging-report" element={<AgingReportPage />} />
                <Route path="ledger" element={<LedgerStatementPage />} />
                <Route path="reconciliation" element={<ReconciliationDashboardPage />} />
                <Route path="settlements" element={<SettlementsPage />} />
                <Route path="requests" element={<DistributorRequestPage />} />
                <Route path="distributors" element={<DistributorListPage />} />
                <Route path="distributors/view/:id" element={<DistributorDetailPage />} />
                <Route path="campaigns" element={<CampaignsPage />} />
                <Route path="logistics" element={<LogisticsProvidersPage />} />
                <Route path="drivers" element={<DriversPage />} />
                <Route path="vehicles" element={<VehiclesPage />} />
                <Route path="audit-logs" element={<ManufacturerAuditLogsPage />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </RoleGuard>
          }
        />

        {/* Distributor Module */}
        <Route
          path="/distributor/*"
          element={
            <RoleGuard allowedRole="distributor">
              <Routes>
                <Route path="dashboard" element={<DistributorPages />} />
                <Route path="profile-setup" element={<DistributorProfilePage />} />
                <Route path="manufacturers" element={<ManufacturerListPage />} />
                <Route path="manufacturers/:id" element={<ManufacturerDetailPage />} />
                <Route path="request-status" element={<RequestStatusPage />} />
                <Route path="catalog" element={<ProductCatalogPage />} />
                <Route path="catalog/view/:id" element={<ProductDetailPage />} />
                <Route path="cart" element={<CartPage />} />
                <Route path="orders" element={<OrderHistoryPage />} />
                <Route path="orders/view/:id" element={<OrderDetailPageDistributor />} />
                <Route path="payments" element={<PaymentsPage />} />
                <Route path="ledger" element={<LedgerStatementPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="shop-orders" element={<DistributorShopOrdersPage />} />
                <Route path="territory" element={<TerritoryManagementPage />} />
                <Route path="logistics" element={<LogisticsProvidersPage />} />
                <Route path="drivers" element={<DriversPage />} />
                <Route path="vehicles" element={<VehiclesPage />} />
                <Route path="audit-logs" element={<DistributorAuditLogsPage />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </RoleGuard>
          }
        />

        {/* Common Shared Module */}
        <Route path="/common/*" element={<CommonPages />} />
        
        {/* Discovery Routes */}
        <Route path="/discovery/area" element={<ShopsByAreaPage />} />
        <Route path="/discovery/product" element={<ProductAvailabilityPage />} />
        <Route path="/discovery/shops-near-me" element={<ShopsNearMePage />} />
        <Route path="/discovery/featured-shops" element={<FeaturedShopsPage />} />

        {/* Admin Module */}
        <Route
          path="/admin/*"
          element={
            <RoleGuard allowedRole="admin">
              <Routes>
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="kyc-approvals" element={<KycApprovalsPage />} />
                <Route path="platform-settings" element={<PlatformFeeSettingsPage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </RoleGuard>
          }
        />
      </Route>


      {/* Catch All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
