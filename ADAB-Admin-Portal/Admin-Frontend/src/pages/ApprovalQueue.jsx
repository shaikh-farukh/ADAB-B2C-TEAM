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
  const [error, setError] = useState(null);

  // Action modal states for Reason / Notes requirement
  const [modalState, setModalState] = useState({
    isOpen: false,
    id: null,
    action: null, // approve, reject, request_changes, suspend
    reason: '',
    notes: ''
  });

  const fetchApprovals = (type = activeTab, p = 1) => {
    setLoading(true);
    setError(null);

    if (type === 'product') {
      apiClient.get(`/approvals/queue?page=${p}&limit=10`)
        .then(res => {
          setData(res.data.data || []);
          if (res.data.pagination) setPagination(res.data.pagination);
        })
        .catch(err => setError('Failed to load product moderation queue'))
        .finally(() => setLoading(false));
    } else {
      apiClient.get(`/approvals?type=${type}&page=${p}&pageSize=10`)
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
        .catch(err => setError(`Failed to load ${type} approvals`))
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchApprovals(activeTab, 1);
  }, [activeTab]);

  const openActionModal = (id, action) => {
    if (action === 'approve') {
      if (window.confirm('Are you sure you want to approve this product listing?')) {
        submitAction(id, 'approve', {});
      }
      return;
    }
    setModalState({
      isOpen: true,
      id,
      action,
      reason: '',
      notes: ''
    });
  };

  const submitAction = (id = modalState.id, action = modalState.action, payload = {}) => {
    if (activeTab === 'product') {
      let endpoint = `/approvals/${id}/${action}`;
      let body = {};

      if (action === 'reject') {
        const reasonStr = payload.reason || modalState.reason;
        if (!reasonStr.trim()) {
          alert('Rejection reason is required');
          return;
        }
        body = { rejection_reason: reasonStr, notes: modalState.notes };
      } else if (action === 'request-changes' || action === 'request_changes') {
        endpoint = `/approvals/${id}/request-changes`;
        const notesStr = payload.notes || modalState.notes || modalState.reason;
        if (!notesStr.trim()) {
          alert('Notes explaining requested changes are required');
          return;
        }
        body = { notes: notesStr };
      } else if (action === 'suspend') {
        const reasonStr = payload.reason || modalState.reason;
        if (!reasonStr.trim()) {
          alert('Suspension reason is required');
          return;
        }
        body = { reason: reasonStr, notes: modalState.notes };
      }

      apiClient.post(endpoint, body)
        .then(() => {
          setModalState({ isOpen: false, id: null, action: null, reason: '', notes: '' });
          fetchApprovals(activeTab, pagination.page);
        })
        .catch(err => alert(err.response?.data?.message || `Failed to execute ${action}`));
    } else {
      // Legacy Seller/Customer Approval Handling
      apiClient.patch(`/approvals/${id}`, { type: activeTab, action })
        .then(() => {
          setModalState({ isOpen: false, id: null, action: null, reason: '', notes: '' });
          fetchApprovals(activeTab, pagination.page);
        })
        .catch(err => alert(`Failed to ${action} approval`));
    }
  };

  const productColumns = [
    { header: 'Listing ID', render: (row) => <span className="text-xs font-mono text-gray-500">{row.listing_id?.substring(0,8) || row.id?.substring(0,8)}</span> },
    { header: 'Title / Product', render: (row) => <span className="font-bold text-gray-800">{row.title || row.name || 'Untitled Listing'}</span> },
    { header: 'Seller ID', render: (row) => <span className="text-xs text-gray-500">{row.seller_id ? row.seller_id.substring(0,8) : 'N/A'}</span> },
    { header: 'Submitted At', render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : 'N/A' },
    { header: 'Status', render: (row) => <StatusBadge status={row.current_status || row.status} /> },
    { header: 'Actions', render: (row) => (
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => openActionModal(row.id || row.listing_id, 'approve')} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg font-bold">Approve</button>
        <button onClick={() => openActionModal(row.id || row.listing_id, 'request-changes')} className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-lg font-bold">Request Changes</button>
        <button onClick={() => openActionModal(row.id || row.listing_id, 'reject')} className="text-xs bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded-lg font-bold">Reject</button>
        <button onClick={() => openActionModal(row.id || row.listing_id, 'suspend')} className="text-xs bg-slate-700 hover:bg-slate-800 text-white px-2.5 py-1 rounded-lg font-bold">Suspend</button>
      </div>
    )}
  ];

  const legacyColumns = [
    { header: 'ID', render: (row) => <span className="text-xs text-gray-500">{row.id?.substring(0,8)}</span> },
    { header: 'Name', accessor: 'entityName' },
    { header: 'Email', accessor: 'entityEmail' },
    { header: 'Submitted At', render: (row) => new Date(row.submittedAt).toLocaleDateString() },
    { header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { header: 'Actions', render: (row) => (
      <div className="flex gap-2">
        <button onClick={() => openActionModal(row.id, 'approve')} className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded font-bold">Approve</button>
        <button onClick={() => openActionModal(row.id, 'request_changes')} className="text-xs bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded font-bold">Request Changes</button>
        <button onClick={() => openActionModal(row.id, 'reject')} className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded font-bold">Reject</button>
      </div>
    )}
  ];

  return (
    <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Moderation &amp; Approval Queue</h1>
          <p className="text-xs text-slate-500 mt-1">Review product listings, seller applications &amp; compliance submissions</p>
        </div>
      </div>
      
      <div className="flex border-b border-slate-200 mb-4 gap-2">
        <button 
          className={`py-2.5 px-4 font-extrabold text-xs rounded-t-xl transition-colors ${activeTab === 'product' ? 'bg-indigo-50 border-b-2 border-indigo-600 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('product')}
        >
          <i className="fa-solid fa-box mr-1.5"></i> Product Listings Queue
        </button>
        <button 
          className={`py-2.5 px-4 font-extrabold text-xs rounded-t-xl transition-colors ${activeTab === 'seller' ? 'bg-indigo-50 border-b-2 border-indigo-600 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('seller')}
        >
          <i className="fa-solid fa-store mr-1.5"></i> Seller Registration
        </button>
        <button 
          className={`py-2.5 px-4 font-extrabold text-xs rounded-t-xl transition-colors ${activeTab === 'customer' ? 'bg-indigo-50 border-b-2 border-indigo-600 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('customer')}
        >
          <i className="fa-solid fa-users mr-1.5"></i> Customer Verification
        </button>
      </div>

      {error && <div className="text-rose-600 bg-rose-50 p-3 rounded-xl text-xs font-semibold">{error}</div>}

      <AdminTable 
        columns={activeTab === 'product' ? productColumns : legacyColumns} 
        data={data} 
        loading={loading} 
        emptyMessage={`No pending ${activeTab} approvals.`} 
      />
      
      <div className="mt-4">
        <Pagination 
          page={pagination.page} 
          total={pagination.total} 
          pageSize={pagination.limit} 
          onPageChange={p => fetchApprovals(activeTab, p)} 
        />
      </div>

      {/* Moderation Reason / Notes Modal */}
      <Modal
        isOpen={modalState.isOpen}
        title={`Confirm Action: ${modalState.action?.toUpperCase().replace('-', ' ')}`}
        onClose={() => setModalState({ isOpen: false, id: null, action: null, reason: '', notes: '' })}
        onPrimary={() => submitAction()}
        primaryLabel="Submit Action"
      >
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {modalState.action === 'reject' || modalState.action === 'suspend' ? 'Reason (Required) *' : 'Moderation Notes *'}
          </label>
          <textarea
            rows={3}
            value={modalState.reason}
            onChange={e => setModalState({ ...modalState, reason: e.target.value, notes: e.target.value })}
            placeholder={modalState.action === 'reject' ? 'Enter clear rejection reason...' : modalState.action === 'suspend' ? 'Enter suspension justification...' : 'Enter details of requested changes...'}
            className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 outline-none"
          />
        </div>
      </Modal>
    </div>
  );
}
