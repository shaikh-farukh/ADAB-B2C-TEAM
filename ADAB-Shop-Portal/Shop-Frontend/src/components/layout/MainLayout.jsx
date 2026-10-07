import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { SellerProvider } from '../../context/SellerContext';

export default function MainLayout() {
  return (
    <SellerProvider>
      <div className="bg-gray-50 text-gray-800 min-h-screen">
        <Header />
        
        <div className="w-full px-4 sm:px-6 py-4 sm:py-5 flex flex-col lg:flex-row gap-5">
          <Sidebar />
          
          <main className="flex-1 min-w-0 space-y-5 fade-in" id="mainArea">
            <Outlet />
          </main>
        </div>
      </div>
    </SellerProvider>
  );
}
