import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  Clock, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  Info,
  Calendar,
  Building2,
  ChevronRight,
  FileSearch,
  RefreshCw
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import distributorService from '../../services/distributorService';
import StatusBadge from '../../components/common/StatusBadge';
import { useNotification } from '../../context/NotificationContext';

const OrderHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showError } = useNotification();
  
  // Read initial status from URL if present
  const queryParams = new URLSearchParams(location.search);
  const initialStatus = queryParams.get('status') || 'All';

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [orders, setOrders] = useState<any[]>([]);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      
      const response = await distributorService.getOrders(params);
      if (response.success) {
        setOrders(response.data || []);
      } else {
        showError(response.message || "Failed to load orders");
      }
    } catch (err: any) {
      showError(err.response?.data?.message || "Error fetching order history");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, showError]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderNum = order.order_number || '';
      const mfgName = order.manufacturer_name || '';
      const matchesSearch = orderNum.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            mfgName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [searchQuery, orders]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Standardized Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          <div className="flex items-center gap-2 text-adab-green mb-1.5">
            <History className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Procurement Tracking</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-200 tracking-tight">Order History</h1>
          <p className="mt-1 text-sm text-gray-500 font-medium">Trace all procurement transactions and documentation.</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={fetchOrders} className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-3xl text-gray-400 hover:text-adab-green transition-all shadow-sm">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 items-center">
           <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search orders by PO ID or Supplier..." 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-adab-green/20 outline-none" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Filter className="w-4 h-4 text-gray-400" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-adab-green/20"
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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order Reference</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Manufacturing Partner</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Value</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Logistics Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5 space-y-2"><div className="h-4 bg-gray-100 rounded w-24" /><div className="h-2 bg-gray-50 rounded w-16" /></td>
                    <td className="px-6 py-5 space-y-2"><div className="h-4 bg-gray-100 rounded w-40" /><div className="h-2 bg-gray-50 rounded w-24" /></td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-16 mx-auto" /></td>
                    <td className="px-6 py-5 text-center"><div className="h-6 bg-gray-100 rounded-full w-24 mx-auto" /></td>
                    <td className="px-6 py-5 text-right"><div className="h-8 bg-gray-100 rounded-lg w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => navigate(`/distributor/orders/view/${order.id}`)}>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-200 group-hover:text-adab-green transition-colors">{order.order_number || order.id}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{new Date(order.order_date).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-adab-orange group-hover:bg-white transition-colors shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-200 truncate">{order.manufacturer_name}</p>
                          <p className="text-[10px] text-gray-400 font-medium tracking-tight">PO Fulfillment</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                       <span className="text-sm font-extrabold text-gray-900 dark:text-gray-200">₹{Number(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-5 text-right">
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-adab-green transition-colors ml-auto" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-28 text-center">
                    <div className="flex flex-col items-center max-w-sm mx-auto">
                      <div className="w-24 h-24 mb-6 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center border border-gray-100 dark:border-white/5 shadow-inner">
                        <FileSearch className="w-10 h-10 text-gray-200" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-200 tracking-tight">No records found</h3>
                      <p className="text-gray-500 text-sm mt-2 leading-relaxed">Your procurement history is currently empty. Placed orders will appear here once confirmed by the manufacturer.</p>
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

export default OrderHistoryPage;
