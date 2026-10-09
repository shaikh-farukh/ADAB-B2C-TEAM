import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await apiClient.get('/audit');
        if (res.data.success) {
          setLogs(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load audit logs', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Audit Log</h1>

      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No audit logs found.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-4 font-semibold">Time</th>
                <th className="p-4 font-semibold">Actor</th>
                <th className="p-4 font-semibold">Action</th>
                <th className="p-4 font-semibold">Entity</th>
                <th className="p-4 font-semibold">Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-4">{new Date(log.time).toLocaleString()}</td>
                  <td className="p-4 font-medium">{log.actor}</td>
                  <td className="p-4"><span className="px-2 py-1 bg-slate-200 text-slate-700 rounded-md">{log.action}</span></td>
                  <td className="p-4">{log.entity}</td>
                  <td className="p-4 text-xs text-slate-500">{JSON.stringify(log.changes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
