import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  UserPlus,
  Search,
  ShieldAlert,
  AlertCircle,
  RefreshCw,
  Clock,
  Filter,
  CheckCircle2,
  Loader2,
  TrendingUp
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import { useNotification } from '../../context/NotificationContext';
import requestService from '../../services/requestService';
import { useSocket } from '../../context/useSocket';
import RFQNegotiationModal, { RFQItem } from '../../components/RFQNegotiationModal';

interface DistributorRequest {
  id: number;
  email_distributer: string;
  distributor_id: number;
  distributor_name: string;
  company_name: string;
  region: string;
  request_date: string;
  manufacture_request: number | null;
  distributer_request: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_CONNECTED' | 'CONNECTED';
}

const DistributorRequestPage: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<number | null>(null);
  const [requests, setRequests] = useState<DistributorRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [error, setError] = useState<string | null>(null);

  // Day 2 RFQ Modal State
  const [selectedRfq, setSelectedRfq] = useState<RFQItem | null>(null);
  const [isNegotiationOpen, setIsNegotiationOpen] = useState(false);

  const normalizeStatus = (status?: string) =>
    String(status || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');

  const filteredRequests = useMemo(() => {
    let result = requests;

    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(req =>
        (req.distributor_name || '').toLowerCase().includes(lowerQuery) ||
        (req.company_name || '').toLowerCase().includes(lowerQuery) ||
        (req.email_distributer || '').toLowerCase().includes(lowerQuery)
      );
    }

    if (statusFilter !== 'All') {
      result = result.filter((req) => {
        const normalized = normalizeStatus(req.status);

        if (statusFilter === 'CONNECTED') {
          return normalized === 'CONNECTED' || normalized === 'APPROVED';
        }

        return normalized === normalizeStatus(statusFilter);
      });
    }

    return result;
  }, [requests, statusFilter, searchQuery]);

  // Direct invite states
  const [inviteDistributor, setInviteDistributor] = useState<any | null>(null);
  const [inviteMessage, setInviteMessage] = useState('');

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== 'All') params.status = statusFilter;

      const response = await requestService.getReceivedRequests(params);
      if (response.success) {
        setRequests(response.data || []);
      } else {
        const msg = response.message || "Failed to retrieve partnership invitations";
        setError(msg);
        showError(msg);
        setRequests([]);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Network error occurred while fetching invitations";
      setError(msg);
      showError(msg);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, showError]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRequests();
    }, 400); // Debounce search input
    return () => clearTimeout(timer);
  }, [fetchRequests]);

  // Real-time socket event listener for RFQ updates (Day 1 infrastructure reuse)
  useSocket({
    event: 'RFQ_UPDATE',
    handler: () => {
      fetchRequests();
    }
  });

  const handleReinvite = async (reqItem: DistributorRequest) => {
    if (!reqItem.distributor_id) {
      showError("Distributor ID not found, cannot re-invite");
      return;
    }

    setIsActionLoading(reqItem.id);
    try {
      const response = await requestService.sendConnectionRequest({
        distributor_id: reqItem.distributor_id,
        description: `Re-invitation connection request`
      });

      if (response.success) {
        showSuccess(response.message || `Re-invitation sent to ${reqItem.company_name}`);
        await fetchRequests();
      } else {
        showError(response.message || "Failed to send re-invitation");
      }
    } catch (err: any) {
      showError(err.response?.data?.message || "An error occurred while sending re-invitation");
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteDistributor) return;

    setIsActionLoading(inviteDistributor.id);
    try {
      const response = await requestService.sendConnectionRequest({
        distributor_id: inviteDistributor.distributor_id,
        description: inviteMessage.trim() || undefined
      });

      if (response.success) {
        showSuccess(response.message || `Invitation sent to ${inviteDistributor.distributor_name}`);
        setInviteDistributor(null);
        setInviteMessage('');
        await fetchRequests();
      } else {
        showError(response.message || "Failed to send invitation");
      }
    } catch (err: any) {
      showError(err.response?.data?.message || "An error occurred while sending invitation");
    } finally {
      setIsActionLoading(null);
    }
  };

  return (
    <div className="space-y-8 md:space-y-10 animate-in fade-in duration-500 pb-20">
      {/* Polished Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          <div className="flex items-center gap-2 text-adab-orange mb-1.5">
            <UserPlus className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Partner Relations</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-dark-text-secondary tracking-tight leading-none uppercase">Sent Invitations</h1>
          <p className="mt-1.5 text-sm text-gray-500 font-medium">Track and manage B2B connection invitations sent to distributors.</p>
        </div>
        <button
          onClick={fetchRequests}
          className="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Sync Registry
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 text-red-600 text-sm font-medium animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-[2rem] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4">
           <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by distributor name..." 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-dark-surface-elevated border border-gray-200 dark:border-dark-border-primary rounded-xl text-sm text-gray-900 dark:text-dark-text-primary focus:ring-2 focus:ring-adab-orange/20 outline-none transition-all" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-dark-surface-elevated border border-gray-200 dark:border-dark-border-primary text-gray-900 dark:text-dark-text-primary rounded-xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-adab-orange/20 [color-scheme:light] dark:[color-scheme:dark]"
            >
              <option value="All">All Statuses</option>
              <option value="CONNECTED">Connected</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Declined</option>
              <option value="NOT_CONNECTED">Not Connected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-dark-surface-elevated border-b border-gray-100 dark:border-dark-border-primary">
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 dark:text-dark-text-secondary uppercase tracking-widest">Distributor Entity</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 dark:text-dark-text-secondary uppercase tracking-widest">Operational Region</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 dark:text-dark-text-secondary uppercase tracking-widest text-center">Connection Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 dark:text-dark-text-secondary uppercase tracking-widest text-right">Details / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-dark-border-primary">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-8 py-6 space-y-3"><div className="bg-gray-100 h-5 w-48 rounded-lg" /><div className="bg-gray-50 h-3 w-32 rounded-lg" /></td>
                    <td className="px-8 py-6"><div className="bg-gray-100 h-5 w-24 rounded-lg" /></td>
                    <td className="px-8 py-6"><div className="bg-gray-100 h-7 w-28 mx-auto rounded-full" /></td>
                    <td className="px-8 py-6 text-right"><div className="bg-gray-100 h-10 w-24 ml-auto rounded-xl" /></td>
                  </tr>
                ))
              ) : filteredRequests.length > 0 ? (
                filteredRequests.map((req) => (
                  <tr key={req.distributor_id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-black text-gray-900 dark:text-dark-text-secondary group-hover:text-adab-orange transition-colors truncate">{req.distributor_name || req.company_name}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 truncate">{req.email_distributer}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[10px] font-black text-gray-500 dark:text-dark-text-secondary bg-gray-100 dark:bg-dark-surface-elevated border border-gray-200 dark:border-dark-border-primary px-3 py-1 rounded-xl uppercase tracking-widest">
                        {req.region || 'Global'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      {(req.status === 'APPROVED' || req.status === 'CONNECTED') && (
                        <span className="inline-flex px-3 py-1 bg-green-50 text-adab-green border border-green-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                          Connected
                        </span>
                      )}
                      {req.status === 'PENDING' && (
                        <span className="inline-flex px-3 py-1 bg-orange-50 text-adab-orange border border-orange-200 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse">
                          Pending Response
                        </span>
                      )}
                      {req.status === 'REJECTED' && (
                        <span className="inline-flex px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                          Declined
                        </span>
                      )}
                      {req.status === 'NOT_CONNECTED' && (
                        <span className="inline-flex px-3 py-1 bg-gray-50 text-gray-400 border border-gray-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                          Not Connected
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                       {(req as any).request_id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  const details = await requestService.getRequestDetails((req as any).request_id);
                                  setSelectedRfq(details.data || {
                                    id: (req as any).request_id,
                                    distributor_name: req.distributor_name || req.company_name,
                                    company_name: req.company_name,
                                    target_price: (req as any).target_price,
                                    counter_price: (req as any).counter_price,
                                    deadline: (req as any).deadline,
                                    status: req.status,
                                    negotiation_history: (req as any).negotiation_history
                                  });
                                } catch (e) {
                                  setSelectedRfq({
                                    id: (req as any).request_id,
                                    distributor_name: req.distributor_name || req.company_name,
                                    company_name: req.company_name,
                                    target_price: (req as any).target_price,
                                    counter_price: (req as any).counter_price,
                                    deadline: (req as any).deadline,
                                    status: req.status,
                                    negotiation_history: (req as any).negotiation_history
                                  });
                                }
                                setIsNegotiationOpen(true);
                              }}
                              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.15em] shadow-md transition-all active:scale-95 flex items-center gap-1.5 ml-auto"
                            >
                              <TrendingUp className="w-3.5 h-3.5" />
                              Negotiate / Quote
                            </button>
                          </div>
                       ) : req.status === 'PENDING' ? (
                          <span className="text-xs text-gray-500 font-medium italic flex items-center justify-end gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            Awaiting distributor response
                          </span>
                       ) : req.status === 'REJECTED' ? (
                          <button
                            onClick={() => handleReinvite(req)}
                            disabled={isActionLoading === req.id}
                            className="px-4 py-2 bg-white border border-orange-200 text-adab-orange rounded-xl text-[10px] font-black uppercase tracking-[0.15em] hover:border-adab-orange hover:bg-orange-50 hover:shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 ml-auto"
                          >
                            {isActionLoading === req.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <UserPlus className="w-3.5 h-3.5" />
                            )}
                            Re-invite
                          </button>
                       ) : req.status === 'NOT_CONNECTED' ? (
                          <button
                            onClick={() => setInviteDistributor(req)}
                            disabled={isActionLoading === req.id}
                            className="px-4 py-2 bg-adab-green hover:bg-green-800 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.15em] shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 ml-auto"
                          >
                            {isActionLoading === req.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <UserPlus className="w-3.5 h-3.5" />
                            )}
                            Invite
                          </button>
                       ) : (
                          <span className="text-xs text-adab-green font-bold flex items-center justify-end gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active connection
                          </span>
                       )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center max-w-sm mx-auto">
                      <div className="w-24 h-24 bg-gray-50 dark:bg-dark-surface-elevated rounded-full flex items-center justify-center mb-8 border border-gray-100 dark:border-dark-border-primary shadow-inner">
                        {error ? <AlertCircle className="w-12 h-12 text-adab-orange" /> : <ShieldAlert className="w-12 h-12 text-gray-300 dark:text-gray-600" />}
                      </div>
                      <h3 className="text-xl font-extrabold text-gray-900 dark:text-dark-text-primary tracking-tight leading-none mb-3 uppercase">
                        {error ? "Synchronisation Error" : "No Distributors Found"}
                      </h3>
                      <p className="text-gray-500 dark:text-dark-text-secondary text-sm font-medium leading-relaxed">
                        {error ? error : "No distributors matched your search or filters."}
                      </p>
                      {error && (
                        <button
                          onClick={() => fetchRequests()}
                          className="mt-10 inline-flex items-center gap-3 px-8 py-3.5 bg-adab-green text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-green-900/10 hover:bg-green-800 transition-all active:scale-95"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Retry Fetch
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invitation Modal */}
      {inviteDistributor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => !isActionLoading && setInviteDistributor(null)} />
          <form onSubmit={handleSendInvitation} className="bg-white dark:bg-dark-app-secondary border border-gray-100 dark:border-dark-border-primary rounded-[2rem] w-full max-w-md p-8 md:p-10 shadow-2xl relative z-10 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="w-16 h-16 rounded-2xl bg-green-50 text-adab-green flex items-center justify-center mb-6 mx-auto shadow-inner">
              <UserPlus className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-dark-text-primary text-center tracking-tight mb-2 uppercase">Invite Partner</h3>
            <p className="text-gray-500 dark:text-dark-text-secondary text-center text-sm font-medium leading-relaxed mb-6">
              Send a connection request to <span className="font-bold text-gray-900 dark:text-dark-text-primary">{inviteDistributor.distributor_name}</span> to allow them to view your catalog and place orders.
            </p>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-2">Optional Invitation Message</label>
                <textarea
                  rows={4}
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="State your distribution goals, specialized pricing tiers, or introductory comments..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-elevated border border-gray-200 dark:border-dark-border-primary text-gray-900 dark:text-dark-text-primary rounded-2xl outline-none focus:ring-4 focus:ring-adab-green/10 focus:border-adab-green transition-all text-xs font-semibold resize-none"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                disabled={isActionLoading !== null}
                onClick={() => setInviteDistributor(null)}
                className="flex-1 py-3.5 border border-gray-200 dark:border-dark-border-primary text-gray-500 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isActionLoading !== null}
                className="flex-1 py-3.5 bg-adab-green hover:bg-green-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-900/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isActionLoading !== null ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Send Invite'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RFQ Negotiation Modal (Role: Manufacturer) */}
      <RFQNegotiationModal
        isOpen={isNegotiationOpen}
        onClose={() => setIsNegotiationOpen(false)}
        rfq={selectedRfq}
        userRole="manufacturer"
        onSuccess={() => {
          fetchRequests();
        }}
      />
    </div>
  );
};

export default DistributorRequestPage;