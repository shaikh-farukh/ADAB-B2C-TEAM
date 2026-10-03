import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ShoppingCart,
  Clock,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Package,
  Search,
  ArrowRight,
  Info,
  LucideIcon,
  Factory,
  RefreshCw,
  AlertCircle,
  Activity
} from 'lucide-react';
import distributorService from '../../services/distributorService';
import paymentService from '../../services/paymentService';
import { useNotification } from '../../context/NotificationContext';
import CreditLineWidget from '../../components/payments/CreditLineWidget';
import OrdersDataTable from '../../components/dashboard/OrdersDataTable';
import PredictiveAreaChart from '../../components/dashboard/PredictiveAreaChart';
import CategoryPieChart from '../../components/dashboard/CategoryPieChart';
import SmartReorderWidget from '../../components/dashboard/SmartReorderWidget';

/**
 * Reusable Metric Card component for the Distributor Dashboard.
 */
interface StatCardProps {
  title: string;
  value: string | number;
  caption: string;
  icon: LucideIcon;
  variant?: 'green' | 'orange' | 'neutral';
  isLoading?: boolean;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, caption, icon: Icon, variant = 'neutral', isLoading, onClick }) => {
  const variantStyles = {
    green: { bg: 'bg-adab-green/10 dark:bg-adab-green/20', icon: 'text-adab-green', border: 'hover:border-adab-green/30 dark:hover:border-adab-green/50' },
    orange: { bg: 'bg-adab-orange/10 dark:bg-adab-orange/20', icon: 'text-adab-orange', border: 'hover:border-adab-orange/30 dark:hover:border-adab-orange/50' },
    neutral: { bg: 'bg-gray-100/50 dark:bg-dark-surface-hover', icon: 'text-gray-500 dark:text-dark-text-secondary', border: 'hover:border-gray-300 dark:hover:border-dark-border-primary' }
  };

  const style = variantStyles[variant];

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-dark-app-secondary border border-gray-100 dark:border-dark-border-primary rounded-2xl p-6 shadow-sm animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-gray-50 dark:bg-dark-surface-hover w-10 h-10 rounded-xl" />
          <div className="bg-gray-50 dark:bg-dark-surface-hover h-2 w-16 rounded" />
        </div>
        <div className="bg-gray-50 dark:bg-dark-surface-hover h-3 w-24 rounded mb-2" />
        <div className="bg-gray-100 h-8 w-16 rounded" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-dark-app-secondary border border-gray-100 dark:border-dark-border-primary rounded-2xl p-6 shadow-sm transition-all duration-300 group ${onClick ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]' : 'cursor-default'} ${style.border}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${style.bg} group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`w-6 h-6 ${style.icon}`} />
        </div>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{caption}</span>
      </div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-2xl font-black text-gray-900 dark:text-dark-text-secondary tracking-tight">{value}</h3>
    </div>
  );
};

const DistributorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showError } = useNotification();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);

  const [stats, setStats] = useState({
    manufacturer_count: 0,
    total_orders: 0,
    pending_orders: 0,
    processing_orders: 0,
    shipped_orders: 0,
    delivered_orders: 0,
    active_requests: 0,
  });

  const [healthData, setHealthData] = useState<any>(null);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [topCategories, setTopCategories] = useState<any[]>([]);
  const [smartReorders, setSmartReorders] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
      setRefreshTrigger(prev => prev + 1);
    }

    try {
      const [metricsRes, healthRes] = await Promise.all([
        distributorService.getDashboardMetrics(),
        distributorService.getNetworkHealth()
      ]);

      const processTrend = (rawTrend: any[]) => {
        return rawTrend.map((item: any) => ({
          date: item.date,
          amount: item.amount !== undefined ? item.amount : (item.total_amount || 0),
          isPredicted: item.isPredicted || false
        }));
      };

      if (metricsRes.success && metricsRes.data) {
        // Populate Top Stats
        const metrics = metricsRes.data.procurement_metrics || metricsRes.data; // fallback if it's flat
        setStats({
          manufacturer_count: metrics.connected_manufacturers || 0,
          total_orders: metrics.total_orders || 0,
          pending_orders: metrics.pending_orders || 0,
          processing_orders: metrics.processing_orders || 0,
          shipped_orders: metrics.shipped_orders || 0,
          delivered_orders: metrics.approved_orders || metrics.delivered_orders || 0,
          active_requests: metrics.active_requests || 0,
        });

        // Populate Analytics Trend (Revenue / Volume)
        const volumeData = metricsRes.data.volume_analysis || [];
        setRevenueTrend(processTrend(volumeData));

        // Populate Top Categories
        setTopCategories(metricsRes.data.top_categories || []);

        // Populate Smart Reorders
        setSmartReorders(metricsRes.data.smart_reorder || []);
      }

      if (healthRes.success) {
        setHealthData(healthRes.data);
      }

    } catch (err: any) {
      console.error("Distributor Dashboard fetch error:", err);
      showError("Failed to synchronize distributor network metrics.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-dark-border-primary pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-dark-text-secondary tracking-tight">Distributor Workspace</h1>
          <p className="text-gray-500 dark:text-dark-text-muted text-sm mt-1">Multi-hub inventory routing & supplier connections</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={isRefreshing || isLoading}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-dark-border-secondary hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-dark-text-secondary transition-colors disabled:opacity-50"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-adab-green' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/distributor/catalog')}
            className="px-4 py-2.5 bg-adab-green text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-green-700 transition-all shadow-md shadow-green-900/10 flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" /> Browse Catalog
          </button>
        </div>
      </div>

      {/* Active Supply Chain Banner */}
      {isLoading ? (
        <div className="bg-white dark:bg-dark-app-secondary border border-gray-100 dark:border-dark-border-primary rounded-2xl p-8 shadow-sm animate-pulse flex items-center gap-6">
          <div className="bg-gray-100 w-16 h-16 rounded-2xl" />
          <div className="flex-1 space-y-4">
            <div className="bg-gray-200 h-6 w-1/4 rounded-lg" />
            <div className="bg-gray-100 h-4 w-1/2 rounded-lg" />
          </div>
        </div>
      ) : (
        <section className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-primary rounded-2xl p-6 md:p-8 shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-56 h-56 bg-adab-orange/5 rounded-full blur-3xl group-hover:bg-adab-orange/10 transition-colors duration-700"></div>
          <div className="relative flex flex-col sm:flex-row items-center gap-6 md:gap-8">
            <div className="w-20 h-20 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100 shadow-inner shrink-0 group-hover:scale-105 transition-transform duration-500">
               <Factory className="w-10 h-10 text-adab-orange" />
            </div>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-dark-text-secondary">Active Supply Chain</h2>
              <p className="text-gray-500 dark:text-dark-text-muted text-sm mt-1.5 max-w-2xl leading-relaxed">
                You are currently connected with {stats.manufacturer_count} manufacturing hubs across global regions.
              </p>
            </div>
            <button
              onClick={() => navigate('/distributor/manufacturers')}
              className="sm:ml-auto text-[10px] font-black text-adab-green flex items-center gap-2 uppercase tracking-[0.2em] hover:text-green-800 transition-colors whitespace-nowrap"
            >
              Explore Network <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      {/* Smart Reorder Engine */}
      <section className="space-y-5">
        <div className="grid grid-cols-1 gap-6">
           <SmartReorderWidget data={smartReorders} />
        </div>
      </section>

      {/* Credit Line Status */}
      <CreditLineWidget />

      {/* Metrics Grid */}
      <section className="space-y-5">
        <div className="flex items-center gap-2 px-1">
          <TrendingUp className="w-4 h-4 text-adab-orange" />
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Procurement Velocity</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Manufacturers"
            value={stats.manufacturer_count}
            caption="Connected Hubs"
            icon={Factory}
            variant="neutral"
            isLoading={isLoading}
            onClick={() => navigate('/distributor/manufacturers')}
          />
          <StatCard
            title="My Orders"
            value={stats.total_orders}
            caption="Historical"
            icon={Package}
            variant="green"
            isLoading={isLoading}
            onClick={() => navigate('/distributor/orders')}
          />
          <StatCard 
            title="In Processing" 
            value={stats.processing_orders} 
            caption="Active Pipeline" 
            icon={Clock} 
            variant="orange" 
            isLoading={isLoading} 
            onClick={() => navigate('/distributor/orders?status=PROCESSING')}
          />
          <StatCard 
            title="Delivered" 
            value={stats.delivered_orders} 
            caption="Fulfilled" 
            icon={CheckCircle2} 
            variant="green" 
            isLoading={isLoading} 
            onClick={() => navigate('/distributor/orders?status=DELIVERED')}
          />
        </div>
      </section>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-5">
          <div className="flex items-center gap-2 px-1">
            <TrendingUp className="w-4 h-4 text-adab-green" />
            <h3 className="text-base font-bold text-gray-900 dark:text-dark-text-secondary">Procurement Spend Trend</h3>
          </div>
          {isLoading ? (
             <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm h-[400px]">
               <div className="w-full h-full flex items-end gap-10 px-8 pt-12 animate-pulse">
                 <div className="flex-1 bg-gray-100 rounded-t-xl h-[20%]" />
                 <div className="flex-1 bg-gray-200 rounded-t-xl h-[40%]" />
                 <div className="flex-1 bg-gray-100 rounded-t-xl h-[60%]" />
                 <div className="flex-1 bg-gray-200 rounded-t-xl h-[95%]" />
               </div>
             </div>
          ) : (
            <PredictiveAreaChart data={revenueTrend} title="" />
          )}
        </section>

        <section className="space-y-5">
          <div className="flex items-center gap-2 px-1">
             <BarChart3 className="w-4 h-4 text-adab-orange" />
             <h3 className="text-base font-bold text-gray-900 dark:text-dark-text-secondary">Top Categories</h3>
             {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(undefined)}
                  className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-2 py-1 rounded"
                >
                  Clear Filter
                </button>
             )}
          </div>
          {isLoading ? (
            <div className="bg-white border border-gray-200 rounded-2xl h-[400px] flex items-center justify-center animate-pulse">
              <div className="bg-gray-100 w-48 h-48 rounded-full" />
            </div>
          ) : (
            <CategoryPieChart
              data={topCategories}
              selectedCategory={selectedCategory}
              onCategorySelect={(cat) => setSelectedCategory(cat === selectedCategory ? undefined : cat)}
            />
          )}
        </section>
      </div>

      {/* Data Table Section */}
      <section className="space-y-5 mt-10">
        <div className="flex items-center gap-2 px-1">
          <Package className="w-4 h-4 text-adab-orange" />
          <h3 className="text-base font-bold text-gray-900 dark:text-dark-text-secondary">Active Orders Overview</h3>
          {selectedCategory && (
            <span className="ml-2 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Filtered by: {selectedCategory}
            </span>
          )}
        </div>
        <div className="bg-white dark:bg-dark-app-secondary rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border-primary p-2">
          <OrdersDataTable categoryFilter={selectedCategory} refreshTrigger={refreshTrigger} />
        </div>
      </section>
    </div>
  );
};

export default DistributorDashboard;