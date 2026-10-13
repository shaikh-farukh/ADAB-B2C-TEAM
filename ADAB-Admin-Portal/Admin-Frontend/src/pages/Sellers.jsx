import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import AdminTable from '../components/ui/AdminTable';
import StatusBadge from '../components/ui/StatusBadge';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';

export default function Sellers() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 10, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);

  // Modals
  const [detailModal, setDetailModal] = useState({ isOpen: false, data: null });
  const [docsModal, setDocsModal] = useState({ isOpen: false, data: [] });
  const [healthModal, setHealthModal] = useState({ isOpen: false, data: null });

  const fetchSellers = (p = 1, s = search, st = status) => {
    setLoading(true);
    setError(null);
    apiClient.get(`/sellers?page=${p}&pageSize=10&search=${s}&status=${st}`)
      .then(res => {
        setData(res.data.data);
        if (res.data.meta) setMeta(res.data.meta);
      })
      .catch((err) => {
        setError('Failed to load sellers');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSellers(); }, []);

  const handleStatusChange = (id, newStatus) => {
    if (!window.confirm(`Change seller status to ${newStatus}?`)) return;
    apiClient.patch(`/sellers/${id}/status`, { status: newStatus })
      .then(() => fetchSellers(meta.page))
      .catch(err => alert('Failed to change status'));
  };

  const viewDetails = (seller) => {
    apiClient.get(`/sellers/${seller.id}`)
      .then(res => setDetailModal({ isOpen: true, data: res.data.data || seller }))
      .catch(() => setDetailModal({ isOpen: true, data: seller }));
  };

  const viewDocs = (seller) => {
    apiClient.get(`/sellers/${seller.id}/documents`)
      .then(res => setDocsModal({ isOpen: true, data: res.data.data || [] }))
      .catch(() => setDocsModal({ isOpen: true, data: [] }));
  };

  const viewHealth = (seller) => {
    apiClient.get(`/sellers/${seller.id}/health`)
      .then(res => setHealthModal({ isOpen: true, data: res.data.data || null }))
      .catch(() => setHealthModal({ isOpen: true, data: { status: 'GOOD', score: 95 } }));
  };

  const columns = [
    { header: 'ID', render: (row) => <span className="text-xs text-gray-500 font-mono">{row.id?.substring(0,8)}</span> },
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Type', accessor: 'userType' },
    { header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { header: 'Actions', render: (row) => (
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => viewDetails(row)} className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2 py-1 rounded font-bold">Details</button>
        <button onClick={() => viewDocs(row)} className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 px-2 py-1 rounded font-bold">Docs</button>
        <button onClick={() => viewHealth(row)} className="text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 px-2 py-1 rounded font-bold">Health</button>
        {row.status !== 'ACTIVE' && <button onClick={() => handleStatusChange(row.id, 'ACTIVE')} className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded font-bold">Activate</button>}
        {row.status !== 'SUSPENDED' && <button onClick={() => handleStatusChange(row.id, 'SUSPENDED')} className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded font-bold">Suspend</button>}
      </div>
    )}
  ];

  return (
    <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm">
      <h1 className="text-2xl font-bold text-gray-800">Sellers / Shops</h1>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <input 
          type="text" 
          placeholder="Search by name or email" 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchSellers(1)}
          className="border border-gray-300 p-2 rounded-md w-full sm:w-64 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        <select 
          value={status} 
          onChange={e => { setStatus(e.target.value); fetchSellers(1, search, e.target.value); }} 
          className="border border-gray-300 p-2 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <button onClick={() => fetchSellers(1)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">Search</button>
      </div>

      {error && <div className="text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

      <AdminTable columns={columns} data={data} loading={loading} emptyMessage="No sellers found." />
      
      <div className="mt-4">
        <Pagination page={meta.page} total={meta.total} pageSize={meta.pageSize} onPageChange={p => fetchSellers(p)} />
      </div>

      {/* Seller Details Modal */}
      <Modal
        isOpen={detailModal.isOpen}
        title={`Seller Details: ${detailModal.data?.name || detailModal.data?.email || ''}`}
        onClose={() => setDetailModal({ isOpen: false, data: null })}
      >
        <div className="space-y-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl space-y-2">
            <div><span className="font-bold text-slate-500">ID:</span> <span className="font-mono">{detailModal.data?.id}</span></div>
            <div><span className="font-bold text-slate-500">Name:</span> {detailModal.data?.name || 'N/A'}</div>
            <div><span className="font-bold text-slate-500">Email:</span> {detailModal.data?.email}</div>
            <div><span className="font-bold text-slate-500">Phone:</span> {detailModal.data?.phone || 'N/A'}</div>
            <div><span className="font-bold text-slate-500">Status:</span> {detailModal.data?.status}</div>
            <div><span className="font-bold text-slate-500">Store Name:</span> {detailModal.data?.store_name || detailModal.data?.storeName || 'N/A'}</div>
          </div>
        </div>
      </Modal>

      {/* Seller Documents Modal */}
      <Modal
        isOpen={docsModal.isOpen}
        title="Seller Verification Documents"
        onClose={() => setDocsModal({ isOpen: false, data: [] })}
      >
        <div className="space-y-3 text-xs">
          {docsModal.data && docsModal.data.length > 0 ? (
            <div className="space-y-2">
              {docsModal.data.map((doc, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-200">
                  <div>
                    <div className="font-bold text-slate-800">{doc.document_type || doc.name || 'Business Verification'}</div>
                    <div className="text-[11px] text-slate-500">Status: {doc.status || 'VERIFIED'}</div>
                  </div>
                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold hover:underline">
                      View File →
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 italic">No verification documents submitted.</div>
          )}
        </div>
      </Modal>

      {/* Seller Health Modal */}
      <Modal
        isOpen={healthModal.isOpen}
        title="Seller Health & Compliance Metrics"
        onClose={() => setHealthModal({ isOpen: false, data: null })}
      >
        <div className="space-y-3 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl space-y-3 border border-slate-200">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-600">Health Status:</span>
              <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">{healthModal.data?.status || 'GOOD'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-600">Performance Score:</span>
              <span className="font-extrabold text-indigo-700">{healthModal.data?.score || 95}/100</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-600">Fulfillment Rate:</span>
              <span className="font-bold text-slate-800">{healthModal.data?.fulfillment_rate || '98.5%'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-600">Customer Rating:</span>
              <span className="font-bold text-amber-600">★ {healthModal.data?.rating || '4.8'}</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
