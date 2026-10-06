import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Calendar,
  Search,
  ArrowRight,
  Info,
  History,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Plus,
  DollarSign,
  Package,
  X,
  Loader2
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import distributorService from '../../services/distributorService';
import { useNotification } from '../../context/NotificationContext';
import { useSocket } from '../../context/useSocket';
import RFQNegotiationModal, { RFQItem } from '../../components/RFQNegotiationModal';

const RequestStatusPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<number | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total_requests: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const [error, setError] = useState<string | null>(null);

  // RFQ Negotiation Modal State
  const [selectedRfq, setSelectedRfq] = useState<RFQItem | null>(null);
  const [isNegotiationOpen, setIsNegotiationOpen] = useState(false);

  // New RFQ Creation Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [isCreatingRfq, setIsCreatingRfq] = useState(false);
  const [createForm, setCreateForm] = useState({
    manufacturer_id: '',
    product_name: '',
    target_price: '',
    quantity: '100',
    deadline: '',
    description: ''
  });

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await distributorService.getRequestStatus();
      if (response.success) {
        setRequests(response.data || []);
        if (response.stats) {
          setStats(response.stats);
        }
      } else {
        const msg = response.message || "Failed to retrieve partnership status";
        setError(msg);
        showError(msg);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Internal network error while tracking requests";
      setError(msg);
      showError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  const fetchManufacturers = useCallback(async () => {
    try {
      const res = await distributorService.getAvailableManufacturers();
      if (res.success && res.data) {
        setManufacturers(res.data);
      }
    } catch (e) {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchManufacturers();
  }, [fetchRequests, fetchManufacturers]);

  // Real-time socket event listeners (Day 1 infrastructure reuse)
  useSocket({
    event: 'RFQ_COUNTER_OFFER',
    handler: () => {
      fetchRequests();
    }
  });

  useSocket({
    event: 'RFQ_UPDATE',
    handler: () => {
      fetchRequests();
    }
  });

  const handleAccept = async (id: number) => {
    setIsActionLoading(id);
    try {
      const response = await distributorService.acceptConnectionRequest(id);
      if (response.success) {
        showSuccess(response.message || "Connection invitation accepted");
        await fetchRequests();
      } else {
        showError(response.message || "Failed to accept connection invitation");
      }
    } catch (err: any) {
      showError(err.response?.data?.message || "An error occurred while accepting connection");
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    setIsActionLoading(id);
    try {
      const response = await distributorService.rejectConnectionRequest(id);
      if (response.success) {
        showSuccess(response.message || "Connection invitation declined");
        await fetchRequests();
      } else {
        showError(response.message || "Failed to decline connection invitation");
      }
    } catch (err: any) {
      showError(err.response?.data?.message || "An error occurred while declining connection");
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleCreateRfqSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.manufacturer_id) {
      showError('Please select a target manufacturer');
      return;
    }
    const price = parseFloat(createForm.target_price);
    if (isNaN(price) || price <= 0) {
      showError('Please specify a valid target price');
      return;
    }

    setIsCreatingRfq(true);
    try {
      const res = await distributorService.createRFQ({
        manufacturer_id: parseInt(createForm.manufacturer_id),
        target_price: price,
        quantity: parseInt(createForm.quantity) || 1,
        product_name: createForm.product_name || 'Bulk Procurement Request',
        description: createForm.description,
        deadline: createForm.deadline ? new Date(createForm.deadline).toISOString() : undefined
      });

      if (res.success) {
        showSuccess('RFQ created and transmitted to manufacturer!');
        setIsCreateModalOpen(false);
        setCreateForm({
          manufacturer_id: '',
          product_name: '',
          target_price: '',
          quantity: '100',
          deadline: '',
          description: ''
        });
        await fetchRequests();
      } else {
        showError(res.message || 'Failed to create RFQ');
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Error transmitting RFQ');
    } finally {
      setIsCreatingRfq(false);
    }
  };

  return (
    <div className="space-y-8 md:space-y-10 animate-in fade-in duration-500 pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          <div className="flex items-center gap-2 text-adab-orange mb-1.5">
            <ClipboardList className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Application & RFQ Tracking</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-dark-text-secondary tracking-tight leading-none uppercase">Request Registry</h1>
          <p className="mt-1.5 text-sm text-gray-500 font-medium">Review partnership invitations and negotiate quotations with manufacturers.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-adab-orange hover:bg-orange-700 text-white transition-all flex items-center gap-2 shadow-lg shadow-orange-900/10 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            New RFQ Quote
          </button>
          <button
            onClick={fetchRequests}
            className="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary text-gray-500 hover:bg-gray-50 dark:hover:bg-dark-surface-hover transition-all flex items-center gap-2 shadow-sm active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Sync Status
          </button>
        </div>
      </div>

      {/* Summary Analytics Banner */}
      <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-[2rem] p-8 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-10 md:gap-16">
        <div className="sm:border-r sm:border-gray-100 last:border-0 pb-6 sm:pb-0 border-b sm:border-b-0 border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Total Transmitted</p>
          <p className="text-3xl md:text-4xl font-black text-gray-900 dark:text-dark-text-secondary tracking-tighter">
            {isLoading ? '...' : stats.total_requests}
          </p>
        </div>
        <div className="sm:border-r sm:border-gray-100 last:border-0 pb-6 sm:pb-0 border-b sm:border-b-0 border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 text-blue-600">Pending Review</p>
          <p className="text-3xl md:text-4xl font-black text-gray-900 dark:text-dark-text-secondary tracking-tighter">
             {isLoading ? '...' : stats.pending}
          </p>
        </div>
        <div className="last:border-0">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 text-adab-green">Active / Accepted</p>
          <p className="text-3xl md:text-4xl font-black text-gray-900 dark:text-dark-text-secondary tracking-tighter">
             {isLoading ? '...' : stats.approved}
          </p>
        </div>
      </div>

      {/* Registry Table */}
      <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-[2rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Manufacturer Entity</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type / Scope</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Date</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Negotiation / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-8 py-6"><div className="h-10 w-full bg-gray-100 rounded-xl" /></td>
                    <td className="px-8 py-6"><div className="h-6 w-24 bg-gray-50 rounded mx-auto" /></td>
                    <td className="px-8 py-6"><div className="h-6 w-32 bg-gray-50 rounded mx-auto" /></td>
                    <td className="px-8 py-6"><div className="h-8 w-24 bg-gray-100 rounded-full ml-auto" /></td>
                  </tr>
                ))
              ) : requests.length > 0 ? (
                requests.map((req) => {
                  const isRfq = req.request_type === 'RFQ' || req.target_price !== null && req.target_price !== undefined;
                  return (
                    <tr key={req.id} className="hover:bg-gray-50/30 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-adab-orange group-hover:shadow-lg group-hover:shadow-orange-900/5 transition-all shrink-0">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-gray-900 dark:text-dark-text-secondary group-hover:text-adab-orange transition-colors truncate">
                              {req.manufacturer_name || req.name}
                            </p>
                            <p className="text-[10px] text-gray-400 font-mono font-bold tracking-widest truncate mt-0.5 uppercase">
                              {req.unique_request_id || `ID: ${req.manufacturer_id || req.id}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider w-fit border ${
                            isRfq ? 'bg-orange-50 text-adab-orange border-orange-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                          }`}>
                            {isRfq ? 'RFQ Quotation' : 'Partnership'}
                          </span>
                          {isRfq && req.target_price && (
                            <span className="text-[11px] font-black text-gray-700">
                              Target: ₹{Number(req.target_price).toFixed(2)}
                              {req.counter_price && (
                                <span className="text-amber-700 ml-1.5 font-bold">
                                  | Counter: ₹{Number(req.counter_price).toFixed(2)}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-600">
                          <Calendar className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                          {req.request_date ? new Date(req.request_date).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {isRfq ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedRfq(req);
                                setIsNegotiationOpen(true);
                              }}
                              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                            >
                              <TrendingUp className="w-3.5 h-3.5" />
                              Review / Negotiate
                            </button>
                          </div>
                        ) : req.current_status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleAccept(req.id)}
                              disabled={isActionLoading === req.id}
                              className="px-4 py-2 bg-adab-green hover:bg-green-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleReject(req.id)}
                              disabled={isActionLoading === req.id}
                              className="px-4 py-2 bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary hover:bg-gray-50 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95"
                            >
                              Decline
                            </button>
                          </div>
                        ) : (
                          <StatusBadge status={req.current_status || req.status} className="shadow-sm" />
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center max-w-sm mx-auto">
                      <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-8 border border-gray-100 shadow-inner">
                        {error ? <AlertCircle className="w-12 h-12 text-adab-orange" /> : <History className="w-12 h-12 text-gray-200" />}
                      </div>
                      <h3 className="text-xl font-extrabold text-gray-900 dark:text-dark-text-secondary tracking-tight mb-3 leading-none uppercase">
                        {error ? "Synchronisation Error" : "No Requests Found"}
                      </h3>
                      <p className="text-gray-500 text-sm font-medium leading-relaxed">
                        {error ? error : "You haven't transmitted any RFQs or received partnership invitations yet."}
                      </p>
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="mt-8 inline-flex items-center px-8 py-3.5 bg-adab-orange text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-orange-900/10 hover:bg-orange-700 transition-all active:scale-95"
                      >
                        Create First RFQ
                        <ArrowRight className="w-4 h-4 ml-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Information Footer */}
      <div className="p-8 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 border border-blue-100 dark:border-blue-500/20 rounded-[2rem] flex items-start gap-6 shadow-sm shadow-blue-900/5">
        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary flex items-center justify-center text-blue-500 shadow-sm shrink-0">
          <Info className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-black text-gray-900 dark:text-dark-text-secondary uppercase tracking-widest leading-none">RFQ Quotation Engine</h4>
          <p className="text-xs text-gray-600 font-medium leading-relaxed max-w-2xl">
            Propose target prices directly to manufacturers, receive counter-offers in real-time, and accept or reject quotes seamlessly.
          </p>
        </div>
      </div>

      {/* RFQ Negotiation Modal (Role: Distributor) */}
      <RFQNegotiationModal
        isOpen={isNegotiationOpen}
        onClose={() => setIsNegotiationOpen(false)}
        rfq={selectedRfq}
        userRole="distributor"
        onSuccess={() => {
          fetchRequests();
        }}
      />

      {/* New RFQ Creation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] max-w-lg w-full shadow-2xl border border-gray-100 p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 uppercase">Create RFQ</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Request for Quotation</p>
                </div>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRfqSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                  Target Manufacturer *
                </label>
                <select
                  value={createForm.manufacturer_id}
                  onChange={(e) => setCreateForm({ ...createForm, manufacturer_id: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white"
                  required
                >
                  <option value="">Select Manufacturer...</option>
                  {manufacturers.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.company_name || m.manufacturer_name || `Manufacturer #${m.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                  Product / Procurement Scope *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bulk Wheat Flour 50kg Bags"
                  value={createForm.product_name}
                  onChange={(e) => setCreateForm({ ...createForm, product_name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                    Target Unit Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    placeholder="e.g. 450.00"
                    value={createForm.target_price}
                    onChange={(e) => setCreateForm({ ...createForm, target_price: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                    Quantity (Units)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={createForm.quantity}
                    onChange={(e) => setCreateForm({ ...createForm, quantity: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                  Required By Deadline
                </label>
                <input
                  type="date"
                  value={createForm.deadline}
                  onChange={(e) => setCreateForm({ ...createForm, deadline: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                  Notes / Specification Details
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional order terms or specifications..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRfq}
                  className="px-6 py-2.5 bg-adab-orange hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {isCreatingRfq ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Transmit RFQ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default RequestStatusPage;