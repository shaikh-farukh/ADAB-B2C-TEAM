import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  ClipboardList, 
  Clock, 
  Truck, 
  CheckCircle2, 
  AlertCircle,
  ArrowUpRight,
  MoreVertical,
  ChevronRight,
  ClipboardX,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../../components/common/StatusBadge';
import orderService from '../../services/orderService';
import { useNotification } from '../../context/NotificationContext';

const OrderListPage: React.FC = () => {
  const navigate = useNavigate();
  const { showError } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const response = await orderService.getOrders(params);
      if (response.success) {
        setOrders(response.data || []);
      } else {
        const msg = response.message || "Failed to load orders";
        setError(msg);
        showError(msg);
        setOrders([]);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "An error occurred while fetching orders";
      setError(msg);
      showError(msg);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery, showError]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 400); // Debounce API calls
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Normalized Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          <div className="flex items-center gap-2 text-adab-green mb-1.5">
            <ClipboardList className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sales Operations</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-200 tracking-tight">Order Fulfillment</h1>
          <p className="mt-1 text-sm text-gray-500 font-medium">Review and process purchase orders from your distribution network.</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-adab-green/20"
          >
            <option value="All">All Statuses</option>
            <option value="PO_SUBMITTED">Pending (PO Submitted)</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="PROCESSING">Processing</option>
            <option value="READY_FOR_DISPATCH">Ready for Dispatch</option>
            <option value="SHIPPED">Dispatched / Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100">
           <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search orders by ID or Distributor..." 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-adab-green/20 outline-none" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order Details</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Distributor Entity</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Amount (INR)</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Current Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5 space-y-2"><div className="h-4 bg-gray-100 rounded w-24" /><div className="h-2 bg-gray-50 rounded w-16" /></td>
                    <td className="px-6 py-5 space-y-2"><div className="h-4 bg-gray-100 rounded w-40" /><div className="h-2 bg-gray-50 rounded w-24" /></td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-16 mx-auto" /></td>
                    <td className="px-6 py-5 text-center"><div className="h-6 bg-gray-100 rounded-full w-20 mx-auto" /></td>
                    <td className="px-6 py-5 text-right"><div className="h-8 bg-gray-100 rounded-lg w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : orders.length > 0 ? (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-200 group-hover:text-adab-green transition-colors">{order.order_number || order.id}</span>
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">Placed {new Date(order.order_date).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-200">{order.distributor_name}</span>
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">{order.company_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-extrabold text-gray-900 dark:text-gray-200">₹{Number(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        <span className="text-[10px] text-gray-400 font-medium tracking-tight">{(order.items || []).length} Items</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button 
                        onClick={() => navigate(`/manufacturer/orders/view/${order.id}`)} 
                        className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-xl text-gray-600 hover:border-adab-green hover:text-adab-green hover:bg-green-50 transition-all active:scale-[0.98]"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-28 text-center">
                    <div className="flex flex-col items-center max-w-sm mx-auto">
                      <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mb-6 border border-gray-100 dark:border-white/5 shadow-inner">
                        {error ? <AlertCircle className="w-10 h-10 text-adab-orange" /> : <ClipboardX className="w-10 h-10 text-gray-200" />}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-200 tracking-tight">
                        {error ? "Synchronisation Error" : "No incoming orders"}
                      </h3>
                      <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                        {error ? error : "Your fulfillment queue is currently empty. New purchase orders will appear here automatically."}
                      </p>
                      {error && (
                        <button 
                          onClick={() => fetchOrders()}
                          className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-adab-green text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-green-800 transition-all active:scale-95 shadow-lg"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Retry Fetch
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

export default OrderListPage;