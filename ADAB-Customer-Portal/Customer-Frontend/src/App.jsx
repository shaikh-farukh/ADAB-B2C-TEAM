import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ShoppingCart, User, Search, Home } from 'lucide-react';
import HomePage from './pages/HomePage';
import BrowsePage from './pages/BrowsePage';

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-black text-brand-green tracking-tight">ADAB</span>
            <span className="text-sm font-semibold text-gray-500 hidden sm:block">Customer</span>
          </Link>
          
          <div className="flex-1 max-w-2xl mx-8 hidden md:block">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search for fresh groceries, fashion, electronics..."
                className="w-full bg-gray-100 border-transparent focus:bg-white focus:border-brand-green focus:ring-2 focus:ring-brand-light rounded-xl py-2.5 pl-10 pr-4 text-sm transition-all"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
            </div>
          </div>

          <nav className="flex items-center gap-6">
            <Link to="/" className="text-gray-600 hover:text-brand-green flex flex-col items-center gap-1">
              <Home className="w-5 h-5" />
              <span className="text-[10px] font-bold">Home</span>
            </Link>
            <Link to="/browse" className="text-gray-600 hover:text-brand-green flex flex-col items-center gap-1">
              <Search className="w-5 h-5" />
              <span className="text-[10px] font-bold">Browse</span>
            </Link>
            <button className="text-gray-600 hover:text-brand-green flex flex-col items-center gap-1">
              <User className="w-5 h-5" />
              <span className="text-[10px] font-bold">Profile</span>
            </button>
            <button className="text-gray-600 hover:text-brand-green flex flex-col items-center gap-1 relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="text-[10px] font-bold">Cart</span>
              <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">0</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4">
        {children}
      </main>

      <footer className="bg-white border-t border-gray-200 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} ADAB Marketplace. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/browse" element={<BrowsePage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
