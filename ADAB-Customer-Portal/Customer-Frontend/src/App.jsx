import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Search, Home } from 'lucide-react';
import HomePage from './pages/HomePage';
import BrowsePage from './pages/BrowsePage';
import ProductPage from './pages/ProductPage';
import axios from 'axios';

function Layout({ children }) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [suggestions, setSuggestions] = React.useState([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const navigate = useNavigate();
  
  React.useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length > 1) {
        try {
          const res = await axios.get(`/api/catalog/suggest?q=${searchQuery}`);
          setSuggestions(res.data.data);
          setShowSuggestions(true);
        } catch (err) {
          console.error("Error fetching suggestions", err);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };
    
    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      navigate(`/browse?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-black text-brand-green tracking-tight">ADAB</span>
            <span className="text-sm font-semibold text-gray-500 hidden sm:block">Customer</span>
          </Link>
          
          <div className="flex-1 max-w-2xl mx-8 hidden md:block">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Search for fresh groceries, fashion, electronics..."
                className="w-full bg-gray-100 border-transparent focus:bg-white focus:border-brand-green focus:ring-2 focus:ring-brand-light rounded-xl py-2.5 pl-10 pr-4 text-sm transition-all"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
              
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {suggestions.map((suggestion, idx) => (
                    <div 
                      key={idx}
                      onClick={() => {
                        setSearchQuery(suggestion);
                        setShowSuggestions(false);
                        navigate(`/browse?q=${encodeURIComponent(suggestion)}`);
                      }}
                      className="px-4 py-3 hover:bg-brand-light cursor-pointer text-sm font-medium text-gray-700 flex items-center gap-3 transition-colors"
                    >
                      <Search className="w-4 h-4 text-gray-400" />
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </form>
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
          <Route path="/product/:id" element={<ProductPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
