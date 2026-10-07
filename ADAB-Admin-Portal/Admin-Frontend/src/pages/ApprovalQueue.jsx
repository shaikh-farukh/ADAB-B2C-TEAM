import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import AdminTable from '../components/ui/AdminTable';
import StatusBadge from '../components/ui/StatusBadge';
import Pagination from '../components/ui/Pagination';

export default function ApprovalQueue() {
  const [activeTab, setActiveTab] = useState('seller'); // seller, customer, product
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 10, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchApprovals = (type = activeTab, p = 1) => {
    setLoading(true);
    setError(null);
    apiClient.get(`/approvals?type=${type}&page=${p}&pageSize=10`)
      .then(res => {
        setData(res.data.data);
        if (res.data.meta) setMeta(res.data.meta);
      })
      .catch((err) => setError(`Failed to load ${type} approvals`))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchApprovals(activeTab, 1);
  }, [activeTab]);

  const handleAction = (id, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this ${activeTab}?`)) return;
    
    apiClient.patch(`/approvals/${id}`, { type: activeTab, action })
      .then(() => fetchApprovals(activeTab, meta.page))
      .catch(err => alert(`Failed to ${action} approval`));
  };

  const columns = [
    { header: 'ID', render: (row) => <span className="text-xs text-gray-500">{row.id?.substring(0,8)}</span> },
    { header: 'Name', accessor: 'entityName' },
    { header: 'Email', accessor: 'entityEmail' },
    { header: 'Submitted At', render: (row) => new Date(row.submittedAt).toLocaleDateString() },
    { header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { header: 'Actions', render: (row) => (
      <div className="flex gap-2">
        <button onClick={() => handleAction(row.id, 'approve')} className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded">Approve</button>
        <button onClick={() => handleAction(row.id, 'request_changes')} className="text-xs bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded">Request Changes</button>
        <button onClick={() => handleAction(row.id, 'reject')} className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded">Reject</button>
      </div>
    )}
  ];

  return (
    <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm">
      <h1 className="text-2xl font-bold text-gray-800">Approval Queue</h1>
      
      <div className="flex border-b border-gray-200 mb-4">
        <button 
          className={`py-2 px-4 font-medium text-sm transition-colors ${activeTab === 'seller' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('seller')}
        >
          Seller Registration
        </button>
        <button 
          className={`py-2 px-4 font-medium text-sm transition-colors ${activeTab === 'customer' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('customer')}
        >
          Customer Registration
        </button>
        <button 
          className={`py-2 px-4 font-medium text-sm transition-colors ${activeTab === 'product' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('product')}
        >
          Product (Mocked)
        </button>
      </div>

      {error && <div className="text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

      <AdminTable columns={columns} data={data} loading={loading} emptyMessage={`No pending ${activeTab} approvals.`} />
      
      <div className="mt-4">
        <Pagination page={meta.page} total={meta.total} pageSize={meta.pageSize} onPageChange={p => fetchApprovals(activeTab, p)} />
      </div>
    </div>
  );
}
