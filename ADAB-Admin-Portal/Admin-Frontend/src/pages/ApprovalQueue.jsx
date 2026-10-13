import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import AdminTable from '../components/ui/AdminTable';
import StatusBadge from '../components/ui/StatusBadge';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';

export default function ApprovalQueue() {
  const [activeTab, setActiveTab] = useState('product'); // product, seller, customer
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Status and search filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Toast notification state
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }

  // Action confirmation & reasoning modal
  const [modalState, setModalState] = useState({
    isOpen: false,
    id: null,
    itemTitle: '',
    action: null, // 'approve' | 'reject' | 'request-changes' | 'suspend'
    reason: '',
    notes: '',
    validationError: ''
  });

  // Statistics counters
  const [counts, setCounts] = useState({ 
    pending: 0, 
    approved: 0, 
    rejected: 0, 
    changes_requested: 0, 
    suspended: 0, 
    total: 0 
  });

  // History inspection modal
  const [historyModal, setHistoryModal] = useState({ 
    isOpen: false, 
    loading: false, 
    itemTitle: '', 
    data: [] 
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const fetchCounts = () => {
    apiClient.get('/approvals/counts')
      .then(res => {
        if (res.data?.data) {
          setCounts(res.data.data);
        }
      })
      .catch(() => {});
  };

  const fetchApprovals = (type = activeTab, p = 1, st = statusFilter, search = searchTerm) => {
    setLoading(true);
    setError(null);
    fetchCounts();

    if (type === 'product') {
      let url = `/approvals/queue?page=${p}&limit=10`;
      if (st) url += `&status=${st}`;
      if (search && search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

      apiClient.get(url)
        .then(res => {
          setData(res.data.data || []);
          if (res.data.pagination) setPagination(res.data.pagination);
        })
        .catch(() => setError('Failed to load product moderation queue. Please try again.'))
        .finally(() => setLoading(false));
    } else {
      let url = `/approvals?type=${type}&page=${p}&pageSize=10`;
      if (st) url += `&status=${st}`;
      if (search && search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

      apiClient.get(url)
        .then(res => {
          setData(res.data.data || []);
          if (res.data.meta) {
            setPagination({
              page: res.data.meta.page || 1,
              limit: res.data.meta.pageSize || 10,
              total: res.data.meta.total || 0
            });
          }
        })
        .catch(() => setError(`Failed to load ${type} approvals. Please try again.`))
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchApprovals(activeTab, 1, statusFilter, searchTerm);
  }, [activeTab, statusFilter]);

  const viewHistory = (row) => {
    const id = row.id || row.listing_id;
    setHistoryModal({ 
      isOpen: true, 
      loading: true, 
      itemTitle: row.title || row.name || 'Listing', 
      data: [] 
    });

    apiClient.get(`/approvals/product/${id}/history`)
      .then(res => {
        setHistoryModal(prev => ({ 
          ...prev, 
          loading: false, 
          data: res.data.data || [] 
        }));
      })
      .catch(() => {
        setHistoryModal(prev => ({ ...prev, loading: false }));
        showToast('Failed to load approval transition history', 'error');
      });
  };

  const openActionModal = (row, action) => {
    const id = row.id || row.listing_id;
    const title = row.title || row.name || row.entityName || 'Item';
    setModalState({
      isOpen: true,
      id,
      itemTitle: title,
      action,
      reason: '',
      notes: '',
      validationError: ''
    });
  };

  const closeActionModal = () => {
    setModalState({
      isOpen: false,
      id: null,
      itemTitle: '',
      action: null,
      reason: '',
      notes: '',
      validationError: ''
    });
  };

  const submitAction = () => {
    const { id, action, reason, notes, itemTitle } = modalState;
    if (!id || !action) return;

    if (activeTab === 'product') {
      let endpoint = `/approvals/${id}/${action}`;
      let body = {};

      if (action === 'approve') {
        body = { notes: notes || undefined };
      } else if (action === 'reject') {
        if (!reason.trim()) {
          setModalState(prev => ({ ...prev, validationError: 'Rejection reason is required.' }));
          return;
        }
        body = { rejection_reason: reason.trim(), notes: notes.trim() || undefined };
      } else if (action === 'request-changes' || action === 'request_changes') {
        endpoint = `/approvals/${id}/request-changes`;
        const requestedNotes = notes.trim() || reason.trim();
        if (!requestedNotes) {
          setModalState(prev => ({ ...prev, validationError: 'Detailed notes explaining required changes are required.' }));
          return;
        }
        body = { notes: requestedNotes };
      } else if (action === 'suspend') {
        if (!reason.trim()) {
          setModalState(prev => ({ ...prev, validationError: 'Suspension justification is required.' }));
          return;
        }
        body = { reason: reason.trim(), notes: notes.trim() || undefined };
      }

      setSubmitting(true);
      apiClient.post(endpoint, body)
        .then(() => {
          closeActionModal();
          const actionLabels = {
            'approve': 'approved',
            'reject': 'rejected',
            'request-changes': 'sent for changes',
            'suspend': 'suspended'
          };
          showToast(`"${itemTitle}" was successfully ${actionLabels[action] || 'updated'}.`, 'success');
          fetchApprovals(activeTab, pagination.page);
        })
        .catch(err => {
          const errMsg = err.response?.data?.message || err.message || `Failed to ${action} item`;
          setModalState(prev => ({ ...prev, validationError: errMsg }));
        })
        .finally(() => setSubmitting(false));
    } else {
      // Legacy Seller/Customer Approval Handling
      setSubmitting(true);
      apiClient.patch(`/approvals/${id}`, { type: activeTab, action })
        .then(() => {
          closeActionModal();
          showToast(`${activeTab} record successfully updated.`, 'success');
          fetchApprovals(activeTab, pagination.page);
        })
        .catch(err => {
          const errMsg = err.response?.data?.message || err.message || `Failed to update ${activeTab}`;
          setModalState(prev => ({ ...prev, validationError: errMsg }));
        })
        .finally(() => setSubmitting(false));
    }
  };

  const productColumns = [
    { 
      header: 'Listing ID', 
      render: (row) => (
        <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {row.listing_id?.substring(0, 8) || row.id?.substring(0, 8)}
        </span>
      )
    },
    { 
      header: 'Product Title', 
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 text-sm">{row.title || row.name || 'Untitled Listing'}</span>
          {row.price && (
            <span className="text-xs font-semibold text-emerald-600 mt-0.5">
              ₹{parseFloat(row.price).toLocaleString()}
            </span>
          )}
        </div>
      )
    },
    { 
      header: 'Seller', 
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 text-xs">
            {row.store_name || (row.seller_id ? `Seller #${row.seller_id.substring(0, 8)}` : 'N/A')}
          </span>
          {row.seller_id && (
            <span className="text-[10px] font-mono text-slate-400 mt-0.5">
              ID: {row.seller_id.substring(0, 8)}
            </span>
          )}
        </div>
      )
    },
    { 
      header: 'Submitted At', 
      render: (row) => (
        <span className="text-xs text-slate-500 font-medium">
          {row.created_at ? new Date(row.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
        </span>
      )
    },
    { 
      header: 'Status', 
      render: (row) => {
        const currentSt = (row.current_status || row.status || '').toUpperCase();
        return (
          <div className="flex flex-col items-start gap-1">
            <StatusBadge status={currentSt} />
            {row.rejection_reason && (currentSt === 'REJECTED' || currentSt === 'CHANGES_REQUESTED' || currentSt === 'CHANGES_REQUIRED') && (
              <span 
                className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5 max-w-[160px] truncate font-medium"
                title={`Reason: ${row.rejection_reason}`}
              >
                {row.rejection_reason}
              </span>
            )}
          </div>
        );
      }
    },
    { 
      header: 'Actions', 
      render: (row) => {
        const currentSt = (row.current_status || row.status || '').toUpperCase();
        const isPending = currentSt === 'PENDING' || currentSt === 'SUBMITTED' || currentSt === 'UNDER_REVIEW' || currentSt === 'DRAFT';
        const isApproved = currentSt === 'APPROVED' || currentSt === 'LIVE' || currentSt === 'PUBLISHED';
        const isChanges = currentSt === 'CHANGES_REQUESTED' || currentSt === 'CHANGES_REQUIRED';
        const isRejected = currentSt === 'REJECTED';
        const isSuspended = currentSt === 'SUSPENDED';

        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button 
              onClick={() => viewHistory(row)} 
              className="inline-flex items-center gap-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg font-bold transition-colors shadow-xs cursor-pointer"
              title="View Transition History"
            >
              <i className="fa-solid fa-clock-rotate-left text-[10px]"></i> History
            </button>

            {/* Approve / Re-approve: allowed for pending, changes requested, suspended, or re-approving rejected */}
            {!isApproved && (
              <button 
                onClick={() => openActionModal(row, 'approve')} 
                className="inline-flex items-center gap-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg font-bold transition-colors shadow-xs cursor-pointer"
                title={isRejected ? "Re-approve Listing" : "Approve Listing"}
              >
                <i className="fa-solid fa-check text-[10px]"></i> {isRejected ? "Re-approve" : "Approve"}
              </button>
            )}

            {/* Request Changes: only valid when in pending review */}
            {isPending && (
              <button 
                onClick={() => openActionModal(row, 'request-changes')} 
                className="inline-flex items-center gap-1 text-[11px] bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1.5 rounded-lg font-bold transition-colors shadow-xs cursor-pointer"
                title="Request Changes from Seller"
              >
                <i className="fa-solid fa-pen-to-square text-[10px]"></i> Request Changes
              </button>
            )}

            {/* Reject / Revoke: allowed for pending, approved (revoke), changes requested, suspended. NEVER for already rejected! */}
            {!isRejected && (
              <button 
                onClick={() => openActionModal(row, 'reject')} 
                className="inline-flex items-center gap-1 text-[11px] bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg font-bold transition-colors shadow-xs cursor-pointer"
                title={isApproved ? "Revoke / Reject Listing" : "Reject Listing"}
              >
                <i className="fa-solid fa-xmark text-[10px]"></i> {isApproved ? "Revoke" : "Reject"}
              </button>
            )}

            {/* Suspend: allowed for active, pending, or changes requested items. NEVER for already rejected or already suspended items! */}
            {!isSuspended && !isRejected && (
              <button 
                onClick={() => openActionModal(row, 'suspend')} 
                className="inline-flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-900 text-white px-2.5 py-1.5 rounded-lg font-bold transition-colors shadow-xs cursor-pointer"
                title="Suspend Listing"
              >
                <i className="fa-solid fa-ban text-[10px]"></i> Suspend
              </button>
            )}
          </div>
        );
      }
    }
  ];

  const legacyColumns = [
    { 
      header: 'ID', 
      render: (row) => (
        <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {row.id?.substring(0, 8)}
        </span>
      )
    },
    { 
      header: activeTab === 'seller' ? 'Store / Business Name' : 'Customer Name',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 text-xs">
            {row.entityName || 'Unknown'}
          </span>
          {activeTab === 'seller' && row.ownerName && row.ownerName !== row.entityName && (
            <span className="text-[11px] text-slate-500 font-medium">
              Owner: {row.ownerName}
            </span>
          )}
        </div>
      )
    },
    { 
      header: 'Contact / Email', 
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-xs font-medium text-slate-700">
            {row.entityEmail || row.phone || 'N/A'}
          </span>
          {row.phone && row.entityEmail && row.phone !== row.entityEmail && (
            <span className="text-[10px] text-slate-400">
              {row.phone}
            </span>
          )}
        </div>
      )
    },
    { 
      header: 'Submitted At', 
      render: (row) => (
        <span className="text-xs text-slate-500 font-medium">
          {row.submittedAt ? new Date(row.submittedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
        </span>
      )
    },
    { header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { 
      header: 'Actions', 
      render: (row) => {
        const st = (row.status || '').toUpperCase();
        const isActive = st === 'ACTIVE' || st === 'APPROVED';
        const isRejected = st === 'REJECTED';
        return (
          <div className="flex gap-2">
            {!isActive && (
              <button 
                onClick={() => openActionModal(row, 'approve')} 
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shadow-xs"
              >
                {isRejected ? 'Re-approve' : 'Approve'}
              </button>
            )}
            {!isActive && !isRejected && (
              <button 
                onClick={() => openActionModal(row, 'request_changes')} 
                className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shadow-xs"
              >
                Request Changes
              </button>
            )}
            {!isRejected && (
              <button 
                onClick={() => openActionModal(row, 'reject')} 
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shadow-xs"
              >
                {isActive ? 'Revoke' : 'Reject'}
              </button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-5">
      {/* Toast Alert Banner */}
      {toast && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between border shadow-sm transition-all ${
          toast.type === 'error' 
            ? 'bg-rose-50 text-rose-800 border-rose-200' 
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          <div className="flex items-center gap-2">
            <i className={`fa-solid ${toast.type === 'error' ? 'fa-triangle-exclamation text-rose-600' : 'fa-circle-check text-emerald-600'} text-base`}></i>
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-700 font-bold ml-4">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Main Content Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        
        {/* Top Header & Metrics Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <i className="fa-solid fa-shield-halved text-indigo-600"></i>
              Moderation &amp; Approval Queue
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Review product catalog submissions, seller registrations, and compliance verifications.
            </p>
          </div>

          {/* Metric KPI Badges - Clickable Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              type="button"
              onClick={() => { setStatusFilter('ALL'); fetchApprovals(activeTab, 1, 'ALL', searchTerm); }}
              className={`rounded-xl px-3 py-1.5 min-w-18 text-center shadow-2xs transition-all cursor-pointer border ${
                statusFilter === 'ALL'
                  ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-500/20 text-indigo-900 font-black'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="View All Products"
            >
              <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">All</div>
              <div className="text-lg font-black text-slate-900">{counts.total || 0}</div>
            </button>
            <button 
              type="button"
              onClick={() => { setStatusFilter('PENDING'); fetchApprovals(activeTab, 1, 'PENDING', searchTerm); }}
              className={`rounded-xl px-3 py-1.5 min-w-18 text-center shadow-2xs transition-all cursor-pointer border ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-100 border-amber-600 ring-2 ring-amber-500/20 text-amber-950 font-black'
                  : 'bg-amber-50/80 border-amber-200 text-amber-800 hover:bg-amber-100/70'
              }`}
              title="Filter by Pending Moderation"
            >
              <div className="text-[10px] text-amber-700 font-extrabold uppercase tracking-wider">Pending</div>
              <div className="text-lg font-black text-amber-800">{counts.pending || 0}</div>
            </button>
            <button 
              type="button"
              onClick={() => { setStatusFilter('APPROVED'); fetchApprovals(activeTab, 1, 'APPROVED', searchTerm); }}
              className={`rounded-xl px-3 py-1.5 min-w-18 text-center shadow-2xs transition-all cursor-pointer border ${
                statusFilter === 'APPROVED'
                  ? 'bg-emerald-100 border-emerald-600 ring-2 ring-emerald-500/20 text-emerald-950 font-black'
                  : 'bg-emerald-50/80 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70'
              }`}
              title="Filter by Approved / Live"
            >
              <div className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider">Approved</div>
              <div className="text-lg font-black text-emerald-800">{counts.approved || 0}</div>
            </button>
            <button 
              type="button"
              onClick={() => { setStatusFilter('CHANGES_REQUESTED'); fetchApprovals(activeTab, 1, 'CHANGES_REQUESTED', searchTerm); }}
              className={`rounded-xl px-3 py-1.5 min-w-18 text-center shadow-2xs transition-all cursor-pointer border ${
                statusFilter === 'CHANGES_REQUESTED'
                  ? 'bg-orange-100 border-orange-600 ring-2 ring-orange-500/20 text-orange-950 font-black'
                  : 'bg-orange-50/80 border-orange-200 text-orange-800 hover:bg-orange-100/70'
              }`}
              title="Filter by Changes Requested"
            >
              <div className="text-[10px] text-orange-700 font-extrabold uppercase tracking-wider">Changes</div>
              <div className="text-lg font-black text-orange-800">{counts.changes_requested || 0}</div>
            </button>
            <button 
              type="button"
              onClick={() => { setStatusFilter('REJECTED'); fetchApprovals(activeTab, 1, 'REJECTED', searchTerm); }}
              className={`rounded-xl px-3 py-1.5 min-w-18 text-center shadow-2xs transition-all cursor-pointer border ${
                statusFilter === 'REJECTED'
                  ? 'bg-rose-100 border-rose-600 ring-2 ring-rose-500/20 text-rose-950 font-black'
                  : 'bg-rose-50/80 border-rose-200 text-rose-800 hover:bg-rose-100/70'
              }`}
              title="Filter by Rejected"
            >
              <div className="text-[10px] text-rose-700 font-extrabold uppercase tracking-wider">Rejected</div>
              <div className="text-lg font-black text-rose-800">{counts.rejected || 0}</div>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-px">
          <button 
            className={`py-3 px-4 font-bold text-xs rounded-t-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'product' 
                ? 'bg-indigo-50 border-b-2 border-indigo-600 text-indigo-700 font-black' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
            onClick={() => { setActiveTab('product'); setStatusFilter('ALL'); }}
          >
            <i className="fa-solid fa-boxes-stacked"></i> Product Listings Queue
            {counts.total > 0 && (
              <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {counts.total}
              </span>
            )}
          </button>
          <button 
            className={`py-3 px-4 font-bold text-xs rounded-t-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'seller' 
                ? 'bg-indigo-50 border-b-2 border-indigo-600 text-indigo-700 font-black' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
            onClick={() => { setActiveTab('seller'); setStatusFilter('ALL'); }}
          >
            <i className="fa-solid fa-store"></i> Seller Registration
          </button>
          <button 
            className={`py-3 px-4 font-bold text-xs rounded-t-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'customer' 
                ? 'bg-indigo-50 border-b-2 border-indigo-600 text-indigo-700 font-black' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
            onClick={() => { setActiveTab('customer'); setStatusFilter('ALL'); }}
          >
            <i className="fa-solid fa-user-check"></i> Customer Verification
          </button>
        </div>

        {/* Search, Status & Refresh Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
              <input
                type="text"
                placeholder={`Search ${activeTab} queue...`}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchApprovals(activeTab, 1, statusFilter, searchTerm)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all font-medium text-slate-800"
              />
            </div>
            <button
              onClick={() => fetchApprovals(activeTab, 1, statusFilter, searchTerm)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            >
              Search
            </button>
          </div>

          <div className="flex gap-2.5 items-center w-full sm:w-auto justify-end">
            <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Filter Status:</label>
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                fetchApprovals(activeTab, 1, e.target.value, searchTerm);
              }}
              className="border border-slate-200 py-2 px-3 rounded-xl text-xs bg-white outline-none focus:border-indigo-600 font-bold text-slate-700 cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Moderation</option>
              <option value="APPROVED">Approved / Live</option>
              {activeTab === 'product' && <option value="CHANGES_REQUESTED">Changes Requested</option>}
              <option value="REJECTED">Rejected</option>
            </select>
            <button
              onClick={() => fetchApprovals(activeTab, 1, statusFilter, searchTerm)}
              className="border border-slate-200 hover:bg-slate-50 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Refresh Queue"
            >
              <i className={`fa-solid fa-arrows-rotate text-[11px] ${loading ? 'animate-spin' : ''}`}></i>
              Refresh
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation"></i>
            {error}
          </div>
        )}

        {/* Data Table */}
        <AdminTable 
          columns={activeTab === 'product' ? productColumns : legacyColumns} 
          data={data} 
          loading={loading} 
          emptyMessage={`No ${statusFilter === 'ALL' ? '' : statusFilter.toLowerCase()} ${activeTab} items found in this queue.`} 
        />
        
        {/* Pagination */}
        <div className="pt-2">
          <Pagination 
            page={pagination.page} 
            total={pagination.total} 
            pageSize={pagination.limit} 
            onPageChange={p => fetchApprovals(activeTab, p)} 
          />
        </div>
      </div>

      {/* Moderation Action Modal */}
      <Modal
        isOpen={modalState.isOpen}
        title={
          modalState.action === 'approve' ? 'Approve Product Listing' :
          modalState.action === 'reject' ? 'Reject Listing' :
          modalState.action === 'suspend' ? 'Suspend Listing' :
          'Request Product Listing Changes'
        }
        onClose={closeActionModal}
        onPrimary={submitAction}
        primaryLabel={
          submitting ? 'Processing...' :
          modalState.action === 'approve' ? 'Approve Listing' :
          modalState.action === 'reject' ? 'Confirm Rejection' :
          modalState.action === 'suspend' ? 'Confirm Suspension' :
          'Submit Change Request'
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Target Item</span>
            <div className="font-bold text-slate-900 text-sm mt-0.5">{modalState.itemTitle}</div>
            <div className="font-mono text-[11px] text-slate-500 mt-0.5">ID: {modalState.id}</div>
          </div>

          {modalState.action === 'approve' ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Approving this listing validates its catalog details and authorizes it to transition to <strong className="text-emerald-700">APPROVED</strong> status.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Approval Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={modalState.notes}
                  onChange={e => setModalState({ ...modalState, notes: e.target.value, validationError: '' })}
                  placeholder="Optional internal notes for approval history..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {modalState.action === 'reject' ? 'Rejection Reason (Required) *' :
                   modalState.action === 'suspend' ? 'Suspension Justification (Required) *' :
                   'Requested Changes Description (Required) *'}
                </label>
                <textarea
                  rows={3}
                  value={modalState.reason}
                  onChange={e => setModalState({ ...modalState, reason: e.target.value, notes: e.target.value, validationError: '' })}
                  placeholder={
                    modalState.action === 'reject' ? 'Explain clearly why this listing was rejected...' :
                    modalState.action === 'suspend' ? 'Explain reason for policy suspension...' :
                    'Detail what needs modification before re-review (e.g., ingredients, images)...'
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                />
              </div>

              {modalState.action === 'reject' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Internal Moderation Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={modalState.notes}
                    onChange={e => setModalState({ ...modalState, notes: e.target.value, validationError: '' })}
                    placeholder="Internal audit notes..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {modalState.validationError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
              {modalState.validationError}
            </div>
          )}
        </div>
      </Modal>

      {/* Approval History Timeline Modal */}
      <Modal
        isOpen={historyModal.isOpen}
        title={`Audit History: ${historyModal.itemTitle}`}
        onClose={() => setHistoryModal({ isOpen: false, loading: false, itemTitle: '', data: [] })}
        primaryLabel="Close"
        onPrimary={() => setHistoryModal({ isOpen: false, loading: false, itemTitle: '', data: [] })}
      >
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {historyModal.loading ? (
            <div className="p-6 text-center text-xs text-slate-500 font-semibold">
              <i className="fa-solid fa-arrows-rotate animate-spin mr-1"></i> Loading history...
            </div>
          ) : historyModal.data.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 font-medium">
              No previous transition history recorded for this listing.
            </div>
          ) : (
            historyModal.data.map((h, idx) => (
              <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between items-center font-bold text-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {h.previous_status || 'INIT'}
                    </span>
                    <i className="fa-solid fa-arrow-right text-[10px] text-slate-400"></i>
                    <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-black">
                      {h.new_status}
                    </span>
                  </div>
                  <span className="text-slate-400 font-normal text-[11px]">
                    {h.action_at ? new Date(h.action_at).toLocaleString() : ''}
                  </span>
                </div>
                {h.rejection_reason && (
                  <div className="text-rose-700 bg-rose-50/60 p-2 rounded-lg border border-rose-100 font-medium text-[11px]">
                    <strong className="font-bold">Reason:</strong> {h.rejection_reason}
                  </div>
                )}
                {h.notes && (
                  <div className="text-slate-600 bg-white p-2 rounded-lg border border-slate-200 text-[11px]">
                    <strong className="font-bold text-slate-700">Notes:</strong> {h.notes}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
