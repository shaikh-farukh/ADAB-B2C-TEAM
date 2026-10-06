import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  TrendingUp,
  BarChart3,
  AlertCircle,
  PlusCircle,
  ShoppingCart,
  UserPlus,
  LucideIcon,
  RefreshCw
} from 'lucide-react';
import dashboardService from '../../services/dashboardService';
import { useNotification } from '../../context/NotificationContext';
import PredictiveAreaChart from '../../components/dashboard/PredictiveAreaChart';
import CategoryPieChart from '../../components/dashboard/CategoryPieChart';
import ManufacturerOrdersDataTable from '../../components/dashboard/ManufacturerOrdersDataTable';

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

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { showError } = useNotification();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);

  const [metrics, setMetrics] = useState({
    active_distributors: 0,
    total_products: 0,
    low_stock_alerts: 0,
    total_orders: 0,
    total_revenue: 0,
    pending_orders: 0
  });

  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [topCategories, setTopCategories] = useState<any[]>([]);

  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [metricsRes, analyticsRes] = await Promise.all([
        (dashboardService as any).getMetrics ? (dashboardService as any).getMetrics() : dashboardService.getDashboardStats(),
        (dashboardService as any).getAnalyticsTrend ? (dashboardService as any).getAnalyticsTrend() : dashboardService.getOrderSummary()
      ]);

      const processTrend = (rawTrend: any[]) => {
        return rawTrend.map((item: any) => ({
          date: item.date,
          amount: item.amount !== undefined ? item.amount : (item.total_amount || 0),
          isPredicted: item.isPredicted || false
        }));
      };

      if (metricsRes.success && metricsRes.data) {
        const d = metricsRes.data;
        // Map backend shape or fallback to flat structure
        setMetrics({
          active_distributors: d.distributors?.active ?? d.active_distributors ?? 0,
          total_products: d.products?.total ?? d.total_products ?? 0,
          low_stock_alerts: d.products?.low_stock ?? d.low_stock_alerts ?? 0,
          total_orders: d.orders?.total ?? d.total_orders ?? 0,
          total_revenue: d.orders?.total_revenue ?? d.total_revenue ?? 0,
          pending_orders: d.orders?.pending ?? d.pending_orders ?? 0
        });

        if (d.top_categories) {
          setTopCategories(d.top_categories);
        }

        if (d.volume_analysis || d.revenue_trend) {
          const rawTrend = d.revenue_trend || d.volume_analysis || [];
          setRevenueTrend(processTrend(rawTrend));
        }
      }

      if (analyticsRes.success && analyticsRes.data) {
        if (analyticsRes.data.revenue_trend?.length) {
          setRevenueTrend(processTrend(analyticsRes.data.revenue_trend));
        }
        if (analyticsRes.data.top_categories?.length) {
          setTopCategories(analyticsRes.data.top_categories);
        }
      }
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      showError("Failed to synchronize manufacturer portal metrics.");
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-dark-border-primary pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-dark-text-secondary tracking-tight">Manufacturer Workspace</h1>
          <p className="text-gray-500 dark:text-dark-text-muted text-sm mt-1">Production output, network distributors, and order fulfillment</p>
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
            onClick={() => navigate('/manufacturer/product-management')}
            className="px-4 py-2.5 bg-adab-green text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-green-700 transition-all shadow-md shadow-green-900/10 flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      <section className="space-y-5">
        <div className="flex items-center gap-2 px-1">
          <TrendingUp className="w-4 h-4 text-adab-orange" />
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Operational Overview</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Distributors"
            value={metrics.active_distributors}
            caption="Active Partners"
            icon={Users}
            variant="neutral"
            isLoading={isLoading}
            onClick={() => navigate('/manufacturer/distributors')}
          />
          <StatCard
            title="Products"
            value={metrics.total_products}
            caption="Active Catalog"
            icon={Package}
            variant="green"
            isLoading={isLoading}
            onClick={() => navigate('/manufacturer/products')}
          />
          <StatCard
            title="Orders"
            value={metrics.total_orders}
            caption="Total Received"
            icon={ShoppingCart}
            variant="orange"
            isLoading={isLoading}
            onClick={() => navigate('/manufacturer/orders')}
          />
          <StatCard
            title="Stock Warnings"
            value={metrics.low_stock_alerts}
            caption="Low Inventory"
            icon={AlertCircle}
            variant={metrics.low_stock_alerts > 0 ? "orange" : "neutral"}
            isLoading={isLoading}
            onClick={() => navigate('/manufacturer/products?filter=low_stock')}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-5">
          <div className="flex items-center gap-2 px-1">
            <TrendingUp className="w-4 h-4 text-adab-green" />
            <h3 className="text-base font-bold text-gray-900 dark:text-dark-text-secondary">Revenue Forecast & Analytics</h3>
          </div>
          {isLoading ? (
            <div className="bg-white dark:bg-dark-app-secondary border border-gray-100 dark:border-dark-border-primary rounded-2xl p-6 shadow-sm h-[400px]">
              <div className="w-full h-full flex items-end gap-10 px-8 pt-12 animate-pulse">
                <div className="flex-1 bg-gray-100 dark:bg-dark-surface-card rounded-t-xl h-[20%]" />
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-t-xl h-[40%]" />
                <div className="flex-1 bg-gray-100 dark:bg-dark-surface-card rounded-t-xl h-[60%]" />
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-t-xl h-[95%]" />
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
            <div className="bg-white dark:bg-dark-app-secondary border border-gray-100 dark:border-dark-border-primary rounded-2xl h-[400px] flex items-center justify-center animate-pulse">
              <div className="bg-gray-100 dark:bg-dark-surface-card w-48 h-48 rounded-full" />
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

      <section className="space-y-5 mt-10">
        <div className="flex items-center gap-2 px-1">
          <Package className="w-4 h-4 text-adab-orange" />
          <h3 className="text-base font-bold text-gray-900 dark:text-dark-text-secondary">Manufacturer Orders Dashboard</h3>
          {selectedCategory && (
            <span className="ml-2 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Filtered by: {selectedCategory}
            </span>
          )}
        </div>
        <div className="bg-white dark:bg-dark-app-secondary rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border-primary p-2">
          <ManufacturerOrdersDataTable categoryFilter={selectedCategory} />
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;