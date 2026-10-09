import { useEffect, useState } from 'react';
import AdminTable from '../components/ui/AdminTable';

export default function Audit() {
  const [logs, setLogs] = useState([
    { id: 'aud-101', action: 'ADMIN_APPROVE_ITEM', entity: 'PRODUCT_LISTING', actor: 'Admin (#1)', timestamp: new Date(Date.now() - 600000).toLocaleString(), details: 'Approved listing b0eebc99' },
    { id: 'aud-102', action: 'ADMIN_CREATE_CATEGORY', entity: 'CATEGORY', actor: 'Admin (#1)', timestamp: new Date(Date.now() - 3600000).toLocaleString(), details: 'Created category Beverages' },
    { id: 'aud-103', action: 'ADMIN_RESOLVE_RETURN', entity: 'RETURN', actor: 'Admin (#1)', timestamp: new Date(Date.now() - 7200000).toLocaleString(), details: 'Approved return ret-101' },
    { id: 'aud-104', action: 'ADMIN_CREATE_OFFER', entity: 'OFFER', actor: 'Admin (#1)', timestamp: new Date(Date.now() - 14400000).toLocaleString(), details: 'Created coupon WELCOME50' }
  ]);

  const columns = [
    { header: 'Audit ID', render: (row) => <span className="font-mono text-xs text-slate-500">{row.id}</span> },
    { header: 'Action', render: (row) => <span className="font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{row.action}</span> },
    { header: 'Entity Type', accessor: 'entity' },
    { header: 'Actor', accessor: 'actor' },
    { header: 'Timestamp', accessor: 'timestamp' },
    { header: 'Details', accessor: 'details' }
  ];

  return (
    <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Immutable Audit Trail</h1>
        <p className="text-xs text-slate-500 mt-1">Read-only event log for sensitive administrative actions &amp; state mutations</p>
      </div>

      <AdminTable columns={columns} data={logs} loading={false} emptyMessage="No audit logs recorded." />
    </div>
  );
}
