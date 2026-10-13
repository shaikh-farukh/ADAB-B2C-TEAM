import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient';
import Pagination from '../components/ui/Pagination';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [search, setSearch] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Selected log for JSON detail modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchLogs = useCallback(async (targetPage = page, targetPageSize = pageSize) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: targetPage,
        limit: targetPageSize,
      };

      let res;
      // Contract #70: GET /audit/entity/:type/:id
      if (entityType && entityType.trim() && entityType !== 'ALL' && entityId && entityId.trim()) {
        res = await apiClient.get(`/audit/entity/${encodeURIComponent(entityType.trim())}/${encodeURIComponent(entityId.trim())}`, {
          params: { page: targetPage, limit: targetPageSize }
        });
      } else {
        // Contract #69: GET /audit
        if (entityType && entityType.trim() && entityType !== 'ALL') {
          params.entityType = entityType.trim();
        }
        if (entityId && entityId.trim()) {
          params.entityId = entityId.trim();
        }
        if (search && search.trim()) {
          params.search = search.trim();
        }
        res = await apiClient.get('/audit', { params });
      }

      if (res.data && res.data.success) {
        const data = res.data.data;
        const logList = Array.isArray(data) ? data : (data?.logs || []);
        setLogs(logList);

        const pagination = res.data.pagination || res.data.meta || {};
        const totalCount = pagination.total !== undefined ? pagination.total : logList.length;
        const totalPgs = pagination.totalPages !== undefined ? pagination.totalPages : Math.max(1, Math.ceil(totalCount / targetPageSize));

        setTotal(totalCount);
        setTotalPages(totalPgs);
      } else {
        setLogs([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError('Failed to fetch audit records. Please check network connection.');
      setLogs([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, search, page, pageSize]);

  // Initial fetch and fetch on page / pageSize changes
  useEffect(() => {
    fetchLogs(page, pageSize);
  }, [page, pageSize, fetchLogs]);

  // Handle filter submit
  const handleFilter = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchLogs(1, pageSize);
  };

  // Handle reset filters
  const handleReset = () => {
    setEntityType('');
    setEntityId('');
    setSearch('');
    setPage(1);
    // Directly fetch with cleared filters
    setLoading(true);
    apiClient.get('/audit', { params: { page: 1, limit: pageSize } })
      .then(res => {
        if (res.data?.success) {
          const data = res.data.data;
          const logList = Array.isArray(data) ? data : (data?.logs || []);
          setLogs(logList);
          const pagination = res.data.pagination || res.data.meta || {};
          setTotal(pagination.total !== undefined ? pagination.total : logList.length);
          setTotalPages(pagination.totalPages !== undefined ? pagination.totalPages : Math.max(1, Math.ceil(logList.length / pageSize)));
        }
      })
      .catch(err => {
        console.error('Reset fetch error:', err);
      })
      .finally(() => setLoading(false));
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(1);
  };

  const hasActiveFilters = Boolean(entityType || entityId || search);

  const getActionBadgeClass = (action = '') => {
    const act = action.toUpperCase();
    if (act.includes('APPROVE') || act.includes('CREATE') || act.includes('LOGIN')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (act.includes('REJECT') || act.includes('DELETE') || act.includes('SUSPEND') || act.includes('FAIL')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (act.includes('CHANGE') || act.includes('UPDATE') || act.includes('RESOLVE') || act.includes('WARN')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const handleCopyJson = (jsonObj) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(jsonObj, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy JSON:', err);
    }
  };

  return (
    <div className="space-y-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-6 bg-indigo-600 rounded-full inline-block"></span>
            System Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable security log of all administrative actions, moderation events &amp; mutations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchLogs(page, pageSize)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-xs"
            title="Refresh logs"
          >
            <i className={`fa-solid fa-rotate-right text-[11px] ${loading ? 'animate-spin text-indigo-600' : ''}`}></i>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Enhanced Filter Bar */}
      <form onSubmit={handleFilter} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Entity Type Dropdown */}
          <div className="lg:col-span-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Entity Type
            </label>
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 rounded-lg border border-slate-200 bg-white outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-semibold text-slate-700 transition-colors"
            >
              <option value="">All Entity Types</option>
              <option value="PRODUCT_LISTING">Product Listing</option>
              <option value="ADMIN_ACTION">Admin Action</option>
              <option value="SELLER">Seller / Store</option>
              <option value="CUSTOMER">Customer Account</option>
              <option value="ORDER">Order</option>
              <option value="RETURN">Return Request</option>
              <option value="OFFER">Offer / Coupon</option>
              <option value="CATEGORY">Category</option>
              <option value="BRAND">Brand</option>
              <option value="ROLE">Role / RBAC</option>
              <option value="USER">User Account</option>
            </select>
          </div>

          {/* Entity ID Input */}
          <div className="lg:col-span-4">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Entity ID
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="UUID or Entity ID..."
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                className="w-full p-2 pl-3 pr-7 rounded-lg border border-slate-200 bg-white outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-mono text-slate-800 transition-colors"
              />
              {entityId && (
                <button
                  type="button"
                  onClick={() => setEntityId('')}
                  className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              )}
            </div>
          </div>

          {/* Keyword Search Input */}
          <div className="lg:col-span-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Keyword / Action
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search action, actor, diff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full p-2 pl-8 pr-7 rounded-lg border border-slate-200 bg-white outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-slate-800 transition-colors"
              />
              <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-slate-400 text-xs"></i>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="lg:col-span-2 flex items-end gap-2 pt-4 lg:pt-0">
            <button
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-2 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <i className="fa-solid fa-filter text-[10px]"></i>
              <span>Filter</span>
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleReset}
                className="border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 font-bold px-3 py-2 rounded-lg transition-colors shadow-xs"
                title="Clear all filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
          <i className="fa-solid fa-circle-exclamation text-rose-500"></i>
          <span>{error}</span>
        </div>
      )}

      {/* Audit Log Table & Container */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-400 font-semibold space-y-3">
              <i className="fa-solid fa-spinner fa-spin text-2xl text-indigo-600"></i>
              <div className="text-xs">Loading audit trail entries...</div>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <i className="fa-solid fa-folder-open text-3xl text-slate-300"></i>
              <div className="font-bold text-slate-700 text-sm">No audit records found</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No security log events matched your specified filter criteria. Try selecting &ldquo;All Entity Types&rdquo; or clearing your search.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-xs hover:bg-indigo-100 transition-colors"
                >
                  <i className="fa-solid fa-rotate-left text-[10px]"></i>
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[11px] font-black">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entity</th>
                  <th className="p-3">Change Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const hasDetails = log.changes && typeof log.changes === 'object' && Object.keys(log.changes).length > 0;
                  const detailsString = typeof log.changes === 'object' && log.changes !== null
                    ? JSON.stringify(log.changes)
                    : String(log.changes || '-');

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Timestamp */}
                      <td className="p-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {log.time ? new Date(log.time).toLocaleString() : 'N/A'}
                      </td>

                      {/* Actor */}
                      <td className="p-3">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-black text-[9px] flex items-center justify-center">
                            {(log.actor || 'S').charAt(0).toUpperCase()}
                          </span>
                          {log.actor || 'System'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 border font-mono text-[11px] rounded font-semibold ${getActionBadgeClass(log.action)}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Entity */}
                      <td className="p-3 font-mono text-slate-700 max-w-xs break-all">
                        {log.entity || `${log.entity_type} (${log.entity_id})`}
                      </td>

                      {/* Change Details */}
                      <td className="p-3">
                        <div className="flex items-center gap-2 max-w-sm">
                          <span
                            className="font-mono text-[11px] text-slate-500 truncate flex-1 cursor-pointer hover:text-slate-800"
                            title={detailsString}
                            onClick={() => setSelectedLog(log)}
                          >
                            {detailsString}
                          </span>
                          {hasDetails && (
                            <button
                              type="button"
                              onClick={() => setSelectedLog(log)}
                              className="px-2 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 font-bold text-[10px] whitespace-nowrap shadow-xs transition-colors"
                              title="View full JSON"
                            >
                              <i className="fa-solid fa-code text-[9px] mr-1"></i>
                              View
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Perfect Pagination Bar at Table Bottom */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={[10, 25, 50, 100]}
        />
      </div>

      {/* Change Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <i className="fa-solid fa-fingerprint text-indigo-600"></i>
                  Audit Record Details
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  ID: <span className="font-mono">{selectedLog.id}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Modal Summary Grid */}
            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/50 border-b border-slate-100 text-xs">
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Actor</div>
                <div className="font-bold text-slate-800 mt-0.5">{selectedLog.actor || 'System'}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Action</div>
                <div className="mt-0.5">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono border font-semibold ${getActionBadgeClass(selectedLog.action)}`}>
                    {selectedLog.action}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Timestamp</div>
                <div className="text-slate-600 font-mono text-[11px] mt-0.5">
                  {selectedLog.time ? new Date(selectedLog.time).toLocaleString() : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Entity Type</div>
                <div className="text-slate-800 font-bold mt-0.5">{selectedLog.entity_type || '-'}</div>
              </div>
            </div>

            {/* Modal JSON Body */}
            <div className="p-4 flex-1 overflow-y-auto space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Raw Changes Payload:
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyJson(selectedLog.changes)}
                  className="px-2 py-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <i className={`fa-solid ${copied ? 'fa-check text-emerald-600' : 'fa-copy'}`}></i>
                  <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto leading-relaxed border border-slate-800">
                {JSON.stringify(selectedLog.changes, null, 2)}
              </pre>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
