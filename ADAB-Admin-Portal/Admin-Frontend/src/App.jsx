import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import apiClient from './api/apiClient';
import AdminLayout from './components/layout/AdminLayout';
import Dashboard from './pages/Dashboard';
import ApprovalQueue from './pages/ApprovalQueue';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Brands from './pages/Brands';
import Sellers from './pages/Sellers';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import Returns from './pages/Returns';
import Offers from './pages/Offers';
import Reports from './pages/Reports';
import AuditLog from './pages/AuditLog';
import Settings from './pages/Settings';
import ProductCatalog from './pages/ProductCatalog';
import Login from './pages/Login';

export default function App() {
  const [loadingToken, setLoadingToken] = React.useState(false);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="approvals" element={<ApprovalQueue />} />
          <Route path="products" element={<Products />} />
          <Route path="categories" element={<Categories />} />
          <Route path="brands" element={<Brands />} />
          <Route path="offers" element={<Offers />} />
          <Route path="orders" element={<Orders />} />
          <Route path="returns" element={<Returns />} />
          <Route path="productcatalog" element={<ProductCatalog />} />
          <Route path="sellers" element={<Sellers />} />
          <Route path="customers" element={<Customers />} />
          <Route path="reports" element={<Reports />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
