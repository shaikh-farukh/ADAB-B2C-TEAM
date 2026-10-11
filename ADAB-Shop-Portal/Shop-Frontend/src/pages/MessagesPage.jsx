import React, { useState, useEffect, useRef } from 'react';
import { sellerApi } from '../api/sellerApi';
import { useSeller } from '../context/SellerContext';
import { io } from 'socket.io-client';

export default function MessagesPage() {
  const { profile } = useSeller();
  const userId = profile?.id || profile?.user_id || localStorage.getItem('seller_user_id') || null;

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const chatEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    fetchMessages();

    // Initialize Socket
    socketRef.current = io('http://localhost:5003'); // The backend URL
    
    socketRef.current.on('connect', () => {
      socketRef.current.emit('join_seller_room', userId);
    });

    socketRef.current.on('receive_message', (msg) => {
      setMessages(prev => {
        // Prevent duplicates
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socketRef.current.on('message_read_status', (updatedMsg) => {
      setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, is_read: true } : m));
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [userId]);

  const fetchMessages = async () => {
    try {
      const res = await sellerApi.getMessages();
      setMessages(res?.data || res || []);
    } catch (err) {
      console.error('Failed to load messages', err);
    } finally {
      setLoading(false);
    }
  };

  // Group messages by customer_id
  const chatGroups = messages.reduce((acc, msg) => {
    if (!acc[msg.customer_id]) {
      acc[msg.customer_id] = {
        customerId: msg.customer_id,
        customerName: msg.customer_name,
        messages: [],
        lastMessage: null,
        unreadCount: 0
      };
    }
    acc[msg.customer_id].messages.push(msg);
    acc[msg.customer_id].lastMessage = msg;
    if (msg.direction === 'INBOUND' && !msg.is_read) {
      acc[msg.customer_id].unreadCount += 1;
    }
    return acc;
  }, {});

  // Sort customers by last message time
  const customers = Object.values(chatGroups).sort((a, b) => {
    return new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at);
  });

  const activeChat = selectedCustomerId ? chatGroups[selectedCustomerId] : null;

  useEffect(() => {
    // Scroll to bottom when active chat changes or new messages arrive
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Mark messages as read if we open a chat
    if (activeChat && activeChat.unreadCount > 0) {
      const unreadMsgs = activeChat.messages.filter(m => m.direction === 'INBOUND' && !m.is_read);
      unreadMsgs.forEach(m => {
        socketRef.current.emit('mark_read', { userId, messageId: m.id });
        // Optimistic update done via socket listener or locally
      });
    }
  }, [activeChat, messages, userId]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedCustomerId) return;
    
    // Emit via socket instead of HTTP POST
    socketRef.current.emit('send_message', {
      userId,
      customerId: selectedCustomerId,
      content: newMessage.trim()
    });
    
    setNewMessage('');
  };

  if (loading) return (
    <div className="p-6 flex items-center justify-center text-gray-500 h-[500px]">
      <i className="fa-solid fa-spinner fa-spin mr-2"></i> Loading Messages...
    </div>
  );

  return (
    <div className="fade-in space-y-4 h-[calc(100vh-120px)] flex flex-col">
      <div>
        <h1 className="text-xl font-extrabold">Store Messages &amp; Chat</h1>
        <p className="text-sm text-gray-500">Live communication with ordering customers, partner stores, and buyers</p>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex min-h-[500px]">
        {/* Left Sidebar - Chat List */}
        <div className="w-1/3 min-w-[280px] max-w-[320px] border-r border-gray-100 flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="relative">
              <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input 
                type="text" 
                placeholder="Search customers..." 
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-dark bg-white shadow-sm"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {customers.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                <i className="fa-regular fa-comments text-3xl mb-3 opacity-30"></i>
                <div>No conversations yet.</div>
              </div>
            ) : (
              customers.map(chat => (
                <button
                  key={chat.customerId}
                  onClick={() => setSelectedCustomerId(chat.customerId)}
                  className={`w-full p-4 text-left border-b border-gray-50 hover:bg-gray-50 transition flex gap-3 ${selectedCustomerId === chat.customerId ? 'bg-green-50 border-l-4 border-l-brand-dark' : 'border-l-4 border-l-transparent'}`}
                >
                  <div className="w-10 h-10 rounded-full bg-brand-dark/10 text-brand-dark flex flex-shrink-0 items-center justify-center font-bold text-lg">
                    {chat.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-bold text-gray-900 truncate text-sm">{chat.customerName}</div>
                      <div className="text-[10px] text-gray-400 font-semibold whitespace-nowrap ml-2">
                        {new Date(chat.lastMessage.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={`text-xs truncate pr-2 ${chat.unreadCount > 0 ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
                      {chat.lastMessage.direction === 'OUTBOUND' && <i className="fa-solid fa-reply mr-1 text-gray-400"></i>}
                      {chat.lastMessage.content}
                    </div>
                  </div>
                  {chat.unreadCount > 0 && (
                    <div className="w-5 h-5 bg-red-500 rounded-full flex flex-shrink-0 items-center justify-center text-[10px] text-white font-bold shadow-sm">
                      {chat.unreadCount}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Side - Chat Window */}
        <div className="flex-1 flex flex-col bg-slate-50/50">
          {activeChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100 bg-white flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-dark/10 text-brand-dark flex items-center justify-center font-bold text-lg">
                    {activeChat.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-extrabold text-gray-900">{activeChat.customerName}</div>
                    <div className="text-xs text-green-600 font-bold flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online (Customer App)
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition">
                    <i className="fa-solid fa-phone"></i>
                  </button>
                  <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition">
                    <i className="fa-solid fa-ellipsis-vertical"></i>
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-5">
                <div className="text-center mb-4">
                  <span className="bg-gray-200/60 text-gray-500 text-[10px] font-bold px-3 py-1 rounded-full">Conversation Started</span>
                </div>
                {activeChat.messages.map((msg, idx) => {
                  const isMe = msg.direction === 'OUTBOUND';
                  return (
                    <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] lg:max-w-[60%] p-3 shadow-sm ${
                        isMe ? 'bg-brand-dark text-white rounded-2xl rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm'
                      }`}>
                        <div className="text-sm leading-relaxed">{msg.content}</div>
                        <div className={`text-[10px] mt-1.5 text-right font-semibold flex items-center justify-end gap-1 ${isMe ? 'text-green-100' : 'text-gray-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          {isMe && <i className={`fa-solid fa-check-double text-[10px] ${msg.is_read ? 'text-blue-300' : 'text-white/50'}`}></i>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 bg-white border-t border-gray-100">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                  <button type="button" className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition">
                    <i className="fa-solid fa-paperclip"></i>
                  </button>
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message here..." 
                    className="flex-1 py-3.5 px-5 rounded-2xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-brand-dark focus:bg-white focus:ring-4 focus:ring-brand-dark/10 transition"
                    disabled={isSending}
                  />
                  <button 
                    type="submit" 
                    disabled={isSending || !newMessage.trim()}
                    className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-2xl bg-brand-dark text-white hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-green-900/20"
                  >
                    <i className="fa-solid fa-paper-plane text-lg translate-x-[-1px] translate-y-[1px]"></i>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <i className="fa-regular fa-comments text-6xl mb-4 opacity-20"></i>
              <div className="font-semibold text-lg text-gray-600">Your Messages</div>
              <div className="text-sm">Select a conversation to start chatting.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
