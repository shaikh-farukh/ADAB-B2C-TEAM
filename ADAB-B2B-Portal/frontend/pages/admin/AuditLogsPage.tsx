
import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import { useNotification } from '../../context/NotificationContext';
import { RefreshCw, Activity, ChevronLeft, ChevronRight } from 'lucide-react';

interface AuditLog {
  id: number;
  user_id: number;
  user_email: string;
  user_company: string;
  user_role: string;
  action: string;
  endpoint: string;
  details: any;
  ip_address: string;
  created_at: string;
}

const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { showError } = useNotification();
  const limit = 20;

  const fetchLogs = async (currentPage = 1) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/admin/audit-logs?page=${currentPage}&limit=${limit}`);

      if (res.data.success) {
        setLogs(res.data.data);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setPage(currentPage);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      showError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-in fade-in duration-500 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-white/5 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-gray-200 tracking-tight">System Audit Logs</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Real-time view of system activities and administrative events.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchLogs(1)}
            disabled={loading}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-50"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-adab-green' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex items-center gap-2">
          <Activity className="w-5 h-5 text-adab-orange" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-200">Event Stream</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-white/5">
            <thead className="bg-gray-50/30 dark:bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Endpoint</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm font-medium text-gray-500 animate-pulse">
                    Loading logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-500">No system events recorded yet.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-gray-200">
                      {log.user_company || log.user_email || `User #${log.user_id}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-[10px] font-bold uppercase tracking-wider rounded-lg border ${log.user_role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          log.user_role === 'manufacturer' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            log.user_role === 'distributor' ? 'bg-green-50 text-green-700 border-green-200' :
                              'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                        {log.user_role || 'system'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-900 dark:text-gray-200 bg-gray-50/30">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {log.endpoint || '-'}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-500 max-w-xs truncate cursor-help" title={JSON.stringify(log.details, null, 2)}>
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="bg-gray-50/30 dark:bg-white/5 px-6 py-4 flex items-center justify-between border-t border-gray-100 dark:border-white/5">
          <button
            disabled={page === 1 || loading}
            onClick={() => fetchLogs(page - 1)}
            className="flex items-center text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </button>
          <span className="text-xs font-medium text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages || loading}
            onClick={() => fetchLogs(page + 1)}
            className="flex items-center text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-colors"
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditLogsPage;
