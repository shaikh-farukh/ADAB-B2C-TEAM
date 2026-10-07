import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import AdminTable from '../components/ui/AdminTable';
import StatusBadge from '../components/ui/StatusBadge';
import Pagination from '../components/ui/Pagination';

export default function Customers() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 10, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);

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

  const columns = [
    { header: 'ID', render: (row) => <span className="text-xs text-gray-500">{row.id.substring(0,8)}</span> },
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { header: 'Actions', render: (row) => (
      <div className="flex gap-2">
        {row.status !== 'ACTIVE' && <button onClick={() => handleStatusChange(row.id, 'ACTIVE')} className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded">Unlock</button>}
        {row.status !== 'LOCKED' && <button onClick={() => handleStatusChange(row.id, 'LOCKED')} className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded">Lock</button>}
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
    </div>
  );
}
