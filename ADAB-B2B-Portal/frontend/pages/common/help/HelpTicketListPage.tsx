import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  Search,
  Eye,
  ChevronLeft,
  MessageSquare,
  Clock,
  User,
  X,
  LifeBuoy,
  ClipboardList,
  Inbox,
  AlertCircle
} from 'lucide-react';
import StatusBadge from '../../../components/common/StatusBadge';
import supportService from '../../../services/supportService';
import { useNotification } from '../../../context/NotificationContext';

interface Ticket {
  id: string;
  type: string;
  subject: string;
  description: string;
  status: string;
  createdDate: string;
  updates: { author: string; message: string; date: string }[];
}

const toTickets = (response: any): Ticket[] => {
  const data = response?.data || response;
  const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);

  return list.map((item: any) => ({
    id: String(item.id || '-'),
    subject: item.subject || item.title || 'No subject',
    description: item.description || item.message || '',
    type: item.issue_type || item.type || 'General',
    status: item.status || 'open',
    createdDate: item.created_at || item.createdDate || '-',
    updates: []
  }));
};

const HelpTicketListPage: React.FC = () => {
  const navigate = useNavigate();
  const { showError } = useNotification();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await supportService.getTickets();
        setTickets(toTickets(response));
      } catch (err: any) {
        showError(err.response?.data?.message || "Unable to load support tickets");
      }
    };

    fetchTickets();
  }, [showError]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t =>
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, tickets]);

  const openTicketDetails = async (ticket: Ticket) => {
    try {
      const response = await supportService.getTicketById(ticket.id);
      const detail = response?.data || response;
      setSelectedTicket({
        ...ticket,
        id: String(detail?.ticket_id || detail?.id || ticket.id),
        type: detail?.issue_type || ticket.type,
        description: detail?.description || ticket.description,
        status: detail?.status || ticket.status,
        createdDate: detail?.created_at || ticket.createdDate,
        updates: detail?.admin_response
          ? [{ author: 'Support', message: detail.admin_response, date: detail?.updated_at || '-' }]
          : []
      });
    } catch {
      setSelectedTicket(ticket);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-24 animate-in fade-in duration-700">
      {/* Polished Page Header */}
      <div className="mb-10 md:mb-12 flex flex-col md:flex-row md:items-center md:justify-between gap-8 border-b border-gray-100 pb-10">
        <div>
          <button
            onClick={() => navigate('/common/help')}
            className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-adab-orange transition-colors mb-6 group"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Raise New Query
          </button>
          <div className="flex items-center gap-2 text-adab-orange mb-2">
            <History className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Support Correspondence</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-dark-text-primary tracking-tight leading-none">Support History</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-dark-text-secondary font-medium max-w-xl">Monitor the status of your reported issues and review historical resolutions.</p>
        </div>

        <div />
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-dark-surface-card border border-gray-200 dark:border-dark-border-primary rounded-3xl p-4 shadow-sm mb-8 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Filter by Ticket ID or Subject..." 
            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-dark-surface-elevated border border-transparent dark:border-dark-border-primary rounded-2xl text-sm text-gray-900 dark:text-dark-text-primary focus:bg-white dark:focus:bg-dark-surface-card focus:border-adab-green/20 focus:ring-4 focus:ring-adab-green/5 outline-none transition-all font-bold" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
      </div>

      {/* Ticket Table */}
      <div className="bg-white dark:bg-dark-surface-card border border-gray-200 dark:border-dark-border-primary rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-dark-surface-elevated border-b border-gray-100 dark:border-dark-border-primary">
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Registry ID</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Inquiry Subject</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Lifecycle Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Logged Date</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-dark-border-primary">
              {filteredTickets.length > 0 ? (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <span className="text-[11px] font-mono font-black text-gray-400 bg-gray-50 px-2 py-1 rounded-lg uppercase tracking-widest border border-gray-100">
                        {ticket.id}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-900 group-hover:text-adab-orange transition-colors truncate max-w-[300px]">
                          {ticket.subject}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{ticket.type}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-xs font-bold text-gray-600">{ticket.createdDate}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button
                        onClick={() => openTicketDetails(ticket)}
                        className="inline-flex items-center justify-center p-2.5 bg-white border border-gray-200 rounded-xl text-gray-400 hover:border-adab-green hover:text-adab-green hover:bg-green-50 transition-all active:scale-95 shadow-sm"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center max-w-sm mx-auto">
                      <div className="w-24 h-24 bg-gray-50 dark:bg-dark-surface-elevated rounded-full flex items-center justify-center mb-8 border border-gray-100 dark:border-dark-border-primary shadow-inner">
                        <Inbox className="w-12 h-12 text-gray-200 dark:text-gray-700" />
                      </div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-dark-text-primary tracking-tight leading-none mb-3">No tickets recorded</h3>
                      <p className="text-gray-500 dark:text-dark-text-secondary text-sm font-medium leading-relaxed">You haven't logged any support inquiries in the current session history.</p>
                      <button
                        onClick={() => navigate('/common/help')}
                        className="mt-8 px-8 py-3 bg-adab-green text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-green-900/10 hover:bg-green-800 transition-all"
                      >
                        Open New Ticket
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <div
            className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setSelectedTicket(null)}
          />
          <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-primary rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl relative z-10 animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 flex flex-col">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-gray-100 dark:border-dark-border-primary flex items-center justify-between bg-gray-50/50 dark:bg-dark-surface-card shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-dark-surface-elevated border border-gray-200 dark:border-dark-border-primary flex items-center justify-center text-adab-orange shadow-sm">
                  <LifeBuoy className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 dark:text-dark-text-muted uppercase tracking-[0.2em] leading-none mb-1">Ticket Detail</p>
                  <h3 className="text-lg font-black text-gray-900 dark:text-dark-text-primary leading-none">{selectedTicket.id}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-3 bg-white dark:bg-dark-surface-elevated border border-gray-200 dark:border-dark-border-primary rounded-2xl text-gray-400 dark:text-dark-text-muted hover:text-gray-900 dark:hover:text-dark-text-primary transition-colors shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                <div className="md:col-span-2 space-y-10">
                  {/* Problem Description */}
                  <section>
                    <div className="flex items-center gap-3 text-adab-green mb-4">
                      <MessageSquare className="w-4 h-4" />
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Inquiry Context</h4>
                    </div>
                    <div className="bg-gray-50/50 dark:bg-dark-surface-elevated border border-gray-100 dark:border-dark-border-primary rounded-3xl p-8">
                      <h2 className="text-xl font-black text-gray-900 dark:text-dark-text-primary mb-4">{selectedTicket.subject}</h2>
                      <p className="text-gray-600 dark:text-dark-text-secondary text-sm leading-relaxed font-medium whitespace-pre-line">
                        {selectedTicket.description}
                      </p>
                    </div>
                  </section>

                  {/* Conversation / Updates Section */}
                  <section>
                    <div className="flex items-center gap-3 text-adab-orange mb-6">
                      <ClipboardList className="w-4 h-4" />
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Correspondence Log</h4>
                    </div>
                    <div className="space-y-6">
                      {selectedTicket.updates.map((update, idx) => (
                        <div key={idx} className="flex gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                            <User className="w-5 h-5" />
                          </div>
                          <div className="bg-gray-50 rounded-2xl p-5 flex-1 border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-black text-gray-900 uppercase tracking-widest">{update.author}</span>
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{update.date}</span>
                            </div>
                            <p className="text-xs text-gray-600 font-medium leading-relaxed">{update.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-8">
                  <div className="bg-gray-50 border border-gray-100 rounded-[2rem] p-6 space-y-6">
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Status Tier</p>
                      <StatusBadge status={selectedTicket.status} className="w-full justify-center py-2 text-xs" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Issue Type</p>
                      <p className="text-sm font-black text-gray-900">{selectedTicket.type}</p>
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Created At</p>
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                        <Clock className="w-4 h-4 text-gray-300" />
                        {selectedTicket.createdDate}
                      </div>
                    </div>
                  </div>

                  <div className="bg-adab-orange/5 border border-adab-orange/10 rounded-3xl p-6 flex items-start gap-4">
                    <AlertCircle className="w-5 h-5 text-adab-orange shrink-0 mt-0.5" />
                    <p className="text-[10px] leading-relaxed text-gray-500 font-bold uppercase tracking-widest">
                      Liaison updates are transmitted directly to your registered work email.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 flex justify-end shrink-0">
               <button
                onClick={() => setSelectedTicket(null)}
                className="px-8 py-3 bg-white border border-gray-200 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-gray-900 hover:text-gray-900 transition-all active:scale-95 shadow-sm"
              >
                Dismiss View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpTicketListPage;
