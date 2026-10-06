import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  UsersRound,
  Eye,
  AlertTriangle,
  RefreshCw,
  UserPlus,
  CheckCircle2,
  Loader2,
  Clock,
  Send
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import distributorService from '../../services/distributorService';
import requestService from '../../services/requestService';
import { useNotification } from '../../context/NotificationContext';

const DistributorListPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [isLoading, setIsLoading] = useState(true);
  const [distributors, setDistributors] = useState<any[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('All');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const response = await distributorService.getDistributorRegions();
        if (response.success && Array.isArray(response.data)) {
          setRegions(response.data);
        }
      } catch (err) {
        console.error("Failed to load distributor regions", err);
      }
    };
    fetchRegions();
  }, []);

  const fetchDistributors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (regionFilter !== 'All') params.region = regionFilter;

      const response = await distributorService.getAllDistributors(params);
      if (response.success) {
        setDistributors(response.data || []);
      } else {
        const msg = response.message || "Failed to retrieve partner registry";
        setError(msg);
        showError(msg);
        setDistributors([]);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Network error occurred while fetching distributors";
      setError(msg);
      showError(msg);
      setDistributors([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, regionFilter, showError]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDistributors();
    }, 400);
    return () => clearTimeout(timer);
  }, [fetchDistributors]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Standardized Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          <div className="flex items-center gap-2 text-adab-green mb-1.5">
            <Users className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Partner Network</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-dark-text-secondary tracking-tight">Distributor Directory</h1>
          <p className="mt-1 text-sm text-gray-500 font-medium">Browse your approved and connected global distributor network.</p>
        </div>
        <button 
          onClick={fetchDistributors} 
          className="px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-white dark:bg-dark-app-secondary border border-gray-100 dark:border-dark-border-primary text-gray-500 hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Registry
        </button>
      </div>

      <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Filter partners by name or company..." 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-dark-surface-elevated border border-gray-200 dark:border-dark-border-primary rounded-lg text-sm text-gray-900 dark:text-dark-text-primary focus:ring-2 focus:ring-adab-green/20 outline-none" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-4 py-2.5 bg-gray-50 dark:bg-dark-surface-elevated border border-gray-200 dark:border-dark-border-primary text-gray-900 dark:text-dark-text-primary rounded-lg text-sm outline-none focus:ring-2 focus:ring-adab-green/20 min-w-[150px]"
          >
            <option value="All">All Regions</option>
            {regions.map((region) => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-dark-surface-elevated border-b border-gray-100 dark:border-dark-border-primary">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 dark:text-dark-text-secondary uppercase tracking-widest">Partner Identity</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 dark:text-dark-text-secondary uppercase tracking-widest">Region</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 dark:text-dark-text-secondary uppercase tracking-widest text-center">Connection Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 dark:text-dark-text-secondary uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-dark-border-primary">
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                        <div className="space-y-2">
                          <div className="bg-gray-200 h-4 w-40 rounded" />
                          <div className="bg-gray-100 h-2 w-20 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5"><div className="bg-gray-100 h-4 w-24 rounded" /></td>
                    <td className="px-6 py-5 text-center"><div className="bg-gray-100 h-6 w-20 mx-auto rounded-full" /></td>
                    <td className="px-6 py-5 text-right"><div className="bg-gray-100 h-9 w-32 ml-auto rounded-xl" /></td>
                  </tr>
                ))
              ) : distributors.length > 0 ? (
                distributors.map((dist) => (
                  <tr
                    key={dist.id}
                    className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/manufacturer/distributors/view/${dist.id}`)}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-adab-green border border-green-100 font-black text-xs shrink-0">
                          {dist.distributor_name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-gray-900 dark:text-dark-text-secondary truncate group-hover:text-adab-green transition-colors">{dist.distributor_name}</span>
                          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter truncate">{dist.company}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded uppercase tracking-tighter">
                        {dist.region}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex px-3 py-1 bg-green-50 text-adab-green border border-green-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                        Connected
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="p-2.5 bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-xl text-gray-400 hover:border-adab-green hover:text-adab-green hover:bg-green-50 transition-all active:scale-[0.98] shadow-sm flex items-center justify-center"
                        title="View Details"
                        onClick={() => navigate(`/manufacturer/distributors/view/${dist.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-28 text-center">
                    <div className="flex flex-col items-center max-w-sm mx-auto">
                      <div className="w-20 h-20 bg-gray-50 dark:bg-dark-surface-elevated rounded-full flex items-center justify-center mb-6 border border-gray-100 dark:border-dark-border-primary shadow-inner">
                        {error ? <AlertTriangle className="w-10 h-10 text-adab-orange" /> : <UsersRound className="w-10 h-10 text-gray-300 dark:text-gray-600" />}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary tracking-tight">
                        {error ? "Synchronisation Error" : "Distributor Registry"}
                      </h3>
                      <p className="text-gray-500 dark:text-dark-text-secondary text-sm mt-2 leading-relaxed">
                        {error ? error : "No connected distributors matched your criteria."}
                      </p>
                      {error && (
                        <button
                          onClick={() => fetchDistributors()}
                          className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-adab-green text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-green-800 transition-all active:scale-95 shadow-lg"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Retry Registry Fetch
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

export default DistributorListPage;