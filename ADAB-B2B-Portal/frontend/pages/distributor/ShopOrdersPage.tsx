import React, { useState, useEffect, useCallback } from 'react';
import { 
  ClipboardList, 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Truck, 
  Package, 
  Calendar, 
  Store, 
  TrendingUp, 
  ChevronRight, 
  X,
  FileText,
  AlertCircle,
  MapPin,
  Phone,
  User,
  Clock,
  Navigation,
  Info,
  RefreshCw
} from 'lucide-react';
import distributorShopOrderService from '../../services/distributorShopOrderService';
import { useNotification } from '../../context/NotificationContext';

const ShopOrdersPage: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail Drawer/Modal State
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Action states
  const [showNotesModal, setShowNotesModal] = useState<'accept' | 'reject' | 'process' | 'packed' | 'delivered' | null>(null);
  const [notesText, setNotesText] = useState('');
  const [actionOrderId, setActionOrderId] = useState<number | null>(null);

  // Dispatch details state
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [transporterName, setTransporterName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await distributorShopOrderService.getShopOrders();
      if (response.success) {
        setOrders(response.data || []);
      } else {
        showError(response.message || "Failed to fetch orders");
      }
    } catch (error: any) {
      showError(error.response?.data?.message || "Failed to load shop orders");
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const viewOrderDetail = async (orderId: number) => {
    setIsDetailLoading(true);
    try {
      const response = await distributorShopOrderService.getShopOrderDetail(orderId);
      if (response.success) {
        setSelectedOrder(response.data.order);
        setOrderItems(response.data.items || []);
        setOrderHistory(response.data.history || []);
      } else {
        showError(response.message || "Failed to load order details");
      }
    } catch (error: any) {
      showError(error.response?.data?.message || "Error fetching order detail");
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleOpenActionModal = (orderId: number, type: 'accept' | 'reject' | 'process' | 'packed' | 'delivered') => {
    setActionOrderId(orderId);
    setShowNotesModal(type);
    setNotesText('');
  };

  const handleCloseActionModal = () => {
    setShowNotesModal(null);
    setActionOrderId(null);
    setNotesText('');
  };

  const handleOrderAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionOrderId || !showNotesModal) return;

    try {
      let response;
      const type = showNotesModal;
      if (type === 'accept') {
        response = await distributorShopOrderService.acceptOrder(actionOrderId, notesText);
      } else if (type === 'reject') {
        response = await distributorShopOrderService.rejectOrder(actionOrderId, notesText);
      } else if (type === 'process') {
        response = await distributorShopOrderService.startProcessing(actionOrderId, notesText);
      } else if (type === 'packed') {
        response = await distributorShopOrderService.markPacked(actionOrderId, notesText);
      } else if (type === 'delivered') {
        response = await distributorShopOrderService.markDelivered(actionOrderId, notesText);
      }

      if (response && response.success) {
        showSuccess(response.message || `Order successfully updated`);
        handleCloseActionModal();
        fetchOrders();
        // Update details view if open
        if (selectedOrder && selectedOrder.id === actionOrderId) {
          viewOrderDetail(actionOrderId);
        }
      } else {
        showError(response?.message || "Failed to update order status");
      }
    } catch (error: any) {
      showError(error.response?.data?.message || "Error updating order status");
    }
  };

  const handleOpenDispatchModal = (orderId: number) => {
    setActionOrderId(orderId);
    setShowDispatchModal(true);
    setTransporterName('');
    setVehicleNumber('');
    setTrackingNumber('');
    setDispatchNotes('');
  };

  const handleDispatchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionOrderId) return;

    try {
      const response = await distributorShopOrderService.dispatchOrder(actionOrderId, {
        transporter_name: transporterName,
        vehicle_number: vehicleNumber,
        tracking_number: trackingNumber,
        notes: dispatchNotes
      });

      if (response.success) {
        showSuccess("Order marked as dispatched");
        setShowDispatchModal(false);
        setActionOrderId(null);
        fetchOrders();
        // Update details view if open
        if (selectedOrder && selectedOrder.id === actionOrderId) {
          viewOrderDetail(actionOrderId);
        }
      } else {
        showError(response.message || "Failed to dispatch order");
      }
    } catch (error: any) {
      showError(error.response?.data?.message || "Error dispatching order");
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case 'pending':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-full">New Order</span>;
      case 'accepted':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full">Accepted</span>;
      case 'processing':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-orange-600 bg-orange-50 border border-orange-100 rounded-full">Processing</span>;
      case 'packed':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-yellow-600 bg-yellow-50 border border-yellow-100 rounded-full">Packed</span>;
      case 'dispatched':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-purple-600 bg-purple-50 border border-purple-100 rounded-full">Dispatched</span>;
      case 'delivered':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-adab-green bg-green-50 border border-green-100 rounded-full">Delivered</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-full">Cancelled</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-gray-500 bg-gray-50 border border-gray-100 rounded-full">{status}</span>;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shop_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && order.status.toLowerCase() === activeTab.toLowerCase();
  });

  const getTabCount = (tab: string) => {
    if (tab === 'all') return orders.length;
    return orders.filter(o => o.status.toLowerCase() === tab.toLowerCase()).length;
  };

  const tabs = [
    { id: 'all', label: 'All Orders' },
    { id: 'pending', label: 'New' },
    { id: 'accepted', label: 'Accepted' },
    { id: 'processing', label: 'Processing' },
    { id: 'packed', label: 'Packed' },
    { id: 'dispatched', label: 'Dispatched' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'cancelled', label: 'Cancelled' }
  ];

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 pb-20 md:pb-24">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          <div className="flex items-center gap-2 text-adab-green mb-1.5">
            <Store className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Retail Commerce Panel</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-200 tracking-tight">Retailer Orders</h1>
          <p className="mt-1 text-sm text-gray-500 font-medium">Fulfill incoming order orders placed by retailer shops inside your assigned territories.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchOrders}
            className="flex items-center justify-center gap-2 px-5 py-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-2 overflow-x-auto no-scrollbar py-1">
          {tabs.map((tab) => {
            const count = getTabCount(tab.id);
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border flex items-center gap-2 ${
                  isActive 
                    ? 'bg-adab-green text-white border-adab-green shadow-sm' 
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-black ${
                  isActive ? 'bg-white text-adab-green' : 'bg-gray-100 text-gray-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Search Bar */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search by order number or shop name..." 
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-adab-green/20 focus:border-adab-green outline-none transition-all shadow-sm" 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
        />
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-2xl p-6 space-y-4 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
              </div>
              <div className="h-6 bg-gray-100 rounded w-2/3" />
              <div className="h-10 bg-gray-100 rounded w-full mt-4" />
            </div>
          ))}
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {filteredOrders.map((order) => {
            const dateStr = new Date(order.created_at || order.order_date).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div 
                key={order.id} 
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-black text-gray-400 tracking-wider">#{order.order_number}</span>
                    {getStatusBadge(order.status)}
                    <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      {dateStr}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-adab-green shrink-0" />
                    <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-200">{order.shop_name}</h3>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-semibold text-gray-500">
                    <p>Owner: <span className="text-gray-900 dark:text-gray-200 font-bold">{order.shop_owner_name || 'N/A'}</span></p>
                    <p>Items: <span className="text-gray-900 dark:text-gray-200 font-bold">{order.items_count} type(s)</span></p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto border-t md:border-t-0 border-gray-100 pt-4 md:pt-0 shrink-0">
                  <div className="text-left md:text-right pr-6">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total Amount</p>
                    <p className="text-lg font-black text-gray-900 dark:text-gray-200">₹{Number(order.total_amount).toFixed(2)}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button 
                      onClick={() => viewOrderDetail(order.id)}
                      className="flex-1 sm:flex-initial px-4 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Details
                    </button>

                    {/* Action buttons based on status */}
                    {order.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleOpenActionModal(order.id, 'accept')}
                          className="flex-1 sm:flex-initial px-4 py-2.5 bg-adab-green hover:bg-green-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/10"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Accept
                        </button>
                        <button 
                          onClick={() => handleOpenActionModal(order.id, 'reject')}
                          className="flex-1 sm:flex-initial px-4 py-2.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </>
                    )}

                    {order.status === 'accepted' && (
                      <button 
                        onClick={() => handleOpenActionModal(order.id, 'process')}
                        className="flex-1 sm:flex-initial px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        Process
                      </button>
                    )}

                    {order.status === 'processing' && (
                      <button 
                        onClick={() => handleOpenActionModal(order.id, 'packed')}
                        className="flex-1 sm:flex-initial px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                      >
                        <Package className="w-3.5 h-3.5" />
                        Pack Order
                      </button>
                    )}

                    {order.status === 'packed' && (
                      <button 
                        onClick={() => handleOpenDispatchModal(order.id)}
                        className="flex-1 sm:flex-initial px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Dispatch
                      </button>
                    )}

                    {order.status === 'dispatched' && (
                      <button 
                        onClick={() => handleOpenActionModal(order.id, 'delivered')}
                        className="flex-1 sm:flex-initial px-4 py-2.5 bg-adab-green hover:bg-green-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/10"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Delivered
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-32 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 border-dashed rounded-3xl flex flex-col items-center justify-center">
          <ClipboardList className="w-16 h-16 text-gray-200 mb-6" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-200 tracking-tight">No orders found</h3>
          <p className="text-gray-500 mt-2">There are currently no orders under the "{activeTab}" filter.</p>
        </div>
      )}

      {/* Order Detail Modal / Sidebar Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Overlay */}
          <div className="absolute inset-0 bg-gray-950/40 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
          
          {/* Side Drawer Container */}
          <div className="bg-white border-l border-gray-200 w-full max-w-2xl h-full shadow-2xl relative z-10 animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-adab-green uppercase tracking-widest mb-1">Retailer Order Detail</p>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-200">Order #{selectedOrder.order_number}</h3>
                  {getStatusBadge(selectedOrder.status)}
                </div>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Shop Details */}
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-gray-200/50">
                  <Store className="w-4.5 h-4.5 text-adab-green" />
                  <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-200">Retail Shop Profile</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">Contact Owner</p>
                      <p className="font-semibold text-gray-800">{selectedOrder.shop_owner_name || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">Phone Number</p>
                      <p className="font-semibold text-gray-800">{selectedOrder.shop_mobile || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:col-span-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-gray-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">Shipping Address</p>
                      <p className="font-semibold text-gray-800 leading-relaxed">{selectedOrder.shipping_address || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transit/Logistics Info if Dispatched */}
              {selectedOrder.status.toLowerCase() === 'dispatched' && (
                <div className="bg-purple-50/50 rounded-2xl p-5 border border-purple-100 space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-purple-200/50 text-purple-700">
                    <Truck className="w-4.5 h-4.5" />
                    <h4 className="font-extrabold text-sm">Logistics & Dispatch Information</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <p className="text-purple-500/70 font-bold uppercase tracking-wider text-[9px] mb-0.5">Carrier / Transporter</p>
                      <p className="font-semibold text-purple-900">{selectedOrder.transporter_name || 'Not Specified'}</p>
                    </div>
                    <div>
                      <p className="text-purple-500/70 font-bold uppercase tracking-wider text-[9px] mb-0.5">Vehicle Number</p>
                      <p className="font-semibold text-purple-900">{selectedOrder.vehicle_number || 'Not Specified'}</p>
                    </div>
                    <div>
                      <p className="text-purple-500/70 font-bold uppercase tracking-wider text-[9px] mb-0.5">Tracking Number</p>
                      <p className="font-semibold text-purple-900">{selectedOrder.tracking_number || 'Not Specified'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Line Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Package className="w-4.5 h-4.5 text-adab-green" />
                    <h4 className="font-extrabold text-sm text-gray-900">Items Ordered</h4>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">{orderItems.length} Product SKU(s)</span>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {orderItems.map((item: any) => (
                    <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                          {item.product_image ? (
                            <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{item.product_name || `Product ID: ${item.product_id}`}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Qty: {item.quantity} units @ ${Number(item.unit_price).toFixed(2)}</p>
                        </div>
                      </div>
                      <p className="text-xs font-extrabold text-gray-900">₹{(Number(item.unit_price) * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                  <p className="text-sm font-bold text-gray-800">Grand Total</p>
                  <p className="text-lg font-black text-adab-green">₹{Number(selectedOrder.total_amount).toFixed(2)}</p>
                </div>
              </div>

              {/* Status History Timeline */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                  <Clock className="w-4.5 h-4.5 text-adab-green" />
                  <h4 className="font-extrabold text-sm text-gray-900">Status History & Logs</h4>
                </div>
                <div className="relative pl-6 border-l border-gray-200 ml-3 space-y-6">
                  {orderHistory.length > 0 ? (
                    orderHistory.map((log: any, idx: number) => {
                      const logDateStr = new Date(log.changed_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <div key={log.id || idx} className="relative">
                          {/* Indicator Point */}
                          <div className={`absolute -left-[31px] w-4.5 h-4.5 rounded-full border-4 border-white flex items-center justify-center ${
                            idx === 0 ? 'bg-adab-green scale-110 shadow-sm' : 'bg-gray-300'
                          }`} />
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold uppercase tracking-wider ${
                                idx === 0 ? 'text-gray-900 font-extrabold' : 'text-gray-500'
                              }`}>{log.status}</span>
                              <span className="text-[10px] text-gray-400 font-semibold">{logDateStr}</span>
                            </div>
                            {log.notes && <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100 leading-relaxed">{log.notes}</p>}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="relative">
                      <div className="absolute -left-[31px] w-4.5 h-4.5 rounded-full border-4 border-white bg-adab-green" />
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-900">Order Placed</span>
                        <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100 mt-1">Pending approval from distributor.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center justify-end gap-3 shrink-0">
              <button 
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
              >
                Close Details
              </button>

              {/* Actions based on status */}
              {selectedOrder.status === 'pending' && (
                <>
                  <button 
                    onClick={() => handleOpenActionModal(selectedOrder.id, 'accept')}
                    className="px-5 py-3 bg-adab-green hover:bg-green-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-green-900/10"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Accept Order
                  </button>
                  <button 
                    onClick={() => handleOpenActionModal(selectedOrder.id, 'reject')}
                    className="px-5 py-3 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject Order
                  </button>
                </>
              )}

              {selectedOrder.status === 'accepted' && (
                <button 
                  onClick={() => handleOpenActionModal(selectedOrder.id, 'process')}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  Start Processing
                </button>
              )}

              {selectedOrder.status === 'processing' && (
                <button 
                  onClick={() => handleOpenActionModal(selectedOrder.id, 'packed')}
                  className="px-5 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                >
                  <Package className="w-3.5 h-3.5" />
                  Mark Order Packed
                </button>
              )}

              {selectedOrder.status === 'packed' && (
                <button 
                  onClick={() => handleOpenDispatchModal(selectedOrder.id)}
                  className="px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                >
                  <Truck className="w-3.5 h-3.5" />
                  Dispatch Order
                </button>
              )}

              {selectedOrder.status === 'dispatched' && (
                <button 
                  onClick={() => handleOpenActionModal(selectedOrder.id, 'delivered')}
                  className="px-5 py-3 bg-adab-green hover:bg-green-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-green-900/10"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Mark Delivered
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Notes Input Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-950/40 backdrop-blur-sm" onClick={handleCloseActionModal} />
          
          <div className="bg-white border border-gray-200 w-full max-w-md rounded-3xl shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-adab-green uppercase tracking-widest mb-1">Confirm order action</p>
                <h3 className="text-lg font-bold text-gray-900">
                  {showNotesModal === 'accept' && 'Accept Order'}
                  {showNotesModal === 'reject' && 'Reject Order'}
                  {showNotesModal === 'process' && 'Start Order Processing'}
                  {showNotesModal === 'packed' && 'Mark Packed'}
                  {showNotesModal === 'delivered' && 'Mark Delivered'}
                </h3>
              </div>
              <button 
                onClick={handleCloseActionModal}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOrderAction} className="p-6 space-y-4">
              {showNotesModal === 'reject' && (
                <div className="flex gap-2.5 p-3.5 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>Rejecting this order will release the retailer credit hold and restore all ordered stock quantities to your inventory pool.</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest">
                  {showNotesModal === 'reject' ? 'Rejection Reason Note' : 'Status update note (optional)'}
                </label>
                <textarea 
                  rows={4}
                  placeholder={showNotesModal === 'reject' ? 'Describe why you are rejecting/cancelling this order...' : 'Add any remarks or execution logs for this order stage...'}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-adab-green/20 focus:border-adab-green outline-none transition-all resize-none" 
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  required={showNotesModal === 'reject'}
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={handleCloseActionModal}
                  className="px-5 py-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className={`px-6 py-3 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg ${
                    showNotesModal === 'reject' 
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-900/10' 
                      : 'bg-adab-green hover:bg-green-800 shadow-green-900/10'
                  }`}
                >
                  Confirm Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispatch Logistics Modal */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-950/40 backdrop-blur-sm" onClick={() => { setShowDispatchModal(false); setActionOrderId(null); }} />
          
          <div className="bg-white border border-gray-200 w-full max-w-lg rounded-3xl shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-adab-green uppercase tracking-widest mb-1">Mark Order Dispatched</p>
                <h3 className="text-lg font-bold text-gray-900">Logistics & Transporter Setup</h3>
              </div>
              <button 
                onClick={() => { setShowDispatchModal(false); setActionOrderId(null); }}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchOrder} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest">Transporter / Logistics Partner</label>
                <input 
                  type="text" 
                  placeholder="e.g. Blue Dart, DHL, Self Fleet"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-adab-green/20 focus:border-adab-green outline-none transition-all" 
                  value={transporterName}
                  onChange={(e) => setTransporterName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest">Vehicle Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g. MH-12-PQ-1234"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-adab-green/20 focus:border-adab-green outline-none transition-all" 
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest">Tracking Reference ID</label>
                  <input 
                    type="text" 
                    placeholder="e.g. TRK98394839"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-adab-green/20 focus:border-adab-green outline-none transition-all" 
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest">Dispatch remarks (optional)</label>
                <textarea 
                  rows={3}
                  placeholder="Add details about dispatch conditions or delivery ETA..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-adab-green/20 focus:border-adab-green outline-none transition-all resize-none" 
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => { setShowDispatchModal(false); setActionOrderId(null); }}
                  className="px-5 py-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-3 bg-adab-green hover:bg-green-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-green-900/10"
                >
                  <Truck className="w-3.5 h-3.5" />
                  Dispatch Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopOrdersPage;
