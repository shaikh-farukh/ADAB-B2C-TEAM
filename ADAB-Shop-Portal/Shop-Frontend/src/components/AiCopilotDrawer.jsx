import React, { useState, useEffect, useRef } from 'react';
import { useSeller } from '../context/SellerContext';
import { useTranslation } from '../context/LanguageContext';
import api from '../services/api';

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

  const handleSend = async (textToSend = input) => {
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

    try {
      // Build sliding-window history for the API
      const historyPayload = messages.slice(-6).map((m) => ({
        sender: m.sender,
        text: m.text
      }));

      const res = await api.post('/assistant/chat', {
        prompt: query,
        history: historyPayload
      });

      const payload = res.data !== undefined ? res.data : res;
      const replyText = payload.reply || "Done! I've updated your store records.";
      let widget = null;

      // Check toolExecutions for interactive cards
      if (Array.isArray(payload.toolExecutions)) {
        for (const exec of payload.toolExecutions) {
          if (exec.tool === 'adab_list_orders' && exec.result?.data?.orders?.length > 0) {
            widget = {
              type: 'ORDER_PACK_CARD',
              orders: exec.result.data.orders.slice(0, 3).map((o) => {
                const displayId = o.orderNumber || o.orderId || o.id || 'Order';
                const actionId = o.orderNumber || o.orderId || o.id;
                return {
                  id: displayId,
                  actionId: actionId,
                  customer: o.customer || 'Customer',
                  amount: o.amount || 0,
                  items: o.itemSummary || o.items || 'Items'
                };
              })
            };
          } else if (exec.tool === 'adab_get_sales_performance' && exec.result?.data?.summary) {
            const s = exec.result.data.summary;
            widget = {
              type: 'SALES_SUMMARY_CARD',
              revenue: s.grossRevenue,
              orders: s.totalOrders,
              aov: s.averageOrderValue,
              payout: s.netPayout,
              period: exec.result.data.period
            };
          } else if (exec.tool === 'adab_check_low_stock' && exec.result?.data?.items?.length > 0) {
            widget = {
              type: 'LOW_STOCK_CARD',
              items: exec.result.data.items.slice(0, 3).map((i) => ({
                id: i.id,
                title: i.title,
                remaining: i.stockQty,
                unit: i.unit,
                sellPrice: i.sellPrice
              }))
            };
          } else if (exec.tool === 'adab_get_multi_slab_gstr' && exec.result?.data?.taxSummary) {
            const t = exec.result.data.taxSummary;
            widget = {
              type: 'GSTR_TAX_CARD',
              taxable: t.taxableTurnover,
              cgst: t.totalCgst,
              sgst: t.totalSgst,
              gross: t.grossInvoicedAmount,
              slabs: exec.result.data.slabs || []
            };
          } else if (exec.tool === 'adab_query_b2b_wholesalers' && exec.result?.data?.offers?.length > 0) {
            widget = {
              type: 'B2B_RESTOCK_CARD',
              offers: exec.result.data.offers.slice(0, 3)
            };
          }
        }
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
    } catch (err) {
      console.warn('Copilot live API error, falling back:', err);
      // Fallback preview if unauthenticated or offline
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: err.response?.data?.error || `Could not connect to Gemini Assistant: ${err.message}. Please verify your network.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
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
                          onClick={() => handleSend(`Pack order ${o.actionId || o.id}`)}
                          disabled={!o.actionId && !o.id}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] transition cursor-pointer"
                        >
                          Pack Order
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => handleSend(`Pack all pending orders`)}
                      className="w-full mt-1.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-[11px] transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <i className="fa-solid fa-check-double"></i> Pack All
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
                  <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-2">
                    {(m.widget.items || [{ title: m.widget.item, remaining: m.widget.remaining }]).map((it, idx) => (
                      <div key={it.id || idx} className="p-2 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-amber-950 text-[11px]">{it.title}</div>
                          <div className="text-[10px] text-amber-800">
                            Only <span className="font-black text-red-600">{it.remaining} {it.unit || 'units'}</span> left
                          </div>
                        </div>
                        <button 
                          onClick={() => handleSend(`Find B2B suppliers for ${it.title}`)}
                          className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px] transition cursor-pointer whitespace-nowrap"
                        >
                          Find Suppliers
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {m.widget?.type === 'B2B_RESTOCK_CARD' && (
                  <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-1.5">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nearby Wholesale Stock</div>
                    {(m.widget.offers || []).map((off) => (
                      <div key={off.listingId} className="p-2 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-purple-950 text-[11px]">{off.productName}</div>
                          <div className="text-[10px] text-purple-800">
                            ₹{off.wholesalePrice}/{off.unit || 'pc'} • {off.supplierName} ({off.distanceKm}km)
                          </div>
                          <div className="text-[9px] text-emerald-700 font-semibold mt-0.5">
                            ✓ {off.creditDays}-Day B2B Credit Available
                          </div>
                        </div>
                        <button 
                          onClick={() => handleSend(`Create restock order for 20 units of ${off.productName} from supplier ${off.supplierStoreId}`)}
                          className="px-2 py-1 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg text-[10px] transition cursor-pointer whitespace-nowrap"
                        >
                          Draft PO
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {m.widget?.type === 'GSTR_TAX_CARD' && (
                  <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-1 text-[11px]">
                    <div className="flex justify-between text-gray-600">
                      <span>Taxable Turnover:</span>
                      <span className="font-bold text-gray-900">{m.widget.taxable}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>CGST:</span>
                      <span className="font-mono text-gray-900">{m.widget.cgst}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>SGST:</span>
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
