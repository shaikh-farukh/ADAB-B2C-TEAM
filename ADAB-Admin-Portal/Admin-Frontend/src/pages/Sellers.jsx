import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import AdminTable from '../components/ui/AdminTable';
import StatusBadge from '../components/ui/StatusBadge';

export default function Sellers() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/sellers')
      .then(res => { setData(res.data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const columns = [
    { header: 'ID', accessor: 'id' },
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Sellers Administration</h1>
      <AdminTable columns={columns} data={data} loading={loading} emptyMessage="No sellers found." />
    </div>
  );
}
