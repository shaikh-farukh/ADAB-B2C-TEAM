import React, { useState, useEffect, useRef } from 'react';
import { sellerApi } from '../api/sellerApi';

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await sellerApi.getMessages();
      setMessages(res.data.data || []);
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
        sellerApi.markMessageRead(m.id).catch(console.error);
        m.is_read = true; // Optimistic update
      });
      // Trigger a re-render to clear the badge
      setMessages([...messages]);
    }
  }, [activeChat, messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedCustomerId) return;
    
    setIsSending(true);
    try {
      const res = await sellerApi.sendMessage(selectedCustomerId, newMessage.trim());
      // Optimistically add to local state
      setMessages([...messages, res.data.data]);
      setNewMessage('');
    } catch (err) {
      alert('Failed to send message: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  if (loading) return <div className="p-6">Loading Messages...</div>;

  return (
    <div className="fade-in p-2 sm:p-6 h-[calc(100vh-80px)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold text-gray-900">Customer Messages</h1>
        <p className="text-sm text-gray-500 mt-1">Chat directly with buyers regarding their orders and inquiries.</p>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex">
        {/* Left Sidebar - Chat List */}
        <div className="w-1/3 min-w-[250px] border-r border-gray-100 flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="relative">
              <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input 
                type="text" 
                placeholder="Search customers..." 
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-dark bg-white"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {customers.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">No conversations yet.</div>
            ) : (
              customers.map(chat => (
                <button
                  key={chat.customerId}
                  onClick={() => setSelectedCustomerId(chat.customerId)}
                  className={`w-full p-4 text-left border-b border-gray-50 hover:bg-gray-50 transition flex gap-3 ${selectedCustomerId === chat.customerId ? 'bg-brand-dark/5' : ''}`}
                >
                  <div className="w-10 h-10 rounded-full bg-brand-dark/10 text-brand-dark flex flex-shrink-0 items-center justify-center font-bold text-lg">
                    {chat.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-bold text-gray-900 truncate">{chat.customerName}</div>
                      <div className="text-[10px] text-gray-400 font-semibold whitespace-nowrap ml-2">
                        {new Date(chat.lastMessage.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 truncate pr-2">
                      {chat.lastMessage.direction === 'OUTBOUND' && <i className="fa-solid fa-reply mr-1 text-gray-400"></i>}
                      {chat.lastMessage.content}
                    </div>
                  </div>
                  {chat.unreadCount > 0 && (
                    <div className="w-5 h-5 bg-red-500 rounded-full flex flex-shrink-0 items-center justify-center text-[10px] text-white font-bold">
                      {chat.unreadCount}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Side - Chat Window */}
        <div className="flex-1 flex flex-col bg-gray-50/50">
          {activeChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-dark/10 text-brand-dark flex items-center justify-center font-bold text-lg">
                    {activeChat.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-extrabold text-gray-900">{activeChat.customerName}</div>
                    <div className="text-xs text-green-600 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span> Online (Customer App)
                    </div>
                  </div>
                </div>
                <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition">
                  <i className="fa-solid fa-ellipsis-vertical"></i>
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
                {activeChat.messages.map((msg, idx) => {
                  const isMe = msg.direction === 'OUTBOUND';
                  return (
                    <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl p-3 shadow-sm ${
                        isMe ? 'bg-brand-dark text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                      }`}>
                        <div className="text-sm">{msg.content}</div>
                        <div className={`text-[9px] mt-1 text-right font-semibold ${isMe ? 'text-brand-dark/30 text-green-100' : 'text-gray-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          {isMe && <i className={`fa-solid fa-check-double ml-1 ${msg.is_read ? 'text-blue-200' : 'text-white/50'}`}></i>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 bg-white border-t border-gray-100">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <button type="button" className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition">
                    <i className="fa-solid fa-paperclip"></i>
                  </button>
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message here..." 
                    className="flex-1 py-3 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-brand-dark focus:bg-white transition"
                    disabled={isSending}
                  />
                  <button 
                    type="submit" 
                    disabled={isSending || !newMessage.trim()}
                    className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-brand-dark text-white hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i className="fa-solid fa-paper-plane"></i>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <i className="fa-regular fa-comments text-5xl mb-3 opacity-20"></i>
              <div className="font-semibold text-lg">Your Messages</div>
              <div className="text-sm">Select a conversation to start chatting.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
