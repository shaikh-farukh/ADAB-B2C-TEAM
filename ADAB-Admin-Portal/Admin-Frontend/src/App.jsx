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

export default function App() {
  const [loadingToken, setLoadingToken] = React.useState(!localStorage.getItem('token'));

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      apiClient.post('/dev-login').then(res => {
        if (res.data.token) {
          localStorage.setItem('token', res.data.token);
        }
      }).catch(err => console.error('Auto-login failed', err))
        .finally(() => setLoadingToken(false));
    }
  }, []);

  if (loadingToken) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">Initializing Admin Session...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
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
