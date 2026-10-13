import React, { useState, useEffect, useRef } from 'react';
import { sellerApi } from '../api/sellerApi';
import { useSeller } from '../context/SellerContext';
import { useSocket } from '../context/SocketProvider';

export default function MessagesPage() {
  const { profile } = useSeller();
  const { socket, isConnected, subscribe } = useSocket();
  const userId = profile?.id || profile?.user_id || localStorage.getItem('seller_user_id') || null;

  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [activeChatMessages, setActiveChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const chatEndRef = useRef(null);

  // 1. Initial load of threads
  useEffect(() => {
    fetchThreads();
  }, []);

  const fetchThreads = async () => {
    try {
      const res = await sellerApi.getThreads();
      const list = res?.data?.data || res?.data || res || [];
      setThreads(Array.isArray(list) ? list : []);
      if (!selectedThreadId && Array.isArray(list) && list.length > 0) {
        setSelectedThreadId(list[0].thread_id);
      }
    } catch (err) {
      console.error('Failed to load threads:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch messages when selected thread changes
  useEffect(() => {
    if (selectedThreadId) {
      fetchThreadMessages(selectedThreadId);
    }
  }, [selectedThreadId]);

  const fetchThreadMessages = async (threadId) => {
    try {
      const res = await sellerApi.getThreadMessages(threadId);
      const msgs = res?.data?.data || res?.data || res || [];
      setActiveChatMessages(Array.isArray(msgs) ? msgs : []);

      const thread = threads.find(t => t.thread_id === threadId);
      if (thread && Number(thread.unread_count) > 0) {
        await sellerApi.markThreadRead(threadId);
        setThreads(prev => prev.map(t => t.thread_id === threadId ? { ...t, unread_count: 0 } : t));
        if (socket) {
          socket.emit('mark_read', { threadId });
        }
      }
    } catch (err) {
      console.error('Failed to load messages for thread:', err);
    }
  };

  // 3. Real-time WebSocket Listeners (using shared SocketProvider)
  useEffect(() => {
    if (!subscribe) return;

    // Listen for incoming message
    const unsubReceive = subscribe('receive_message', (msg) => {
      if (!msg) return;

      // If belongs to currently open thread, append it
      if (msg.thread_id === selectedThreadId) {
        setActiveChatMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }

      // Update thread list preview
      setThreads(prev => {
        const found = prev.find(t => t.thread_id === msg.thread_id);
        if (found) {
          return prev.map(t => {
            if (t.thread_id === msg.thread_id) {
              return {
                ...t,
                last_message_body: msg.content,
                last_message_date: msg.created_at,
                unread_count: msg.thread_id === selectedThreadId ? 0 : Number(t.unread_count || 0) + 1
              };
            }
            return t;
          });
        }
        // If it's a new thread, refresh list
        fetchThreads();
        return prev;
      });
    });

    // Listen for read receipts
    const unsubRead = subscribe('message_read_status', (data) => {
      if (!data) return;
      if (data.thread_id === selectedThreadId) {
        setActiveChatMessages(prev => prev.map(m => ({ ...m, is_read: true })));
      }
    });

    return () => {
      unsubReceive();
      unsubRead();
    };
  }, [subscribe, selectedThreadId]);

  // 4. Auto scroll to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChatMessages]);

  // 5. Send message (Socket with HTTP fallback)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedThreadId) return;

    const content = newMessage.trim();
    setIsSending(true);

    try {
      // Send via HTTP API
      const res = await sellerApi.sendThreadMessage(selectedThreadId, content);
      const sentMsg = res?.data?.data || res?.data || res;

      if (sentMsg) {
        setActiveChatMessages(prev => [...prev, sentMsg]);
        setThreads(prev => prev.map(t => {
          if (t.thread_id === selectedThreadId) {
            return { ...t, last_message_body: sentMsg.content, last_message_date: sentMsg.created_at };
          }
          return t;
        }));

        // Also notify via Socket if connected
        if (socket) {
          socket.emit('send_message', { threadId: selectedThreadId, content });
        }
      }
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const activeThread = threads.find(t => t.thread_id === selectedThreadId);

  const filteredThreads = threads.filter(t => {
    if (!searchQuery) return true;
    const name = String(t.customer_name || '').toLowerCase();
    const lastMsg = String(t.last_message_body || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || lastMsg.includes(q);
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center text-gray-500 h-[500px]">
        <i className="fa-solid fa-spinner fa-spin mr-2"></i> Loading Messages...
      </div>
    );
  }

  return (
    <div className="fade-in space-y-4 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Store Messages &amp; Chat</h1>
          <p className="text-sm text-gray-500">Live communication with ordering customers, partner stores, and buyers</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
            isConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            {isConnected ? 'Real-Time Connected' : 'Connecting...'}
          </span>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex min-h-[500px]">
        {/* Left Sidebar - Thread List */}
        <div className="w-1/3 min-w-[280px] max-w-[340px] border-r border-gray-100 flex flex-col">
          <div className="p-3 border-b border-gray-100 bg-gray-50">
            <div className="relative">
              <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..." 
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-dark bg-white shadow-sm"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                <i className="fa-regular fa-comments text-3xl mb-3 opacity-30"></i>
                <div>No conversations yet.</div>
              </div>
            ) : (
              filteredThreads.map(t => (
                <button
                  key={t.thread_id}
                  onClick={() => setSelectedThreadId(t.thread_id)}
                  className={`w-full p-4 text-left border-b border-gray-50 hover:bg-gray-50 transition flex gap-3 ${
                    selectedThreadId === t.thread_id ? 'bg-emerald-50/70 border-l-4 border-l-brand-dark' : 'border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-brand-dark/10 text-brand-dark flex flex-shrink-0 items-center justify-center font-bold text-base">
                    {(t.customer_name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-bold text-gray-900 truncate text-sm">{t.customer_name || 'Customer'}</div>
                      <div className="text-[10px] text-gray-400 font-semibold whitespace-nowrap ml-2">
                        {t.last_message_date ? new Date(t.last_message_date).toLocaleDateString() : ''}
                      </div>
                    </div>
                    <div className={`text-xs truncate pr-2 ${Number(t.unread_count) > 0 ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
                      {t.last_message_body || 'Started a conversation'}
                    </div>
                  </div>
                  {Number(t.unread_count) > 0 && (
                    <div className="w-5 h-5 bg-red-500 rounded-full flex flex-shrink-0 items-center justify-center text-[10px] text-white font-bold shadow-sm">
                      {t.unread_count}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Side - Chat Window */}
        <div className="flex-1 flex flex-col bg-slate-50/50">
          {activeThread ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100 bg-white flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-dark/10 text-brand-dark flex items-center justify-center font-bold text-lg">
                    {(activeThread.customer_name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-extrabold text-gray-900">{activeThread.customer_name || 'Customer'}</div>
                    <div className="text-xs text-green-600 font-bold flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Active Conversation
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
                {activeChatMessages.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm my-auto">
                    No messages in this conversation yet. Send a message below!
                  </div>
                ) : (
                  activeChatMessages.map((msg, idx) => {
                    const isMe = msg.direction === 'OUTBOUND';
                    return (
                      <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] lg:max-w-[60%] p-3 shadow-sm ${
                          isMe ? 'bg-brand-dark text-white rounded-2xl rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm'
                        }`}>
                          <div className="text-sm leading-relaxed">{msg.content}</div>
                          <div className={`text-[10px] mt-1.5 text-right font-semibold flex items-center justify-end gap-1 ${isMe ? 'text-green-100' : 'text-gray-400'}`}>
                            {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                            {isMe && <i className={`fa-solid fa-check-double text-[10px] ${msg.is_read ? 'text-blue-300' : 'text-white/50'}`}></i>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 bg-white border-t border-gray-100">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message here..." 
                    className="flex-1 py-3 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-brand-dark focus:bg-white focus:ring-2 focus:ring-brand-dark/10 transition"
                    disabled={isSending}
                  />
                  <button 
                    type="submit" 
                    disabled={isSending || !newMessage.trim()}
                    className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-brand-dark text-white hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <i className="fa-solid fa-paper-plane"></i>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <i className="fa-regular fa-comments text-6xl mb-4 opacity-20"></i>
              <div className="font-semibold text-lg text-gray-600">Your Messages</div>
              <div className="text-sm">Select a conversation on the left to start chatting.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
