import React, { useState, useEffect } from 'react';
import { sellerApi } from '../api/sellerApi';

export default function MessagesPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [conversation, setConversation] = useState([]);

  useEffect(() => {
    async function loadMessages() {
      try {
        setLoading(true);
        const res = await sellerApi.getMessages();
        if (res.data && res.data.success) {
          const list = res.data.data || [];
          setMessages(list);
          if (list.length > 0) {
            setActiveChat(list[0]);
            setConversation([
              { sender: 'customer', text: 'Hi, is there any update on my order?' },
              { sender: 'merchant', text: 'Hello! Your order has been packed and is ready for dispatch.' }
            ]);
          }
        } else {
          setMessages([]);
        }
      } catch (e) {
        setMessages([]);
      } finally {
        setLoading(false);
      }
    }
    loadMessages();
  }, []);

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setConversation(prev => [...prev, { sender: 'merchant', text: replyText.trim() }]);
    setReplyText('');
  };

  return (
    <section id="sec-messages" className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold">Store Messages &amp; Chat</h1>
        <p className="text-sm text-gray-500">Live communication with ordering customers, partner stores, and buyers</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-2 lg:col-span-1 space-y-1 max-h-[480px] overflow-y-auto" id="msgList">
          {loading && (
            <div className="p-4 text-center text-gray-500 text-xs">
              <i className="fa-solid fa-spinner fa-spin mr-2"></i> Loading conversations...
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="p-4 text-center text-gray-400 text-xs">
              No customer messages yet.
            </div>
          )}

          {!loading && messages.map((m, idx) => (
            <button 
              key={m.id || idx} 
              onClick={() => {
                setActiveChat(m);
                setConversation([
                  { sender: 'customer', text: `Inquiry regarding order #${m.order_number || '9000'}` },
                  { sender: 'merchant', text: 'We are processing your request right away.' }
                ]);
              }}
              className={`msg-item w-full text-left p-3 rounded-xl transition ${activeChat?.id === m.id ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50'}`}
            >
              <div className="font-bold text-sm text-gray-900">{m.customer_name || 'Customer'}</div>
              <div className="text-xs text-gray-500 truncate">Order #{m.order_number || 'Live Order'}</div>
              <div className="text-[10px] text-green-700 font-bold mt-1">{m.time_ago || 'Recent'}</div>
            </button>
          ))}
        </div>

        <div className="card p-5 lg:col-span-2 flex flex-col min-h-[400px]">
          {activeChat ? (
            <>
              <div className="font-bold mb-1 text-gray-900">{activeChat.customer_name || 'Customer'} · Order #{activeChat.order_number || '9000'}</div>
              <div className="text-xs text-gray-500 mb-4">Direct Buyer Communication</div>

              <div className="flex-1 space-y-3 text-sm overflow-y-auto max-h-[300px] p-2 bg-gray-50/50 rounded-xl">
                {conversation.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-xl max-w-[80%] ${msg.sender === 'merchant' ? 'bg-green-600 text-white ml-auto' : 'bg-gray-200 text-gray-800'}`}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendReply} className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <input 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply to customer..." 
                  className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-green-500 text-sm" 
                />
                <button type="submit" className="btn-primary !text-xs px-4">
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Select a conversation to reply
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

