import React, { useState, useEffect, useRef } from 'react';
import { SupportAPI, OrderAPI } from '../services/api';

/**
 * Help & Customer Support View (sec-help, sec-messages)
 * Features:
 * 1. Support Hub (#sec-help):
 *    - Quick Action Cards ("Where is my order?", "Return an item", "Chat with support", FAQs)
 *    - Searchable interactive FAQ Accordion matching unified-customer-portal-demo.html
 *    - Customer Support Tickets List with status filters (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
 * 2. Support Ticket Creation Modal:
 *    - Order-aware selection with dropdown of customer's recent orders
 *    - Category selection (ORDER, PAYMENT, DELIVERY, RETURN, PRODUCT, OTHER)
 *    - Priority selector (LOW, MEDIUM, HIGH, URGENT)
 *    - Subject & message body with optional attachment URL
 * 3. Interactive Ticket Chat / Messaging (#sec-messages):
 *    - Live message thread showing customer messages (right) and agent replies (left)
 *    - Timestamps and sender badges
 *    - Status pill with resolve/close action
 *    - Message composer bar with reply submission & attachment support
 */
export default function HelpSupportView({
  onBack,
  onNavigate,
  showToast = () => {},
  preselectedOrder = null,
  initialView = 'hub', // 'hub' | 'chat'
  initialTicketId = null,
  initialTickets = [],
  initialActiveTicket = null,
  orders = []
}) {
  const [currentView, setCurrentView] = useState(initialView); // 'hub' | 'chat'
  const [tickets, setTickets] = useState(initialTickets);
  const [activeTicket, setActiveTicket] = useState(initialActiveTicket);
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [customerOrders, setCustomerOrders] = useState(orders);

  // New Ticket Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(Boolean(preselectedOrder));
  const [newCategory, setNewCategory] = useState(preselectedOrder ? 'ORDER' : 'ORDER');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newOrderId, setNewOrderId] = useState(preselectedOrder?.id || '');
  const [newSubject, setNewSubject] = useState(
    preselectedOrder ? `Help with order #${preselectedOrder.order_number || preselectedOrder.id?.slice(0, 8)}` : ''
  );
  const [newMessage, setNewMessage] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [modalError, setModalError] = useState('');

  // Chat Composer State
  const [replyText, setReplyText] = useState('');
  const [replyAttachmentUrl, setReplyAttachmentUrl] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);
  const messagesEndRef = useRef(null);

  // FAQ Search & Items matching unified demo
  const [faqSearch, setFaqSearch] = useState('');
  const faqList = [
    {
      q: 'How is ADAB different from other apps?',
      a: 'You order from real local shops — kirana, fashion stores, dairy — not a central warehouse. Each shop sets delivery time, offers, and products.'
    },
    {
      q: 'How fast is delivery?',
      a: 'Express 14–45 mins, same-day by evening, scheduled slots, or free pickup from the shop. Options depend on each store.'
    },
    {
      q: 'Can I order from multiple shops?',
      a: 'Yes. Cart groups items by shop. Each shop prepares and delivers separately when needed.'
    },
    {
      q: 'How do reward points work?',
      a: 'Earn ~1 pt per ₹100 spent. Redeem up to 50% at checkout. 1 pt = ₹1 off.'
    },
    {
      q: 'Can I chat with a shop?',
      a: 'Yes — message the store about products, order changes, or delivery from the shop page or Messages in your profile.'
    },
    {
      q: 'Returns & refunds policy?',
      a: 'Request within 7 days. Shop picks up item; refund to UPI or wallet once approved.'
    }
  ];

  const filteredFaqs = faqList.filter(
    (f) =>
      f.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
      f.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  // Load tickets and customer orders on mount
  const refreshTickets = async () => {
    try {
      setLoading(true);
      const res = await SupportAPI.getTickets({
        status: statusFilter === 'ALL' ? '' : statusFilter,
        limit: 50
      });
      if (res?.data?.tickets) {
        setTickets(res.data.tickets);
      } else if (Array.isArray(res?.data)) {
        setTickets(res.data);
      }
    } catch (err) {
      console.warn('Failed to load support tickets:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshTickets();
  }, [statusFilter]);

  // Load customer orders for order-aware ticket dropdown
  useEffect(() => {
    if (customerOrders.length === 0) {
      OrderAPI.getOrders()
        .then((res) => {
          if (res?.data && Array.isArray(res.data)) {
            setCustomerOrders(res.data);
          }
        })
        .catch(() => {});
    }
  }, []);

  // If initialTicketId passed, load ticket chat
  useEffect(() => {
    if (initialTicketId) {
      openTicketChat(initialTicketId);
    }
  }, [initialTicketId]);

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (currentView === 'chat' && activeTicket?.messages) {
      scrollToBottom();
    }
  }, [currentView, activeTicket?.messages]);

  // Open ticket conversation view
  const openTicketChat = async (ticketIdOrObj) => {
    const id = typeof ticketIdOrObj === 'object' ? ticketIdOrObj.id : ticketIdOrObj;
    try {
      setLoadingChat(true);
      setCurrentView('chat');
      const res = await SupportAPI.getTicketDetails(id);
      if (res?.data) {
        setActiveTicket(res.data);
      }
    } catch (err) {
      console.error('Error fetching ticket conversation:', err);
      showToast(`⚠️ Could not load conversation: ${err.message}`);
    } finally {
      setLoadingChat(false);
    }
  };

  // Create ticket submission
  const handleCreateTicketSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!newCategory) {
      setModalError('Please select a category.');
      return;
    }
    if (!newMessage.trim()) {
      setModalError('Please write a message describing your inquiry or issue.');
      return;
    }

    try {
      setIsCreatingTicket(true);
      setModalError('');

      const payload = {
        category: newCategory,
        priority: newPriority,
        order_id: newOrderId || undefined,
        subject: newSubject.trim() || undefined,
        message: newMessage.trim(),
        attachment_url: newAttachmentUrl.trim() || undefined
      };

      const res = await SupportAPI.createTicket(payload);
      const created = res?.data;

      showToast(`✓ Support ticket #${created?.ticket_number || 'created'} submitted!`);
      setIsCreateModalOpen(false);
      setNewSubject('');
      setNewMessage('');
      setNewAttachmentUrl('');
      setNewOrderId('');

      await refreshTickets();

      if (created?.id) {
        await openTicketChat(created.id);
      }
    } catch (err) {
      console.error('Error creating ticket:', err);
      setModalError(err.message || 'Failed to create support ticket.');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  // Send reply message in chat
  const handleSendReply = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!replyText.trim() || !activeTicket?.id) return;

    try {
      setIsSendingReply(true);
      const res = await SupportAPI.sendMessage(activeTicket.id, {
        message: replyText.trim(),
        attachment_url: replyAttachmentUrl.trim() || undefined
      });

      const newMsg = res?.data;
      if (newMsg) {
        setActiveTicket((prev) => ({
          ...prev,
          status: prev.status === 'WAITING_CUSTOMER' ? 'IN_PROGRESS' : prev.status,
          messages: [...(prev.messages || []), newMsg]
        }));
      }

      setReplyText('');
      setReplyAttachmentUrl('');
      setShowAttachmentInput(false);
      showToast('✓ Reply sent to support');
    } catch (err) {
      console.error('Error sending reply:', err);
      showToast(`⚠️ Failed to send message: ${err.message}`);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Update ticket status (Resolve or Close)
  const handleUpdateTicketStatus = async (newStatus) => {
    if (!activeTicket?.id) return;
    try {
      await SupportAPI.updateTicket(activeTicket.id, { status: newStatus });
      setActiveTicket((prev) => ({ ...prev, status: newStatus }));
      showToast(`✓ Ticket marked as ${newStatus}`);
      refreshTickets();
    } catch (err) {
      showToast(`⚠️ Failed to update status: ${err.message}`);
    }
  };

  // Helper date format
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }) + ' · ' + d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short'
      });
    } catch {
      return String(dateStr);
    }
  };

  // Status badge helper
  const getStatusBadge = (status) => {
    const s = (status || 'OPEN').toUpperCase();
    if (s === 'OPEN') {
      return <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">OPEN</span>;
    }
    if (s === 'IN_PROGRESS') {
      return <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">IN PROGRESS</span>;
    }
    if (s === 'WAITING_CUSTOMER') {
      return <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">WAITING ON YOU</span>;
    }
    if (s === 'RESOLVED') {
      return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">RESOLVED</span>;
    }
    if (s === 'CLOSED') {
      return <span className="bg-gray-100 text-gray-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">CLOSED</span>;
    }
    return <span className="bg-gray-100 text-gray-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">{s}</span>;
  };

  // Priority badge helper
  const getPriorityBadge = (priority) => {
    const p = (priority || 'MEDIUM').toUpperCase();
    if (p === 'URGENT') {
      return <span className="bg-red-100 text-red-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded-md">URGENT</span>;
    }
    if (p === 'HIGH') {
      return <span className="bg-orange-100 text-orange-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded-md">HIGH</span>;
    }
    if (p === 'LOW') {
      return <span className="bg-gray-100 text-gray-600 text-[9px] font-extrabold px-1.5 py-0.2 rounded-md">LOW</span>;
    }
    return <span className="bg-blue-50 text-blue-700 text-[9px] font-extrabold px-1.5 py-0.2 rounded-md">MEDIUM</span>;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* ============================================================== */}
      {/* 1. SUPPORT HUB VIEW (sec-help)                                 */}
      {/* ============================================================== */}
      {currentView === 'hub' && (
        <section id="sec-help" className="pt-2 pb-6 space-y-4">
          {/* Header */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBack || (() => onNavigate && onNavigate('account'))}
                className="w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center justify-center transition cursor-pointer border border-gray-200"
                title="Back to Account"
              >
                <i className="fa-solid fa-arrow-left text-xs"></i>
              </button>
              <div>
                <h2 className="text-base font-extrabold text-gray-900 tracking-tight">
                  Help &amp; Customer Support
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Resolution center for order issues, returns, and support tickets
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="green-btn self-start sm:self-auto text-xs px-4 py-2"
            >
              <i className="fa-solid fa-plus mr-1.5"></i>
              <span>New Support Ticket</span>
            </button>
          </div>

          {/* Quick Action Cards matching unified-customer-portal-demo.html */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: Where is my order? */}
            <button
              type="button"
              onClick={() => (onNavigate ? onNavigate('track') : null)}
              className="w-full text-left bg-white border border-gray-100 hover:border-blue-200 hover:bg-blue-50/20 rounded-2xl p-4 transition cursor-pointer shadow-xs flex items-center gap-3.5 group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                <i className="fa-solid fa-location-crosshairs"></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-gray-900">Where is my order?</div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">Live track delivery &amp; rider ETA</div>
              </div>
              <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
            </button>

            {/* Card 2: Return an item */}
            <button
              type="button"
              onClick={() => (onNavigate ? onNavigate('returns') : null)}
              className="w-full text-left bg-white border border-gray-100 hover:border-orange-200 hover:bg-orange-50/20 rounded-2xl p-4 transition cursor-pointer shadow-xs flex items-center gap-3.5 group"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                <i className="fa-solid fa-rotate-left"></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-gray-900">Return an item</div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">Return request &amp; pickup slots</div>
              </div>
              <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
            </button>

            {/* Card 3: Chat with support */}
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full text-left bg-white border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/20 rounded-2xl p-4 transition cursor-pointer shadow-xs flex items-center gap-3.5 group"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#18753C] flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                <i className="fa-solid fa-headset"></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-gray-900">Chat with support</div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">Connect with our support team</div>
              </div>
              <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
            </button>
          </div>

          {/* Tickets List Section */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-gray-900">
                  Your Support Tickets ({tickets.length})
                </h3>
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
                {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                      statusFilter === st
                        ? 'bg-[#18753C] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {st === 'ALL' ? 'All Tickets' : st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="py-8 text-center text-gray-400 space-y-2">
                <i className="fa-solid fa-spinner fa-spin text-xl text-emerald-600"></i>
                <p className="text-xs">Loading support tickets...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center text-lg mx-auto">
                  <i className="fa-regular fa-comments"></i>
                </div>
                <div className="font-bold text-xs text-gray-800">No support tickets found</div>
                <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
                  Have an issue with an order, payment, or delivery? Create a ticket and our support team will respond promptly.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-2 px-4 py-2 bg-[#18753C] text-white font-bold text-xs rounded-xl hover:bg-[#156030] transition cursor-pointer"
                >
                  Create Your First Ticket
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => openTicketChat(t)}
                    className="py-3 px-2 -mx-2 hover:bg-gray-50/80 rounded-xl transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-extrabold text-xs text-gray-900">
                          {t.ticket_number || `#${t.id?.slice(0, 8)}`}
                        </span>
                        {getStatusBadge(t.status)}
                        {getPriorityBadge(t.priority)}
                        <span className="bg-gray-100 text-gray-700 text-[9px] font-bold px-1.5 py-0.2 rounded-md uppercase">
                          {t.category}
                        </span>
                        {t.order_number && (
                          <span className="bg-emerald-50 text-emerald-800 text-[10px] font-medium px-2 py-0.2 rounded-full border border-emerald-100">
                            {`Order #${t.order_number}`}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-600 truncate font-medium">
                        {t.last_message || 'Ticket conversation initialized'}
                      </p>

                      <div className="text-[10px] text-gray-400 flex items-center gap-2">
                        <span>Created {formatTime(t.created_at)}</span>
                        <span>•</span>
                        <span>{t.message_count || 1} message{t.message_count !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <span className="text-xs font-bold text-brand-green flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>Open Thread</span>
                        <i className="fa-solid fa-chevron-right text-[10px]"></i>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactive FAQs matching sec-faq */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-circle-question text-emerald-600"></i>
                <span>Frequently Asked Questions</span>
              </h3>
              <span className="text-[11px] text-gray-400">Quick Answers</span>
            </div>

            {/* FAQ Search */}
            <div className="relative">
              <input
                type="search"
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                placeholder="Search FAQs (delivery, refunds, rewards, kirana)..."
                className="w-full px-3.5 py-2 pl-9 rounded-xl border border-gray-200 text-xs outline-none focus:border-brand-green bg-white shadow-xs transition"
              />
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            </div>

            {/* Accordion FAQ Items */}
            <div className="space-y-2 pt-1">
              {filteredFaqs.map((faq, idx) => (
                <details
                  key={idx}
                  className="faq-item border border-gray-100 bg-gray-50/50 rounded-xl p-3 text-xs group cursor-pointer"
                >
                  <summary className="font-bold text-gray-900 flex items-center justify-between list-none">
                    <span>{faq.q}</span>
                    <i className="fa-solid fa-chevron-down text-gray-400 group-open:rotate-180 transition-transform text-[10px]"></i>
                  </summary>
                  <p className="text-gray-600 mt-2 leading-relaxed pl-1 pt-1 border-t border-gray-100">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 2. INTERACTIVE TICKET CHAT / MESSAGING (sec-messages)          */}
      {/* ============================================================== */}
      {currentView === 'chat' && (
        <section id="sec-messages" className="pt-2 pb-6 space-y-3">
          {/* Conversation Header */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentView('hub')}
                className="w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center justify-center transition cursor-pointer border border-gray-200"
                title="Back to Tickets"
              >
                <i className="fa-solid fa-arrow-left text-xs"></i>
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-sm text-gray-900 font-mono">
                    {activeTicket?.ticket_number || `#${activeTicket?.id?.slice(0, 8)}`}
                  </h3>
                  {getStatusBadge(activeTicket?.status)}
                  {getPriorityBadge(activeTicket?.priority)}
                  <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-1.5 py-0.2 rounded-md">
                    {activeTicket?.category}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                  <span>Support Representative: <b>ADAB Helpdesk</b></span>
                  {activeTicket?.order_number && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-700 font-bold">{`Order #${activeTicket.order_number}`}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Status Change Actions */}
            <div className="flex items-center gap-2 self-end md:self-auto">
              {activeTicket?.status !== 'RESOLVED' && activeTicket?.status !== 'CLOSED' && (
                <button
                  type="button"
                  onClick={() => handleUpdateTicketStatus('RESOLVED')}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-check text-xs"></i>
                  <span>Mark Resolved</span>
                </button>
              )}
              {activeTicket?.status !== 'CLOSED' && (
                <button
                  type="button"
                  onClick={() => handleUpdateTicketStatus('CLOSED')}
                  className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Close Ticket
                </button>
              )}
            </div>
          </div>

          {/* Chat Container Card matching demo structure */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden flex flex-col">
            {/* Top Subheader with Linked Order Info */}
            {activeTicket?.order_number && (
              <div className="p-3 bg-emerald-50/60 border-b border-emerald-100 text-xs flex items-center justify-between text-emerald-950 font-semibold">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-receipt text-emerald-700"></i>
                  <span>{`Linked Order: #${activeTicket.order_number}`}</span>
                  {activeTicket.order_status && (
                    <span className="bg-white/80 px-2 py-0.2 rounded text-[10px] font-bold uppercase">
                      {activeTicket.order_status}
                    </span>
                  )}
                </div>
                {activeTicket.order_total_amount && (
                  <span className="font-mono font-bold">
                    ₹{parseFloat(activeTicket.order_total_amount).toFixed(2)}
                  </span>
                )}
              </div>
            )}

            {/* Conversation Messages Thread */}
            <div className="p-4 space-y-3 min-h-[300px] max-h-[500px] overflow-y-auto bg-gray-50/40">
              {loadingChat ? (
                <div className="py-12 text-center text-gray-400 space-y-2">
                  <i className="fa-solid fa-spinner fa-spin text-xl text-emerald-600"></i>
                  <p className="text-xs">Loading conversation history...</p>
                </div>
              ) : !activeTicket?.messages || activeTicket.messages.length === 0 ? (
                <div className="py-12 text-center text-gray-400 space-y-2">
                  <i className="fa-regular fa-comment-dots text-2xl"></i>
                  <p className="text-xs">No messages in this ticket yet. Send a message below.</p>
                </div>
              ) : (
                activeTicket.messages.map((msg, idx) => {
                  const isCustomer =
                    msg.sender_role === 'CUSTOMER' ||
                    msg.sender_role === 'user' ||
                    msg.sender_name?.toLowerCase().includes('customer') ||
                    msg.is_customer;

                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'} space-y-1`}
                    >
                      {/* Sender Name & Role */}
                      <span className="text-[10px] text-gray-400 px-1 font-semibold flex items-center gap-1">
                        {!isCustomer && <i className="fa-solid fa-headset text-emerald-600 text-[9px]"></i>}
                        <span>{msg.sender_name || (isCustomer ? 'You' : 'Support Agent')}</span>
                        <span>•</span>
                        <span>{formatTime(msg.created_at)}</span>
                      </span>

                      {/* Message Bubble */}
                      <div
                        className={`rounded-2xl p-3 text-xs leading-relaxed max-w-[85%] sm:max-w-[75%] shadow-xs ${
                          isCustomer
                            ? 'bg-[#18753C] text-white rounded-br-xs'
                            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.message}</p>

                        {/* Optional Attached Media in Message */}
                        {msg.attachment_url && (
                          <div className="mt-2 pt-2 border-t border-white/20">
                            <a
                              href={msg.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className={`text-[11px] underline flex items-center gap-1 font-semibold ${
                                isCustomer ? 'text-green-100 hover:text-white' : 'text-blue-600 hover:text-blue-800'
                              }`}
                            >
                              <i className="fa-solid fa-paperclip text-[10px]"></i>
                              <span>View Attached Document / Photo</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Reply Composer Bar matching unified demo */}
            <div className="p-3 bg-white border-t border-gray-100 space-y-2">
              {activeTicket?.status === 'CLOSED' ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center text-xs text-gray-500">
                  <i className="fa-solid fa-lock mr-1.5 text-gray-400"></i>
                  This ticket is marked closed. To ask another question, please open a new ticket.
                </div>
              ) : (
                <form onSubmit={handleSendReply} className="space-y-2">
                  {showAttachmentInput && (
                    <div className="flex gap-2 animate-in fade-in">
                      <input
                        type="url"
                        value={replyAttachmentUrl}
                        onChange={(e) => setReplyAttachmentUrl(e.target.value)}
                        placeholder="Paste attachment / photo URL (https://...)"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-brand-green"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAttachmentInput(false)}
                        className="px-2 text-xs text-gray-400 hover:text-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAttachmentInput(!showAttachmentInput)}
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs transition cursor-pointer ${
                        replyAttachmentUrl
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                      title="Attach image link"
                    >
                      <i className="fa-solid fa-paperclip"></i>
                    </button>

                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your message to support..."
                      className="flex-1 px-3.5 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-brand-green bg-white shadow-xs"
                    />

                    <button
                      type="submit"
                      disabled={isSendingReply || !replyText.trim()}
                      className="bg-[#18753C] hover:bg-[#156030] text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isSendingReply ? (
                        <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                      ) : (
                        <>
                          <span>Send</span>
                          <i className="fa-solid fa-paper-plane text-[10px]"></i>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 3. NEW SUPPORT TICKET MODAL                                    */}
      {/* ============================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 shadow-2xl border border-gray-100 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center text-sm font-bold">
                  <i className="fa-solid fa-headset"></i>
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">
                    Create Support Ticket
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    We will respond within a few minutes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Error Banner */}
            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation text-red-500"></i>
                <span>{modalError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateTicketSubmit} className="space-y-3.5">
              {/* Category Dropdown */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-brand-green bg-white transition cursor-pointer"
                >
                  <option value="ORDER">Order Issues &amp; Cancellation</option>
                  <option value="PAYMENT">Payment, UPI &amp; Refund</option>
                  <option value="DELIVERY">Delivery Delay &amp; Rider Issue</option>
                  <option value="RETURN">Return &amp; Replacement Inquiry</option>
                  <option value="PRODUCT">Damaged / Incorrect Product</option>
                  <option value="GENERAL">General Support &amp; Account</option>
                </select>
              </div>

              {/* Order Selection (Order-Aware) */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">
                  Link to an Order (Optional)
                </label>
                <select
                  value={newOrderId}
                  onChange={(e) => setNewOrderId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-brand-green bg-white transition cursor-pointer font-mono"
                >
                  <option value="">-- No order selected (General inquiry) --</option>
                  {customerOrders.map((ord) => (
                    <option key={ord.id} value={ord.id}>
                      {`Order #${ord.order_number || ord.id.slice(0, 8)} (${ord.order_status || 'DELIVERED'}) - ₹${parseFloat(ord.grand_total || ord.total_amount || 0).toFixed(2)}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Selector Pills */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">
                  Priority Level
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewPriority(p)}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer text-center ${
                        newPriority === p
                          ? 'bg-[#18753C] border-[#18753C] text-white shadow-xs'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">
                  Subject / Summary
                </label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. Order delivered but 1 item missing"
                  maxLength={120}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-brand-green bg-white transition"
                />
              </div>

              {/* Message Description */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">
                  Detailed Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Describe your inquiry or problem in detail so our team can help you promptly..."
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-brand-green bg-white transition resize-none"
                />
              </div>

              {/* Attachment URL */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">
                  Attachment / Screenshot Link (Optional)
                </label>
                <input
                  type="url"
                  value={newAttachmentUrl}
                  onChange={(e) => setNewAttachmentUrl(e.target.value)}
                  placeholder="https://... (screenshot / proof URL)"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-brand-green bg-white transition"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={isCreatingTicket}
                  className="flex-1 py-2.5 rounded-xl bg-[#18753C] hover:bg-[#156030] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isCreatingTicket ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                      <span>Submitting Ticket...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane text-xs"></i>
                      <span>Create Ticket</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isCreatingTicket}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
