import React, { useEffect, useState } from 'react';
import { DollarSign, Percent, Briefcase, Users, RefreshCw, TrendingUp, BarChart3 } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { useNotification } from '../../context/NotificationContext';

interface DashboardStats {
  total_gmv: number;
  total_commission_revenue: number;
  active_credit_float: number;
  pending_kyc_queue: number;
}

const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { showError } = useNotification();

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/dashboard-stats');
      if (response.data.success) {
        setStats(response.data.data);
      } else {
        showError('Failed to load dashboard statistics');
      }
    } catch (error) {
      console.error(error);
      showError('Error fetching dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-in fade-in duration-500 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-white/5 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-gray-200 tracking-tight">SuperAdmin Master Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Platform revenue, GMV, and pending operations.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchStats}
            disabled={loading}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-50"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-adab-green' : ''}`} />
          </button>
        </div>
      </div>

      <section className="space-y-5">
        <div className="flex items-center gap-2 px-1">
          <TrendingUp className="w-4 h-4 text-adab-orange" />
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Platform Metrics</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total GMV Card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-2xl p-6 shadow-sm transition-all duration-300 group hover:shadow-xl hover:-translate-y-1 hover:border-adab-green/30">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-adab-green/10 group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="w-6 h-6 text-adab-green" />
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gross Vol</span>
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total GMV</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-gray-200 tracking-tight">
              {loading ? '...' : formatCurrency(stats?.total_gmv || 0)}
            </h3>
          </div>

          {/* Platform Commission Revenue Card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-2xl p-6 shadow-sm transition-all duration-300 group hover:shadow-xl hover:-translate-y-1 hover:border-adab-green/30">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-adab-green/10 group-hover:scale-110 transition-transform duration-300">
                <Percent className="w-6 h-6 text-adab-green" />
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Revenue</span>
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Commission Revenue</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-gray-200 tracking-tight">
              {loading ? '...' : formatCurrency(stats?.total_commission_revenue || 0)}
            </h3>
          </div>

          {/* Active Credit Float Card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-2xl p-6 shadow-sm transition-all duration-300 group hover:shadow-xl hover:-translate-y-1 hover:border-gray-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gray-100/50 group-hover:scale-110 transition-transform duration-300">
                <Briefcase className="w-6 h-6 text-gray-500" />
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Credit</span>
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Active Float</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-gray-200 tracking-tight">
              {loading ? '...' : formatCurrency(stats?.active_credit_float || 0)}
            </h3>
          </div>

          {/* Pending KYC Queue Card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-2xl p-6 shadow-sm transition-all duration-300 group hover:shadow-xl hover:-translate-y-1 hover:border-adab-orange/30">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-adab-orange/10 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-6 h-6 text-adab-orange" />
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Queue</span>
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pending KYC</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-gray-200 tracking-tight">
              {loading ? '...' : (stats?.pending_kyc_queue || 0)}
            </h3>
          </div>
        </div>
      </section>
      
      <div className="mt-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm min-h-[300px] flex flex-col items-center justify-center">
         <BarChart3 className="w-12 h-12 text-gray-300 mb-4" />
         <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Advanced Analytics & Charting Coming Soon</p>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
