import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import AdminTable from '../components/ui/AdminTable';
import StatusBadge from '../components/ui/StatusBadge';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';

export default function Customers() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 10, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);

  // Modals
  const [detailModal, setDetailModal] = useState({ isOpen: false, data: null });
  const [ordersModal, setOrdersModal] = useState({ isOpen: false, data: [] });
  const [ticketsModal, setTicketsModal] = useState({ isOpen: false, data: [] });

  const fetchCustomers = (p = 1, s = search, st = status) => {
    setLoading(true);
    setError(null);
    apiClient.get(`/customers?page=${p}&pageSize=10&search=${s}&status=${st}`)
      .then(res => {
        setData(res.data.data);
        if (res.data.meta) setMeta(res.data.meta);
      })
      .catch((err) => {
        setError('Failed to load customers');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCustomers(); }, []);

  const handleStatusChange = (id, newStatus) => {
    if (!window.confirm(`Change customer status to ${newStatus}?`)) return;
    apiClient.patch(`/customers/${id}/status`, { status: newStatus })
      .then(() => fetchCustomers(meta.page))
      .catch(err => alert('Failed to change status'));
  };

  const viewDetails = (customer) => {
    apiClient.get(`/customers/${customer.id}`)
      .then(res => setDetailModal({ isOpen: true, data: res.data.data || customer }))
      .catch(() => setDetailModal({ isOpen: true, data: customer }));
  };

  const viewOrders = (customer) => {
    apiClient.get(`/customers/${customer.id}/orders`)
      .then(res => setOrdersModal({ isOpen: true, data: res.data.data || [] }))
      .catch(() => setOrdersModal({ isOpen: true, data: [] }));
  };

  const viewTickets = (customer) => {
    apiClient.get(`/customers/${customer.id}/tickets`)
      .then(res => setTicketsModal({ isOpen: true, data: res.data.data || [] }))
      .catch(() => setTicketsModal({ isOpen: true, data: [] }));
  };

  const columns = [
    { header: 'ID', render: (row) => <span className="text-xs text-gray-500 font-mono">{row.id?.substring(0,8)}</span> },
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { header: 'Actions', render: (row) => (
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => viewDetails(row)} className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2 py-1 rounded font-bold">Details</button>
        <button onClick={() => viewOrders(row)} className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-1 rounded font-bold">Orders</button>
        <button onClick={() => viewTickets(row)} className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 px-2 py-1 rounded font-bold">Tickets</button>
        {row.status !== 'ACTIVE' && <button onClick={() => handleStatusChange(row.id, 'ACTIVE')} className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded font-bold">Unlock</button>}
        {row.status !== 'LOCKED' && <button onClick={() => handleStatusChange(row.id, 'LOCKED')} className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded font-bold">Lock</button>}
      </div>
    )}
  ];

  return (
    <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm">
      <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <input 
          type="text" 
          placeholder="Search by name or email" 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchCustomers(1)}
          className="border border-gray-300 p-2 rounded-md w-full sm:w-64 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        <select 
          value={status} 
          onChange={e => { setStatus(e.target.value); fetchCustomers(1, search, e.target.value); }} 
          className="border border-gray-300 p-2 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="LOCKED">Locked</option>
        </select>
        <button onClick={() => fetchCustomers(1)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">Search</button>
      </div>

      {error && <div className="text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

      <AdminTable columns={columns} data={data} loading={loading} emptyMessage="No customers found." />
      
      <div className="mt-4">
        <Pagination page={meta.page} total={meta.total} pageSize={meta.pageSize} onPageChange={p => fetchCustomers(p)} />
      </div>

      {/* Customer Details Modal */}
      <Modal
        isOpen={detailModal.isOpen}
        title={`Customer Details: ${detailModal.data?.name || detailModal.data?.email || ''}`}
        onClose={() => setDetailModal({ isOpen: false, data: null })}
      >
        <div className="space-y-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl space-y-2">
            <div><span className="font-bold text-slate-500">ID:</span> <span className="font-mono">{detailModal.data?.id}</span></div>
            <div><span className="font-bold text-slate-500">Name:</span> {detailModal.data?.name || 'N/A'}</div>
            <div><span className="font-bold text-slate-500">Email:</span> {detailModal.data?.email}</div>
            <div><span className="font-bold text-slate-500">Phone:</span> {detailModal.data?.phone || 'N/A'}</div>
            <div><span className="font-bold text-slate-500">Status:</span> {detailModal.data?.status}</div>
          </div>
        </div>
      </Modal>

      {/* Customer Order History Modal */}
      <Modal
        isOpen={ordersModal.isOpen}
        title="Customer Order History"
        onClose={() => setOrdersModal({ isOpen: false, data: [] })}
      >
        <div className="space-y-3 text-xs">
          {ordersModal.data && ordersModal.data.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {ordersModal.data.map((ord, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-200">
                  <div>
                    <div className="font-bold text-slate-800">Order #{ord.order_number || ord.id?.substring(0,8)}</div>
                    <div className="text-[11px] text-slate-500">Date: {ord.created_at ? new Date(ord.created_at).toLocaleDateString() : 'N/A'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-indigo-700">₹{ord.grand_total || ord.total || 0}</div>
                    <span className="text-[10px] font-bold uppercase text-slate-500">{ord.order_status || ord.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 italic">No orders found for this customer.</div>
          )}
        </div>
      </Modal>

      {/* Customer Support Tickets Modal */}
      <Modal
        isOpen={ticketsModal.isOpen}
        title="Customer Support Tickets"
        onClose={() => setTicketsModal({ isOpen: false, data: [] })}
      >
        <div className="space-y-3 text-xs">
          {ticketsModal.data && ticketsModal.data.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {ticketsModal.data.map((t, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-200">
                  <div>
                    <div className="font-bold text-slate-800">{t.subject || t.title || 'Support Query'}</div>
                    <div className="text-[11px] text-slate-500">Priority: {t.priority || 'NORMAL'}</div>
                  </div>
                  <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                    {t.status || 'OPEN'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 italic">No support tickets filed.</div>
          )}
        </div>
      </Modal>
    </div>
  );
}
