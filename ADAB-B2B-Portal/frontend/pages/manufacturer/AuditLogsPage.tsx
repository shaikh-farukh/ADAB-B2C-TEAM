import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';

interface AuditLog {
  id: number;
  user_id: number;
  user_email: string;
  user_company: string;
  user_role: string;
  action: string;
  resource: string;
  resource_id: string;
  details: any;
  ip_address: string;
  created_at: string;
}

const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const fetchLogs = async (currentPage: number) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/manufacturers/audit-logs?page=${currentPage}&limit=${limit}`);
      if (res.data.success) {
        setLogs(res.data.data);
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
        }
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 flex-1 h-screen overflow-y-auto">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-dark-text-primary">My Activity Logs</h1>
      <p className="text-gray-600 dark:text-dark-text-secondary mb-6">View your recent order status updates and activity.</p>

      {loading ? (
        <div className="flex justify-center p-8 text-gray-500 dark:text-dark-text-secondary">Loading logs...</div>
      ) : (
        <div className="bg-white dark:bg-dark-surface-card rounded-lg shadow overflow-hidden border border-gray-200 dark:border-dark-border-primary">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border-primary">
              <thead className="bg-gray-50 dark:bg-dark-surface-elevated">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">Resource</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-surface-card divide-y divide-gray-200 dark:divide-dark-border-primary">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.resource} ({log.resource_id})
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-dark-text-secondary bg-white dark:bg-dark-surface-card">
                      No activity logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && totalPages > 0 && (
        <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-lg shadow">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AuditLogsPage;
