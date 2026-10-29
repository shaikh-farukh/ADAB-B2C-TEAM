import React, { useState, useEffect, useRef } from 'react';
import { useSeller } from '../context/SellerContext';
import { useTranslation } from '../context/LanguageContext';

export default function AiCopilotDrawer({ isOpen, onClose }) {
  const { profile, store } = useSeller();
  const { t, language } = useTranslation();
  const storeName = store?.store_name || 'My Store';
  const merchantName = profile?.full_name?.split(' ')[0] || 'Merchant';

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Namaste ${merchantName}! 🙏 I am your ADAB Store Copilot powered by Gemini 3.5. You can ask me to pack orders, check inventory, analyze sales, or find B2B suppliers.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Setup Web Speech API for voice recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      
      // Map app language to STT locale
      const localeMap = {
        en: 'en-IN',
        hi: 'hi-IN',
        gu: 'gu-IN'
      };
      recognition.lang = localeMap[language] || 'en-IN';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (e) => {
        console.warn('Speech recognition error:', e.error);
        setIsListening(false);
      };
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          handleSend(transcript);
        }
      };

      recognitionRef.current = recognition;
    }
  }, [language]);

  const toggleSpeech = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Speech start error:', err);
      }
    }
  };

  const handleSend = (textToSend = input) => {
    const query = textToSend.trim();
    if (!query) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    // Simulated Copilot intelligence with rich preview cards
    setTimeout(() => {
      const lower = query.toLowerCase();
      let replyText = '';
      let widget = null;

      if (lower.includes('pack') || lower.includes('order')) {
        replyText = `Found 2 pending orders ready for packing:`;
        widget = {
          type: 'ORDER_PACK_CARD',
          orders: [
            { id: '#108', customer: 'Rahul Sharma', amount: 180, items: 2 },
            { id: '#109', customer: 'Priya Patel', amount: 220, items: 1 }
          ]
        };
      } else if (lower.includes('sales') || lower.includes('revenue') || lower.includes('profit')) {
        replyText = `Here is your 30-day performance summary from live store records:`;
        widget = {
          type: 'SALES_SUMMARY_CARD',
          revenue: '₹2,100',
          orders: 47,
          aov: '₹45'
        };
      } else if (lower.includes('stock') || lower.includes('inventory') || lower.includes('low')) {
        replyText = `Found 1 item running critically low in ${storeName}:`;
        widget = {
          type: 'LOW_STOCK_CARD',
          item: 'Fortune Sunlite Refined Sunflower Oil 1L',
          remaining: 2,
          reorderQty: 20
        };
      } else if (lower.includes('tax') || lower.includes('gstr') || lower.includes('gst')) {
        replyText = `GSTR-3B tax summary computed across 5% & 12% grocery slabs:`;
        widget = {
          type: 'GSTR_TAX_CARD',
          taxable: '₹2,000.00',
          cgst: '₹50.00',
          sgst: '₹50.00',
          gross: '₹2,100.00'
        };
      } else {
        replyText = `I understand you are asking about: "${query}". I am connected to Gemini 3.5 Flash and ready to execute live store operations for ${storeName}.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: replyText,
          widget: widget,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setIsProcessing(false);
    }, 600);
  };

  const handleQuickPrompt = (promptText) => {
    setInput(promptText);
    handleSend(promptText);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-300 border-l border-gray-200">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-300 text-sm shadow-inner">
              <i className="fa-solid fa-wand-magic-sparkles"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm tracking-wide leading-tight">ADAB Copilot</h3>
                <span className="text-[10px] bg-amber-400 text-gray-950 font-black px-1.5 py-0.2 rounded-md uppercase tracking-wider">
                  Gemini 3.5
                </span>
              </div>
              <p className="text-[11px] text-indigo-100 font-medium">
                {storeName} • Free Mode
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Close Assistant"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Suggestion Quick Pills */}
        <div className="p-2.5 bg-indigo-50/60 border-b border-indigo-100/60 flex items-center gap-1.5 overflow-x-auto hide-scroll shrink-0">
          <button 
            onClick={() => handleQuickPrompt('Pack all pending orders')}
            className="px-2.5 py-1 bg-white hover:bg-indigo-100/60 text-indigo-900 border border-indigo-200 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer shadow-xs flex items-center gap-1"
          >
            <i className="fa-solid fa-boxes-packing text-indigo-600"></i> Pack Orders
          </button>
          <button 
            onClick={() => handleQuickPrompt("Show today's sales summary")}
            className="px-2.5 py-1 bg-white hover:bg-emerald-100/60 text-emerald-900 border border-emerald-200 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer shadow-xs flex items-center gap-1"
          >
            <i className="fa-solid fa-chart-line text-emerald-600"></i> Sales Report
          </button>
          <button 
            onClick={() => handleQuickPrompt('Check low stock items')}
            className="px-2.5 py-1 bg-white hover:bg-amber-100/60 text-amber-900 border border-amber-200 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer shadow-xs flex items-center gap-1"
          >
            <i className="fa-solid fa-triangle-exclamation text-amber-600"></i> Low Stock
          </button>
          <button 
            onClick={() => handleQuickPrompt('Show GSTR tax breakdown')}
            className="px-2.5 py-1 bg-white hover:bg-purple-100/60 text-purple-900 border border-purple-200 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer shadow-xs flex items-center gap-1"
          >
            <i className="fa-solid fa-file-invoice text-purple-600"></i> GSTR Tax
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gray-50/40">
          {messages.map((m) => (
            <div 
              key={m.id} 
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div 
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                  m.sender === 'user'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-xs'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-xs'
                }`}
              >
                <p className="font-medium whitespace-pre-wrap">{m.text}</p>

                {/* Generative UI Widgets */}
                {m.widget?.type === 'ORDER_PACK_CARD' && (
                  <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-1.5">
                    {m.widget.orders.map((o) => (
                      <div key={o.id} className="p-2 bg-gray-50 rounded-xl flex items-center justify-between gap-2 border border-gray-100">
                        <div>
                          <div className="font-bold text-gray-900">{o.id} • {o.customer}</div>
                          <div className="text-[10px] text-gray-500">₹{o.amount} • {o.items} items</div>
                        </div>
                        <button 
                          onClick={() => alert(`Marking order ${o.id} as PACKED`)}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] transition cursor-pointer"
                        >
                          Pack Order
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => alert('Batch packing all orders!')}
                      className="w-full mt-1.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-[11px] transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <i className="fa-solid fa-check-double"></i> Pack All (₹400)
                    </button>
                  </div>
                )}

                {m.widget?.type === 'SALES_SUMMARY_CARD' && (
                  <div className="mt-2.5 pt-2 border-t border-gray-100 grid grid-cols-3 gap-1.5 text-center">
                    <div className="p-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                      <div className="text-[9px] text-emerald-700 font-bold uppercase">Revenue</div>
                      <div className="font-black text-emerald-900 text-xs">{m.widget.revenue}</div>
                    </div>
                    <div className="p-1.5 bg-indigo-50 rounded-lg border border-indigo-100">
                      <div className="text-[9px] text-indigo-700 font-bold uppercase">Orders</div>
                      <div className="font-black text-indigo-900 text-xs">{m.widget.orders}</div>
                    </div>
                    <div className="p-1.5 bg-purple-50 rounded-lg border border-purple-100">
                      <div className="text-[9px] text-purple-700 font-bold uppercase">Avg Ticket</div>
                      <div className="font-black text-purple-900 text-xs">{m.widget.aov}</div>
                    </div>
                  </div>
                )}

                {m.widget?.type === 'LOW_STOCK_CARD' && (
                  <div className="mt-2.5 pt-2 border-t border-gray-100 p-2 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="font-bold text-amber-950 text-[11px]">{m.widget.item}</div>
                    <div className="text-[10px] text-amber-800 mt-0.5">
                      Only <span className="font-black text-red-600">{m.widget.remaining} units</span> left in store!
                    </div>
                    <button 
                      onClick={() => alert('Searching B2B wholesalers for lowest restock price...')}
                      className="w-full mt-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px] transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <i className="fa-solid fa-cart-shopping"></i> One-Click B2B Restock (20 units)
                    </button>
                  </div>
                )}

                {m.widget?.type === 'GSTR_TAX_CARD' && (
                  <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-1 text-[11px]">
                    <div className="flex justify-between text-gray-600">
                      <span>Taxable Turnover:</span>
                      <span className="font-bold text-gray-900">{m.widget.taxable}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>CGST (2.5%):</span>
                      <span className="font-mono text-gray-900">{m.widget.cgst}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>SGST (2.5%):</span>
                      <span className="font-mono text-gray-900">{m.widget.sgst}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-gray-100 font-black text-emerald-800">
                      <span>Total Invoice:</span>
                      <span>{m.widget.gross}</span>
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 px-1">
                {m.timestamp}
              </span>
            </div>
          ))}

          {isProcessing && (
            <div className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-2xl w-24">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-bounce delay-100"></span>
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce delay-200"></span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-gray-200 shrink-0">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            {/* Mic Button */}
            <button
              type="button"
              onClick={toggleSpeech}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition cursor-pointer text-sm ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-200' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title={isListening ? 'Listening (Click to stop)' : 'Speak in Hindi / Gujarati / English'}
            >
              <i className={`fa-solid ${isListening ? 'fa-microphone-lines' : 'fa-microphone'}`}></i>
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything, e.g. 'Pack order 108'..."
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-gray-50/50"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center transition cursor-pointer text-xs"
            >
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1.5 px-1 font-medium">
            <span>Powered by Gemini 3.5 & MCP</span>
            <span>Esc to close</span>
          </div>
        </div>

      </div>
    </div>
  );
}
