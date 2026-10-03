import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Factory,
  Search,
  Filter,
  Globe,
  UserPlus,
  CheckCircle2,
  ArrowRight,
  Info,
  Building2,
  MapPin,
  SearchX,
  ChevronLeft,
  RefreshCw,
  Loader2
} from 'lucide-react';
import distributorService from '../../services/distributorService';
import { useNotification } from '../../context/NotificationContext';

const ManufacturerListPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<number | null>(null);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await distributorService.getManufacturerCategories();
      if (response.success) {
        setCategories(response.data || []);
      }
    } catch (err) {
      console.error("Failed to load categories");
    }
  }, []);

  const fetchManufacturers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (categoryFilter !== 'All') params.category = categoryFilter;

      const response = await distributorService.getAvailableManufacturers(params);
      if (response.success) {
        setManufacturers(response.data || []);
      } else {
        const msg = response.message || "Failed to retrieve manufacturer directory";
        setError(msg);
        showError(msg);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Internal network error while fetching manufacturers";
      setError(msg);
      showError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, categoryFilter, showError]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchManufacturers();
    }, 400);
    return () => clearTimeout(timer);
  }, [fetchManufacturers]);

  return (
    <div className="space-y-8 md:space-y-10 animate-in fade-in duration-500 pb-20">
      {/* Polished Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          <div className="flex items-center gap-2 text-adab-orange mb-1.5">
            <Factory className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sourcing Network</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-dark-text-secondary tracking-tight leading-none uppercase">Manufacturer Search</h1>
          <p className="mt-1.5 text-sm text-gray-500 font-medium">Discover verified global production partners and track active connection statuses.</p>
        </div>
        <button
          onClick={fetchManufacturers}
          className="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-white dark:bg-dark-app-secondary border border-gray-100 dark:border-dark-border-primary text-gray-500 hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Directory
        </button>
      </div>

      {/* Discovery Content Area */}
      <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-[2rem] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4">
           <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Find partners by specialty or name..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-adab-orange/20 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-adab-orange/20"
            >
              <option value="All">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Manufacturing Partner</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Fulfillment Scope</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Connection Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-8 py-6 space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gray-100 rounded-2xl" />
                        <div className="space-y-2"><div className="bg-gray-200 h-5 w-48 rounded-lg" /><div className="bg-gray-100 h-3 w-32 rounded-lg" /></div>
                      </div>
                    </td>
                    <td className="px-8 py-6"><div className="bg-gray-100 h-8 w-28 mx-auto rounded-full" /></td>
                    <td className="px-8 py-6"><div className="bg-gray-100 h-8 w-24 mx-auto rounded-full" /></td>
                    <td className="px-8 py-6 text-right"><div className="bg-gray-100 h-11 w-32 ml-auto rounded-2xl" /></td>
                  </tr>
                ))
              ) : manufacturers.length > 0 ? (
                manufacturers.map((mfg) => (
                  <tr key={mfg.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td
                      onClick={() => navigate(`/distributor/manufacturers/${mfg.id}`)}
                      className="px-8 py-6 cursor-pointer animate-in fade-in"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-adab-orange font-black text-xl shrink-0 border border-gray-200 group-hover:bg-white group-hover:shadow-lg group-hover:shadow-orange-900/5 transition-all">
                          {(mfg.manufacturer_name || 'U')[0]}
                        </div>
                        <div>
                          <p className="text-base font-extrabold text-gray-900 dark:text-dark-text-secondary group-hover:text-adab-orange transition-colors">{mfg.manufacturer_name || 'Unknown'}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{mfg.country}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors ${mfg.international_business === 'Yes' ? 'bg-orange-50 text-adab-orange border-orange-200' : 'bg-green-50 text-adab-green border-green-200'}`}>
                        {mfg.international_business === 'Yes' ? 'International' : 'Domestic Market'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors ${
                        mfg.connection_status === 'APPROVED' 
                          ? 'bg-green-50 text-adab-green border-green-200' 
                        : mfg.connection_status === 'PENDING'
                          ? 'bg-orange-50 text-orange-600 border-orange-200'
                        : mfg.connection_status === 'REJECTED'
                          ? 'bg-red-50 text-red-600 border-red-200'
                        : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                        {mfg.connection_status === 'APPROVED' ? 'Connected' : mfg.connection_status?.replace('_', ' ') || 'Not Connected'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => navigate(`/distributor/manufacturers/${mfg.id}`)}
                          className="px-4 py-2 border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-900 dark:text-dark-text-secondary rounded-xl text-[10px] font-black uppercase tracking-[0.12em] transition-all bg-white hover:bg-gray-50 active:scale-[0.98]"
                        >
                          View Profile
                        </button>
                        <button
                          onClick={() => navigate('/distributor/catalog')}
                          className="px-4 py-2 bg-adab-green text-white rounded-xl text-[10px] font-black uppercase tracking-[0.12em] shadow-lg shadow-green-900/10 hover:bg-green-800 transition-all active:scale-[0.98]"
                        >
                          Browse Catalog
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center max-w-sm mx-auto">
                      <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-8 border border-gray-100 shadow-inner">
                        {error ? <Info className="w-12 h-12 text-adab-orange" /> : <SearchX className="w-12 h-12 text-gray-200" />}
                      </div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-dark-text-secondary tracking-tight leading-none mb-3">
                        {error ? "Synchronisation Error" : "Discovery Empty"}
                      </h3>
                      <p className="text-gray-500 text-sm font-medium leading-relaxed">
                        {error ? error : "No new manufacturers matched your filter criteria. Try expanding your search scope."}
                      </p>
                      {error && (
                        <button
                          onClick={fetchManufacturers}
                          className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-adab-green text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-green-800 transition-all active:scale-95 shadow-lg"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Retry Directory
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManufacturerListPage;