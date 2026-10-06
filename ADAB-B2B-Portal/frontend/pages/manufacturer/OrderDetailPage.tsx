import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ClipboardList,
  Clock,
  Truck,
  CheckCircle2,
  FileText,
  Mail,
  Phone,
  MapPin,
  Building2,
  Package,
  Download,
  AlertCircle,
  ArrowUpRight,
  Check,
  X,
  History,
  Info,
  Loader2,
  IndianRupee
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import RecordPaymentModal from '../../components/payments/RecordPaymentModal';
import CreditNoteModal from '../../components/payments/CreditNoteModal';
import { useNotification } from '../../context/NotificationContext';
import orderService from '../../services/orderService';
import { driverService, Driver } from '../../services/driverService';
import { vehicleService, Vehicle } from '../../services/vehicleService';
import LogisticsDispatchModal from '../../components/manufacturer/LogisticsDispatchModal';
import { OrderTimeline } from '../../components/orders/OrderTimeline';

// Logistics providers list
const LOGISTICS_PROVIDERS = [
  { id: 1, name: 'DHL Express', type: 'International' },
  { id: 2, name: 'FedEx', type: 'International' },
  { id: 3, name: 'UPS', type: 'International' },
  { id: 4, name: 'Blue Dart', type: 'Domestic' },
  { id: 5, name: 'DTDC', type: 'Domestic' },
  { id: 6, name: 'Ecom Express', type: 'Domestic' },
  { id: 7, name: 'Aramex', type: 'International' },
  { id: 8, name: 'TCI Express', type: 'Domestic' },
  { id: 9, name: 'Shiprocket', type: 'Aggregator' },
  { id: 10, name: 'Local Courier', type: 'Local' }
];

const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string>('pending');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState<'accept' | 'reject' | 'dispatch' | 'deliver' | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Delivery Partner Modal
  const [showDeliveryPartnerModal, setShowDeliveryPartnerModal] = useState(false);
  const [selectedDeliveryPartner, setSelectedDeliveryPartner] = useState('');

  // Dispatch modal states
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [transporterName, setTransporterName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [dispatchNotes, setDispatchNotes] = useState('');

  // Delivery Assignment states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<number | ''>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | ''>('');
  const [podPhoto, setPodPhoto] = useState<string>('');
  const [podSignature, setPodSignature] = useState<string>('');
  const [podNotes, setPodNotes] = useState<string>('');

  const fetchAssignmentData = async () => {
    try {
      const [driversRes, vehiclesRes] = await Promise.all([
        driverService.getDrivers(undefined),
        vehicleService.getVehicles(undefined, undefined, 'true')
      ]);
      if (driversRes.success) setAvailableDrivers(driversRes.data.filter((d: Driver) => d.status === 'active' && d.is_available));
      if (vehiclesRes.success) setAvailableVehicles(vehiclesRes.data.filter((v: Vehicle) => v.status === 'active' && v.is_available));
    } catch (err) {
      console.error(err);
    }
  };
  const handleOpenAssignModal = () => {};
  const handleAssignDelivery = (e: any) => {};

  useEffect(() => {
    fetchOrderData();
  }, [id]);

  const fetchOrderData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [orderRes, historyRes, invoiceRes] = await Promise.all([
        orderService.getOrderById(id),
        orderService.getTimeline(id),
        // use apiClient directly if no method exists
        import('../../services/apiClient').then(m => m.default.get(`/invoices?order_id=${id}`)).catch(() => ({ data: { data: [] } }))
      ]);

      if (orderRes.success && orderRes.data) {
        const orderData = orderRes.data.order || orderRes.data;
        setOrder(orderData);
        setCurrentStatus(orderData.status?.toLowerCase() || 'pending');
      } else {
        showError(orderRes.message || 'Order not found');
      }

      if (historyRes.success) {
        setHistory(historyRes.data || []);
      }

      const invData = invoiceRes?.data?.data;
      if (invData && invData.length > 0) {
        setInvoice(invData[0]);
      } else {
        setInvoice(null);
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to load order details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptOrder = async () => {
    if (!id) return;
    setIsActionLoading(true);
    try {
      const response = await orderService.acceptOrder(id, { notes: 'Order accepted via B2B portal' });
      if (response.success) {
        setCurrentStatus('accepted');
        showSuccess('Order accepted successfully');
        setShowConfirmModal(null);
        await fetchOrderData();
      } else {
        showError(response.message || 'Failed to accept order');
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'An error occurred');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRejectOrder = async () => {
    if (!id || !rejectReason.trim()) {
      showError('Rejection reason is required');
      return;
    }
    setIsActionLoading(true);
    try {
      const response = await orderService.rejectOrder(id, { rejection_reason: rejectReason });
      if (response.success) {
        setCurrentStatus('rejected');
        showSuccess('Order rejected successfully');
        setShowConfirmModal(null);
        setRejectReason('');
        await fetchOrderData();
      } else {
        showError(response.message || 'Failed to reject order');
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'An error occurred');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStartProcessing = async () => {
    if (!id) return;
    setIsActionLoading(true);
    try {
      const response = await orderService.startProcessing(id, { notes: 'Processing started' });
      if (response.success) {
        setCurrentStatus('processing');
        showSuccess('Order processing started');
        await fetchOrderData();
      } else {
        showError(response.message || 'Failed to start processing');
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'An error occurred');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMarkReadyForDispatch = async () => {
    if (!id) return;
    setIsActionLoading(true);
    try {
      const response = await orderService.markReadyForDispatch(id, {
        notes: `Order marked as ready for dispatch`,
      });
      if (response.success) {
        setCurrentStatus('ready_for_dispatch');
        showSuccess('Order marked ready for dispatch');
        await fetchOrderData();
      } else {
        showError(response.message || 'Failed to mark ready for dispatch');
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'An error occurred');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDispatchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !order) return;

    let payload: any = { dispatch_date: dispatchDate, notes: dispatchNotes || undefined };

    if (order.delivery_mode === 'THIRD_PARTY') {
      if (!transporterName.trim() || !trackingNumber.trim()) {
        showError('Transporter name and tracking number are required');
        return;
      }
      payload.transporter_name = transporterName;
      payload.tracking_number = trackingNumber;
    } else if (order.delivery_mode === 'SELF') {
      if (!selectedDriverId || !selectedVehicleId) {
        showError('Driver and Vehicle are required for self delivery');
        return;
      }
      payload.driver_id = selectedDriverId;
      payload.vehicle_id = selectedVehicleId;
      payload.tracking_number = trackingNumber || undefined;
    }

    setIsActionLoading(true);
    try {
      const response = await orderService.dispatchOrder(id, payload);

      if (response.success) {
        setCurrentStatus('dispatched');
        showSuccess('Order dispatched successfully');
        setShowDispatchModal(false);
        resetDispatchForm();
        await fetchOrderData();
      } else {
        showError(response.message || 'Failed to dispatch order');
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'An error occurred');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMarkOutForDelivery = async () => {
    if (!id) return;
    setIsActionLoading(true);
    try {
      const response = await orderService.outForDelivery(id);
      if (response.success) {
        setCurrentStatus('out_for_delivery');
        showSuccess('Order marked out for delivery');
        await fetchOrderData();
      } else {
        showError(response.message || 'Failed to mark out for delivery');
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'An error occurred');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!id) return;
    setIsActionLoading(true);
    try {
      const payload = {
        pod_notes: podNotes || 'Order delivered',
        pod_photo: podPhoto,
        pod_signature: podSignature
      };
      const response = await orderService.submitProofOfDelivery(id, payload);
      if (response.success) {
        setCurrentStatus('delivered');
        showSuccess('Order marked as delivered');
        setShowConfirmModal(null);
        await fetchOrderData();
      } else {
        showError(response.message || 'Failed to mark delivered');
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'An error occurred');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!id) return;
    setIsActionLoading(true);
    try {
      const blob = await orderService.downloadInvoicePDF(id);
      // Create a blob URL and show in iframe
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      setPdfUrl(url);

      showSuccess("Invoice generated successfully. Preview is below.");
    } catch (err) {
      showError("Invoice generation failed or not yet available.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const resetDispatchForm = () => {
    setTransporterName('');
    setVehicleNumber('');
    setTrackingNumber('');
    setDispatchDate(new Date().toISOString().split('T')[0]);
    setDispatchNotes('');
  };

  const getActionButtons = () => {
    const buttons = [];

    switch (currentStatus) {
      case 'pending':
      case 'po_submitted':
        buttons.push(
          <button key="accept" disabled={isActionLoading} onClick={() => setShowConfirmModal('accept')} className="px-6 py-3 bg-adab-green text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-green-900/10 hover:bg-green-800 transition-all active:scale-95 disabled:opacity-50">
            Accept Order
          </button>,
          <button key="reject" disabled={isActionLoading} onClick={() => setShowConfirmModal('reject')} className="px-6 py-3 bg-white border border-red-200 text-red-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-50 transition-all active:scale-95">
            Reject Order
          </button>
        );
        break;
      case 'accepted':
        buttons.push(
          <button key="process" disabled={isActionLoading} onClick={handleStartProcessing} className="px-6 py-3 bg-purple-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-purple-900/10 hover:bg-purple-700 transition-all active:scale-95 disabled:opacity-50">
            {isActionLoading ? <Loader2 className="inline w-4 h-4 mr-2 animate-spin" /> : null}
            Start Processing
          </button>
        );
        break;
      case 'processing':
        buttons.push(
          <button key="ready" disabled={isActionLoading} onClick={handleMarkReadyForDispatch} className="px-6 py-3 bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-900/10 hover:bg-orange-700 transition-all active:scale-95 disabled:opacity-50">
            {isActionLoading ? <Loader2 className="inline w-4 h-4 mr-2 animate-spin" /> : null}
            Mark Ready for Dispatch
          </button>
        );
        break;
      case 'ready_for_dispatch':
        buttons.push(
          <button key="dispatch" disabled={isActionLoading} onClick={() => { fetchAssignmentData(); setShowDispatchModal(true); }} className="px-6 py-3 bg-cyan-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-cyan-900/10 hover:bg-cyan-700 transition-all active:scale-95">
            <Truck className="inline w-4 h-4 mr-2" />
            Dispatch Order
          </button>
        );
        break;
      case 'dispatched':
        buttons.push(
          <button key="out_for_delivery" disabled={isActionLoading} onClick={handleMarkOutForDelivery} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-900/10 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
            {isActionLoading ? <Loader2 className="inline w-4 h-4 mr-2 animate-spin" /> : null}
            Mark Out For Delivery
          </button>
        );
        break;
      case 'out_for_delivery':
        buttons.push(
          <button key="deliver" disabled={isActionLoading} onClick={() => setShowConfirmModal('deliver')} className="px-6 py-3 bg-adab-green text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-green-900/10 hover:bg-green-800 transition-all active:scale-95 disabled:opacity-50">
            {isActionLoading ? <Loader2 className="inline w-4 h-4 mr-2 animate-spin" /> : null}
            Mark Delivered (POD)
          </button>
        );
        break;
    }

    if (currentStatus !== 'rejected' && currentStatus !== 'pending') {
      buttons.push(
        <button key="invoice" disabled={isActionLoading} onClick={handleDownloadInvoice} className="px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50">
          {isActionLoading ? <Loader2 className="inline w-4 h-4 mr-2 animate-spin" /> : <Download className="inline w-4 h-4 mr-2" />}
          Invoice
        </button>
      );
    }

    return buttons;
  };

  if (!isLoading && !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
        <AlertCircle className="w-16 h-16 text-adab-orange mb-4" />
        <h2 className="text-2xl font-black text-gray-900">Order Not Found</h2>
        <button onClick={() => navigate('/manufacturer/orders')} className="mt-6 px-8 py-3 bg-adab-green text-white rounded-xl font-black uppercase tracking-widest text-xs">Return to Orders</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-10">
        <div className="flex-1">
          <button onClick={() => navigate('/manufacturer/orders')} className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 hover:text-adab-green">
            <ChevronLeft className="w-4 h-4" /> Back to Orders
          </button>
          <div className="flex items-center gap-3 text-adab-green mb-2">
            <ClipboardList className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Order Details</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 uppercase">{order?.order_number || `ORD-${id}`}</h1>
          <p className="text-sm text-gray-500 mt-3">Ordered on {order ? new Date(order.order_date).toLocaleDateString() : 'N/A'}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {getActionButtons()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Badge */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Current Status</p>
            <StatusBadge status={currentStatus} className="text-base px-4 py-3" />
          </div>

          {/* Distributor Info */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
              <Building2 className="w-5 h-5 text-adab-green" />
              <h3 className="font-black text-gray-900 text-xs uppercase">Distributor Profile</h3>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Company Name</p>
                <p className="text-base font-black text-gray-900">{order?.distributor_company_name || order?.company_name}</p>
              </div>
              <div className="flex gap-3">
                <Mail className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                <p className="text-sm text-gray-600 break-all">{order?.distributor_email}</p>
              </div>
              <div className="flex gap-3">
                <Phone className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                <p className="text-sm text-gray-600">{order?.distributor_mobile}</p>
              </div>
              <div className="flex gap-3">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                <p className="text-sm text-gray-600">{order?.distributor_address}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
              <History className="w-5 h-5 text-adab-orange" />
              <h3 className="font-black text-gray-900 text-xs uppercase">Timeline</h3>
            </div>
            <div className="p-6 space-y-6">
                <OrderTimeline events={history || []} currentStatus={currentStatus} />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
              <Package className="w-5 h-5 text-adab-green" />
              <h3 className="font-black text-gray-900 text-xs uppercase">Order Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase">Product</th>
                    <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase">Qty</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(order?.items || []).map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{item.product_name}</p>
                        <p className="text-[10px] text-gray-400 font-mono mt-1">{item.sku || `SKU-${item.id}`}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-gray-100 rounded-lg text-sm font-bold">{item.quantity}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-gray-600">₹{item.unit_price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {order && (
              <div className="bg-gray-50 px-6 py-6 border-t border-gray-100 flex justify-end">
                <div className="max-w-xs space-y-3">
                  <div className="flex justify-between text-sm font-bold text-gray-600">
                    <span>Subtotal:</span>
                    <span>₹{order.total_amount}</span>
                  </div>
                  <div className="pt-3 border-t border-gray-200 flex justify-between items-end">
                    <span className="text-[10px] font-black text-gray-400 uppercase">Total Amount</span>
                    <span className="text-2xl font-black text-adab-green">₹{order.total_amount}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Invoice & Payments Section */}
          {invoice && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mt-6">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <IndianRupee className="w-5 h-5 text-adab-green" />
                  <h3 className="font-black text-gray-900 text-xs uppercase">Invoice & Payment</h3>
                </div>
                <StatusBadge status={invoice.status} className="text-base px-4 py-3" />
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Invoice No</p>
                    <p className="font-bold text-gray-900">{invoice.invoice_number}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Amount</p>
                    <p className="font-bold text-gray-900">₹{parseFloat(invoice.total_amount).toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Paid Amount</p>
                    <p className="font-bold text-green-600">₹{parseFloat(invoice.paid_amount || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-red-100 bg-red-50/50">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Outstanding</p>
                    <p className="font-bold text-red-600">₹{(parseFloat(invoice.total_amount) - parseFloat(invoice.paid_amount || 0)).toFixed(2)}</p>
                  </div>
                </div>

                {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => setShowCreditModal(true)}
                      className="px-6 py-3 bg-white border border-gray-200 text-gray-900 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95"
                    >
                      Issue Credit
                    </button>
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="px-6 py-3 bg-adab-green text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-green-900/10 hover:bg-green-800 transition-all active:scale-95"
                    >
                      Record Payment
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dispatch Info (if available) */}
          {order && (currentStatus === 'dispatched' || currentStatus === 'delivered') && (
            <div className="bg-cyan-50 border border-cyan-100 rounded-2xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Truck className="w-6 h-6 text-cyan-600 shrink-0 mt-1" />
                <div className="flex-1">
                  <h4 className="text-sm font-black text-gray-900 uppercase">Shipment Details</h4>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    {order.transporter_name && (
                      <div>
                        <p className="text-[10px] font-black text-cyan-600 uppercase">Transporter</p>
                        <p className="font-bold text-gray-900">{order.transporter_name}</p>
                      </div>
                    )}
                    {order.vehicle_number && (
                      <div>
                        <p className="text-[10px] font-black text-cyan-600 uppercase">Vehicle</p>
                        <p className="font-bold text-gray-900">{order.vehicle_number}</p>
                      </div>
                    )}
                    {order.tracking_number && (
                      <div>
                        <p className="text-[10px] font-black text-cyan-600 uppercase">Tracking</p>
                        <p className="font-bold text-gray-900 font-mono">{order.tracking_number}</p>
                      </div>
                    )}
                    {order.dispatch_date && (
                      <div>
                        <p className="text-[10px] font-black text-cyan-600 uppercase">Dispatch Date</p>
                        <p className="font-bold text-gray-900">{new Date(order.dispatch_date).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Assignment Info */}
          {order && order.driver_id && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Truck className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
                <div className="flex-1">
                  <h4 className="text-sm font-black text-gray-900 uppercase">Assigned Delivery</h4>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    {order.driver_id && (
                      <div>
                        <p className="text-[10px] font-black text-blue-600 uppercase">Driver Assigned</p>
                        <p className="font-bold text-gray-900">ID: {order.driver_id}</p>
                      </div>
                    )}
                    {order.vehicle_id && (
                      <div>
                        <p className="text-[10px] font-black text-blue-600 uppercase">Vehicle Assigned</p>
                        <p className="font-bold text-gray-900">ID: {order.vehicle_id}</p>
                      </div>
                    )}
                    {order.assigned_at && (
                      <div className="col-span-2">
                        <p className="text-[10px] font-black text-blue-600 uppercase">Assigned On</p>
                        <p className="font-bold text-gray-900">{new Date(order.assigned_at).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invoice PDF Preview */}
          {pdfUrl && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mt-6 animate-in fade-in duration-500">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-adab-green" />
                  <h3 className="font-black text-gray-900 text-xs uppercase">Invoice Preview</h3>
                </div>
                <button onClick={() => setPdfUrl(null)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="w-full h-[600px]">
                <iframe src={pdfUrl} className="w-full h-full border-none" title="Invoice PDF" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Accept/Reject/Deliver */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-xl">
            {showConfirmModal === 'accept' && (
              <>
                <div className="w-16 h-16 rounded-2xl bg-green-50 text-adab-green flex items-center justify-center mb-6 mx-auto">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-gray-900 text-center uppercase mb-2">Accept Order?</h3>
                <p className="text-center text-gray-600 text-sm mb-6">Order will move to accepted state. You can then start processing it.</p>
                <div className="flex gap-3">
                  <button disabled={isActionLoading} onClick={handleAcceptOrder} className="flex-1 py-3 bg-adab-green text-white rounded-xl font-black uppercase text-xs disabled:opacity-50">
                    Confirm
                  </button>
                  <button onClick={() => setShowConfirmModal(null)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-black uppercase text-xs">
                    Cancel
                  </button>
                </div>
              </>
            )}

            {showConfirmModal === 'reject' && (
              <>
                <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-6 mx-auto">
                  <X className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-gray-900 text-center uppercase mb-2">Reject Order?</h3>
                <p className="text-center text-gray-600 text-sm mb-4">Provide a rejection reason:</p>
                <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection..." className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm mb-6 resize-none" rows={3} />
                <div className="flex gap-3">
                  <button disabled={isActionLoading || !rejectReason.trim()} onClick={handleRejectOrder} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-xs disabled:opacity-50">
                    Reject
                  </button>
                  <button onClick={() => { setShowConfirmModal(null); setRejectReason(''); }} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-black uppercase text-xs">
                    Cancel
                  </button>
                </div>
              </>
            )}

            {showConfirmModal === 'deliver' && (
              <>
                <div className="w-16 h-16 rounded-2xl bg-green-50 text-adab-green flex items-center justify-center mb-6 mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Mark as Delivered (POD)</h3>
                <p className="text-sm text-gray-500 mb-6">Submit Proof of Delivery to close this order.</p>

                <div className="space-y-4 mb-6 text-left">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">POD Photo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const response = await orderService.uploadPODImage(file);
                            if (response.success) {
                              setPodPhoto(response.url);
                            } else {
                              showError(response.message || 'Failed to upload image');
                            }
                          } catch (err: any) {
                            showError(err.response?.data?.message || 'Error uploading image');
                          }
                        }
                      }}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-3 outline-none focus:border-adab-green focus:ring-2 focus:ring-green-900/10 transition-all"
                    />
                    {podPhoto && (
                      <div className="mt-2 relative inline-block">
                        <img src={`http://localhost:8000${podPhoto}`} alt="POD Preview" className="h-20 w-20 object-cover rounded-lg border border-gray-200" />
                        <button onClick={() => setPodPhoto('')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Receiver Signature/Name</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={podSignature}
                      onChange={(e) => setPodSignature(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-3 outline-none focus:border-adab-green focus:ring-2 focus:ring-green-900/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Delivery Notes</label>
                    <textarea
                      value={podNotes}
                      onChange={(e) => setPodNotes(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-3 outline-none focus:border-adab-green focus:ring-2 focus:ring-green-900/10 transition-all min-h-[80px] resize-none"
                      placeholder="Any extra details..."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button onClick={() => setShowConfirmModal(null)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-colors">
                    Cancel
                  </button>
                  <button disabled={isActionLoading} onClick={handleMarkDelivered} className="px-6 py-2.5 bg-adab-green text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-800 transition-all active:scale-95 disabled:opacity-50 flex items-center">
                    {isActionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Submit POD
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}



      <LogisticsDispatchModal
        isOpen={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
        order={order}
        onSuccess={() => {
          fetchOrderData();
        }}
      />

      <RecordPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        invoiceId={invoice?.id}
        invoiceNumber={invoice?.invoice_number}
        outstandingAmount={invoice ? parseFloat(invoice.total_amount) - parseFloat(invoice.paid_amount || 0) : 0}
        distributorId={order?.distributor_id}
        onSuccess={() => {
          fetchOrderData();
        }}
      />

      {invoice && (
        <CreditNoteModal
          isOpen={showCreditModal}
          onClose={() => setShowCreditModal(false)}
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoice_number}
          maxAmount={parseFloat(invoice.total_amount) - parseFloat(invoice.paid_amount || 0)}
          onSuccess={() => {
            showSuccess('Credit note issued successfully');
            fetchOrderData();
          }}
        />
      )}
    </div>
  );
};

export default OrderDetailPage;
