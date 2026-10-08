import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import apiClient from './api/apiClient';
import AdminLayout from './components/layout/AdminLayout';
import Dashboard from './pages/Dashboard';
import ApprovalQueue from './pages/ApprovalQueue';
import Sellers from './pages/Sellers';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Audit from './pages/Audit';
import Settings from './pages/Settings';
import ProductCatalog from './pages/ProductCatalog';

export default function App() {
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      apiClient.post('/dev-login').then(res => {
        if (res.data.token) {
          localStorage.setItem('token', res.data.token);
          window.location.reload();
        }
      }).catch(err => console.error('Auto-login failed', err));
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="approvals" element={<ApprovalQueue />} />
          <Route path="products" element={<ProductCatalog />} />
          <Route path="sellers" element={<Sellers />} />
          <Route path="customers" element={<Customers />} />
          <Route path="reports" element={<Reports />} />
          <Route path="audit" element={<Audit />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
