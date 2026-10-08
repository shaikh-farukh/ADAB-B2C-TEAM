import React, { useEffect, useState, useCallback } from 'react';
import apiClient from '../api/apiClient';
import AdminTable from '../components/ui/AdminTable';
import StatusBadge from '../components/ui/StatusBadge';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';

export default function Returns() {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pending' | 'exceptions'
  const [returnsList, setReturnsList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected Return Detail Modal State
  const [selectedReturnId, setSelectedReturnId] = useState(null);
  const [returnDetail, setReturnDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Resolution Action Modal State
  const [resolveModal, setResolveModal] = useState({
    isOpen: false,
    action: 'approve', // 'approve' | 'reject'
    rejectionReason: '',
    notes: '',
    submitting: false
  });

  // Fetch Returns List
  const fetchReturns = useCallback((page = 1) => {
    setLoading(true);
    setError(null);

    let currentStatusFilter = statusFilter;
    if (activeTab === 'pending') {
      currentStatusFilter = 'REQUESTED';
    }

    const params = new URLSearchParams({
      page: page,
      limit: 10,
      search: searchTerm,
      status: currentStatusFilter,
      exceptions: activeTab === 'exceptions' ? 'true' : 'false'
    });

    apiClient.get(`/returns?${params.toString()}`)
      .then(res => {
        if (res.data.success) {
          setReturnsList(res.data.data || []);
          if (res.data.pagination) {
            setPagination(res.data.pagination);
          }
        }
      })
      .catch(err => {
        console.error('Failed to load returns', err);
        setError(err.response?.data?.message || 'Failed to load returns requests');
      })
      .finally(() => setLoading(false));
  }, [searchTerm, statusFilter, activeTab]);

  useEffect(() => {
    fetchReturns(1);
  }, [fetchReturns]);

  // Fetch Return Details
  const fetchReturnDetail = useCallback((returnId) => {
    if (!returnId) return;
    setDetailLoading(true);
    setDetailError(null);

    apiClient.get(`/returns/${returnId}`)
      .then(res => {
        if (res.data.success) {
          setReturnDetail(res.data.data);
        }
      })
      .catch(err => {
        console.error('Failed to load return detail', err);
        setDetailError(err.response?.data?.message || 'Failed to load return details');
      })
      .finally(() => setDetailLoading(false));
  }, []);

  const handleOpenDetail = (id) => {
    setSelectedReturnId(id);
    fetchReturnDetail(id);
  };

  const handleCloseDetail = () => {
    setSelectedReturnId(null);
    setReturnDetail(null);
    setDetailError(null);
  };

  const handleOpenResolveModal = (actionType) => {
    setResolveModal({
      isOpen: true,
      action: actionType,
      rejectionReason: '',
      notes: '',
      submitting: false
    });
  };

  const handleResolveSubmit = () => {
    if (!selectedReturnId) return;
    if (resolveModal.action === 'reject' && (!resolveModal.rejectionReason || !resolveModal.rejectionReason.trim())) {
      alert('Rejection reason is required when rejecting a return.');
      return;
    }

    setResolveModal(prev => ({ ...prev, submitting: true }));

    apiClient.post(`/returns/${selectedReturnId}/resolve`, {
      action: resolveModal.action,
      rejection_reason: resolveModal.rejectionReason,
      notes: resolveModal.notes
    })
      .then(res => {
        if (res.data.success) {
          setResolveModal({ isOpen: false, action: 'approve', rejectionReason: '', notes: '', submitting: false });
          // Refresh detail & list
          fetchReturnDetail(selectedReturnId);
          fetchReturns(pagination.page);
        }
      })
      .catch(err => {
        alert(err.response?.data?.message || 'Failed to resolve return request');
        setResolveModal(prev => ({ ...prev, submitting: false }));
      });
  };

  const columns = [
    {
      header: 'Return ID / Order',
      render: (row) => (
        <div>
          <button 
            onClick={() => handleOpenDetail(row.id)}
            className="font-bold text-indigo-600 hover:underline text-left block text-xs"
          >
            RET-{String(row.id).substring(0, 8)}
          </button>
          <div className="text-[11px] text-gray-500 font-mono">Order: #{row.order_number}</div>
        </div>
      )
    },
    {
      header: 'Customer',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800 text-xs">{row.customer_name || 'Customer'}</div>
          <div className="text-[11px] text-slate-500">{row.customer_phone || row.customer_email || 'N/A'}</div>
        </div>
      )
    },
    {
      header: 'Store',
      render: (row) => <span className="text-xs text-slate-700 font-medium">{row.store_name || 'Store'}</span>
    },
    {
      header: 'Return Reason',
      accessor: 'reason',
      render: (row) => (
        <span className="text-xs text-slate-700 italic truncate max-w-[180px] block" title={row.reason}>
          "{row.reason}"
        </span>
      )
    },
    {
      header: 'Refund Amount',
      render: (row) => (
        <span className="font-bold text-slate-900 text-xs">
          ₹{Number(row.refund_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      header: 'Requested Date',
      render: (row) => (
        <span className="text-xs text-slate-500">
          {new Date(row.requested_at).toLocaleDateString()}
        </span>
      )
    },
    {
      header: 'Actions',
      render: (row) => (
        <button
          onClick={() => handleOpenDetail(row.id)}
          className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 font-semibold text-xs hover:bg-indigo-100 transition"
        >
          {row.status === 'REQUESTED' ? 'Inspect & Resolve' : 'View Details'}
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Returns Management</h1>
          <p className="text-sm text-slate-500">Inspect customer return requests and execute canonical resolution workflows</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Returns
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-700 hover:text-amber-900'
            }`}
          >
            Pending Resolution
          </button>
          <button
            onClick={() => setActiveTab('exceptions')}
            className={`px-3 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'exceptions' ? 'bg-rose-500 text-white shadow-sm' : 'text-rose-600 hover:text-rose-800'
            }`}
          >
            <i className="fa-solid fa-triangle-exclamation"></i>
            Exceptions
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-gray-400 text-xs"></i>
          <input
            type="text"
            placeholder="Search by order #, customer name or return ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-xl outline-none focus:border-indigo-400"
          />
        </div>

        {activeTab !== 'pending' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border rounded-xl outline-none focus:border-indigo-400 bg-white"
          >
            <option value="">All Return Statuses</option>
            <option value="REQUESTED">REQUESTED (Pending)</option>
            <option value="APPROVED">APPROVED</option>
            <option value="ITEM_PICKED">ITEM_PICKED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        )}

        {(searchTerm || statusFilter) && (
          <button
            onClick={() => { setSearchTerm(''); setStatusFilter(''); }}
            className="text-xs text-indigo-600 font-bold px-2 py-2 hover:underline shrink-0"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Returns Table */}
      <AdminTable
        columns={columns}
        data={returnsList}
        loading={loading}
        emptyMessage="No return requests found."
      />

      {/* Pagination */}
      {!loading && returnsList.length > 0 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(p) => fetchReturns(p)}
        />
      )}

      {/* Return Detail Modal */}
      {selectedReturnId && (
        <Modal
          isOpen={true}
          onClose={handleCloseDetail}
          title={`Return Inspection - RET-${String(selectedReturnId).substring(0, 8)}`}
        >
          {detailLoading ? (
            <div className="py-12 text-center text-slate-500 font-medium">Loading Return Details...</div>
          ) : detailError ? (
            <div className="p-4 bg-rose-50 text-rose-700 rounded-xl text-sm">{detailError}</div>
          ) : returnDetail ? (
            <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
              
              {/* Return Header */}
              <div className="bg-slate-50 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 border border-slate-200/80">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-800">Return Request</span>
                    <StatusBadge status={returnDetail.status} />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Associated Order: <span className="font-semibold text-indigo-600">#{returnDetail.order_number}</span> • Store: <span className="font-semibold text-slate-700">{returnDetail.store_name || 'Store'}</span>
                  </div>
                </div>

                {returnDetail.status === 'REQUESTED' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenResolveModal('approve')}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition shadow-sm"
                    >
                      <i className="fa-solid fa-check mr-1.5"></i> Approve Return
                    </button>
                    <button
                      onClick={() => handleOpenResolveModal('reject')}
                      className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition shadow-sm"
                    >
                      <i className="fa-solid fa-xmark mr-1.5"></i> Reject Return
                    </button>
                  </div>
                )}
              </div>

              {/* Reason & Amount Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card p-4 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Return Reason</h3>
                  <div className="text-sm font-semibold text-slate-800 italic">"{returnDetail.reason}"</div>
                  {returnDetail.rejection_reason && (
                    <div className="mt-2 p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-700">
                      <strong>Rejection Reason:</strong> {returnDetail.rejection_reason}
                    </div>
                  )}
                </div>

                <div className="card p-4 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Refund Amount</h3>
                  <div className="text-xl font-black text-slate-900">
                    ₹{Number(returnDetail.refund_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-slate-500">
                    Requested on {new Date(returnDetail.requested_at).toLocaleString()}
                    {returnDetail.resolved_at && ` • Resolved on ${new Date(returnDetail.resolved_at).toLocaleString()}`}
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="card p-4 space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer Details</h3>
                <div className="text-sm font-semibold text-slate-800">{returnDetail.customer_name || 'Customer'}</div>
                <div className="text-xs text-slate-600">Phone: {returnDetail.customer_phone || 'N/A'} | Email: {returnDetail.customer_email || 'N/A'}</div>
              </div>

              {/* Returned Items Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Returned Items ({returnDetail.items?.length || 0})</h3>
                <div className="border rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b">
                      <tr>
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Condition</th>
                        <th className="p-3">Qty</th>
                        <th className="p-3">Item Reason</th>
                        <th className="p-3 text-right">Refund Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {returnDetail.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-semibold text-slate-800">{item.product_name || 'Item'}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-[10px] text-slate-700">
                              {item.item_condition || 'SEALED'}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-800">{item.quantity}</td>
                          <td className="p-3 text-slate-600 italic">{item.reason || 'N/A'}</td>
                          <td className="p-3 text-right font-bold text-slate-900">₹{Number(item.refund_amount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Refund Status */}
              {returnDetail.refunds && returnDetail.refunds.length > 0 && (
                <div className="card p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Refund Status & Gateway Ledger</h3>
                  <div className="space-y-2 text-xs">
                    {returnDetail.refunds.map((rf, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded-lg border flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-800">
                            Refund Amount: ₹{Number(rf.amount).toFixed(2)} via {rf.refund_mode}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Gateway Ref: <span className="font-mono">{rf.gateway_refund_id || 'LOCAL_CREDIT'}</span> • {new Date(rf.created_at).toLocaleString()}
                          </div>
                        </div>
                        <StatusBadge status={rf.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status History */}
              {returnDetail.status_history && returnDetail.status_history.length > 0 && (
                <div className="card p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Return Lifecycle Audit Log</h3>
                  <div className="space-y-2 text-xs">
                    {returnDetail.status_history.map((hist, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 pb-2 border-b last:border-0 last:pb-0">
                        <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0"></div>
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800">
                            Status: <span className="text-slate-500">{hist.previous_status}</span> → <span className="text-indigo-600">{hist.new_status}</span>
                          </div>
                          {hist.notes && <div className="text-slate-600 italic mt-0.5">"{hist.notes}"</div>}
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Recorded on {new Date(hist.changed_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : null}
        </Modal>
      )}

      {/* Return Resolution Modal */}
      {resolveModal.isOpen && (
        <Modal
          isOpen={true}
          onClose={() => setResolveModal(prev => ({ ...prev, isOpen: false }))}
          title={resolveModal.action === 'approve' ? 'Approve Return Request' : 'Reject Return Request'}
        >
          <div className="space-y-4 text-sm">
            <div className={`p-3 rounded-xl text-xs font-medium ${resolveModal.action === 'approve' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
              {resolveModal.action === 'approve'
                ? 'Approving this return will change status to APPROVED, log the decision, and trigger refund processing.'
                : 'Rejecting this return requires providing an explicit rejection reason for customer transparency.'}
            </div>

            {resolveModal.action === 'reject' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Rejection Reason <span className="text-rose-500">*</span></label>
                <textarea
                  rows={3}
                  placeholder="Explain why this return request is being rejected..."
                  value={resolveModal.rejectionReason}
                  onChange={(e) => setResolveModal(prev => ({ ...prev, rejectionReason: e.target.value }))}
                  className="w-full p-2.5 border rounded-xl outline-none focus:border-rose-400"
                />
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">Audit Notes / Comments (Optional)</label>
              <textarea
                rows={2}
                placeholder="Internal audit notes..."
                value={resolveModal.notes}
                onChange={(e) => setResolveModal(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full p-2.5 border rounded-xl outline-none focus:border-indigo-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setResolveModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl border text-slate-600 font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={resolveModal.submitting}
                onClick={handleResolveSubmit}
                className={`px-4 py-2 rounded-xl text-white font-bold disabled:opacity-50 ${
                  resolveModal.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {resolveModal.submitting ? 'Executing...' : (resolveModal.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
