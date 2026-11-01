import React, { useState, useEffect, useRef } from 'react';
import { useSeller } from '../context/SellerContext';
import { useTranslation } from '../context/LanguageContext';
import api from '../services/api';
import { playNotificationChime, unlockAudioContext } from '../utils/audioAlert';

/**
 * Renders message text with markdown bold (**text**), inline code (`code`),
 * headers (### / ##), dividers (---), and bulleted lists (* item / - item).
 */
export function MarkdownMessage({ content, isUser = false }) {
  if (!content) return null;

  const lines = String(content).split('\n');

  const renderInline = (text) => {
    if (!text) return null;
    const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    const parts = text.split(regex);

    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong
            key={i}
            className={`font-black tracking-tight ${isUser ? 'text-white' : 'text-gray-950 font-bold'}`}
          >
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <code
            key={i}
            className={`px-1 py-0.2 rounded font-mono text-[10.5px] ${
              isUser
                ? 'bg-white/20 text-white font-medium'
                : 'bg-gray-100 text-indigo-700 border border-gray-200 font-semibold'
            }`}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-0.5 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty line
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Horizontal divider (--- or ***)
        if (trimmed === '---' || trimmed === '***') {
          return (
            <hr
              key={idx}
              className={`my-1.5 border-t ${isUser ? 'border-white/20' : 'border-gray-200'}`}
            />
          );
        }

        // Headings (###, ##, #)
        if (trimmed.startsWith('#')) {
          const headingText = trimmed.replace(/^#+\s*/, '');
          return (
            <div
              key={idx}
              className={`font-extrabold text-[12px] mt-1.5 mb-0.5 ${
                isUser ? 'text-white' : 'text-gray-950'
              }`}
            >
              {renderInline(headingText)}
            </div>
          );
        }

        // Bullet lists (* or -)
        if (/^[*•-]\s+/.test(trimmed)) {
          const bulletText = trimmed.replace(/^[*•-]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-0.5 my-0.5">
              <span
                className={`text-[8px] select-none mt-1 shrink-0 ${
                  isUser ? 'text-white/80' : 'text-indigo-600 font-bold'
                }`}
              >
                ●
              </span>
              <div className="flex-1">{renderInline(bulletText)}</div>
            </div>
          );
        }

        // Numbered list (1. 2. etc)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          const [, num, numText] = numMatch;
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-0.5 my-0.5">
              <span
                className={`text-[10.5px] font-bold select-none mt-0.2 shrink-0 ${
                  isUser ? 'text-white/80' : 'text-indigo-700'
                }`}
              >
                {num}.
              </span>
              <div className="flex-1">{renderInline(numText)}</div>
            </div>
          );
        }

        // Normal line
        return (
          <p key={idx} className="my-0.5">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}

export default function AiCopilotDrawer({ isOpen, onClose }) {
  const { profile, store } = useSeller();
  const { t, language } = useTranslation();
  const storeName = store?.store_name || 'My Store';
  const merchantName = profile?.full_name?.split(' ')[0] || 'Merchant';

  const pillLabels = {
    en: {
      pack: 'Pack Orders',
      sales: 'Sales Report',
      stock: 'Low Stock',
      gstr: 'GSTR Tax',
      store: 'Store Status',
      packPrompt: 'Pack all pending orders',
      salesPrompt: "Show today's sales summary",
      stockPrompt: 'Check low stock items',
      gstrPrompt: 'Show GSTR tax breakdown',
      storePrompt: 'Is my store open right now?'
    },
    hi: {
      pack: 'ऑर्डर पैक करें',
      sales: 'बिक्री रिपोर्ट',
      stock: 'कम स्टॉक',
      gstr: 'GSTR टैक्स',
      store: 'दुकान स्थिति',
      packPrompt: 'सभी लंबित ऑर्डर पैक करें',
      salesPrompt: 'आज की बिक्री का हिसाब दिखाएं',
      stockPrompt: 'कम स्टॉक वाले सामान चेक करें',
      gstrPrompt: 'GSTR टैक्स का हिसाब दिखाएं',
      storePrompt: 'क्या मेरी दुकान अभी खुली है?'
    },
    gu: {
      pack: 'ઓર્ડર પેક કરો',
      sales: 'વેચાણ રિપોર્ટ',
      stock: 'ઓછો સ્ટોક',
      gstr: 'GSTR ટેક્સ',
      store: 'દુકાન સ્થિતિ',
      packPrompt: 'બધા પેન્ડિંગ ઓર્ડર પેક કરો',
      salesPrompt: 'આજના વેચાણનો રિપોર્ટ બતાવો',
      stockPrompt: 'ઓછા સ્ટોકવાળા સામાન તપાસો',
      gstrPrompt: 'GSTR ટેક્સનો હિસાબ બતાવો',
      storePrompt: 'શું મારી દુકાન અત્યારે ખુલ્લી છે?'
    }
  };
  const activePills = pillLabels[language] || pillLabels.en;

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: language === 'hi'
        ? `नमस्ते ${merchantName}! 🙏 मैं आपका ADAB स्टोर कोपायलट हूँ (Gemini 3.5)। आप मुझसे ऑर्डर पैक करने, स्टॉक चेक करने, बिक्री का हिसाब या थोक सप्लायर खोजने के लिए कह सकते हैं।`
        : language === 'gu'
        ? `નમસ્તે ${merchantName}! 🙏 હું તમારો ADAB સ્ટોર કોપાયલટ છું (Gemini 3.5). તમે મને ઓર્ડર પેક કરવા, સ્ટોક તપાસવા, વેચાણ જોવા અથવા B2B સપ્લાયર શોધવા કહી શકો છો.`
        : `Namaste ${merchantName}! 🙏 I am your ADAB Store Copilot powered by Gemini 3.5. You can ask me to pack orders, check inventory, analyze sales, or find B2B suppliers.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-3.5-flash');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (isOpen && typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
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
    unlockAudioContext();
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
        history: historyPayload,
        model: selectedModel
      }, {
        timeout: 60000
      });

      const payload = res.data !== undefined ? res.data : res;
      const replyText = payload.reply || "Done! I've updated your store records.";
      let widget = null;

      // Check toolExecutions for interactive cards & sound feedback
      if (Array.isArray(payload.toolExecutions)) {
        for (const exec of payload.toolExecutions) {
          // Play audio chime for any successful mutative action
          if (exec.result?.success && ['adab_update_order_state', 'adab_update_stock_qty', 'adab_modify_pricing', 'adab_draft_b2b_restock_po', 'adab_update_store_status'].includes(exec.tool)) {
            playNotificationChime(true);
          }

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
                  items: o.itemSummary || o.items || 'Items',
                  status: o.status || 'NEW'
                };
              })
            };
          } else if (exec.tool === 'adab_update_order_state' && exec.result?.success) {
            widget = {
              type: 'ORDER_STATUS_UPDATED_CARD',
              orderNumber: exec.result.data.orderNumber,
              newStatus: exec.result.data.newStatus,
              message: exec.result.data.message
            };
          } else if (exec.tool === 'adab_get_sales_performance' && exec.result?.data?.summary) {
            const s = exec.result.data.summary;
            widget = {
              type: 'SALES_SUMMARY_CARD',
              revenue: s.grossRevenue,
              orders: s.totalOrders,
              aov: s.averageOrderValue,
              payout: s.netPayout,
              commission: s.commissionFee,
              period: exec.result.data.period
            };
          } else if (exec.tool === 'adab_check_low_stock') {
            const items = exec.result?.data?.items || [];
            widget = {
              type: 'LOW_STOCK_CARD',
              count: items.length,
              items: items.slice(0, 4).map((i) => ({
                id: i.id,
                title: i.title,
                remaining: i.stockQty,
                unit: i.unit,
                sellPrice: i.sellPrice,
                category: i.category
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
              totalTax: t.totalTaxLiability,
              slabs: exec.result.data.slabs || []
            };
          } else if (exec.tool === 'adab_query_b2b_wholesalers' && exec.result?.data?.offers?.length > 0) {
            widget = {
              type: 'B2B_RESTOCK_CARD',
              offers: exec.result.data.offers.slice(0, 3)
            };
          } else if (exec.tool === 'adab_draft_b2b_restock_po' && exec.result?.success) {
            widget = {
              type: 'PURCHASE_ORDER_DRAFTED_CARD',
              poNumber: exec.result.data.poNumber,
              totalAmount: exec.result.data.totalAmount,
              paymentTerms: exec.result.data.paymentTerms,
              message: exec.result.data.message
            };
          } else if ((exec.tool === 'adab_get_store_info' || exec.tool === 'adab_update_store_status') && exec.result?.data) {
            const d = exec.result.data;
            const effectiveOpen = d.isOpen !== undefined ? Boolean(d.isOpen) : Boolean(d.isOnline);
            widget = {
              type: 'STORE_STATUS_CARD',
              storeName: d.storeName,
              isOpen: effectiveOpen,
              isOnline: Boolean(d.isOnline),
              reason: d.reason,
              soundboxEnabled: Boolean(d.soundboxEnabled),
              businessHours: d.businessHours,
              deliveryRadiusKm: d.deliveryRadiusKm
            };
          } else if ((exec.tool === 'adab_update_stock_qty' || exec.tool === 'adab_modify_pricing') && exec.result?.data) {
            const d = exec.result.data;
            widget = {
              type: 'INVENTORY_MUTATION_CARD',
              title: d.title,
              message: d.message,
              previousValue: d.previousStock !== undefined ? `${d.previousStock} units` : `₹${d.previousSellPrice}`,
              newValue: d.newStock !== undefined ? `${d.newStock} units` : `₹${d.newSellPrice}`
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
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="text-[10px] bg-amber-400 text-gray-950 font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider cursor-pointer border-none outline-none focus:ring-1 focus:ring-amber-300"
                  aria-label="Model Selector"
                >
                  <option value="gemini-3.5-flash">Gemini 3.5</option>
                  <option value="gemini-2.5-flash">Gemini 2.5</option>
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Lite</option>
                </select>
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
            onClick={() => handleQuickPrompt(activePills.packPrompt)}
            className="px-2.5 py-1 bg-white hover:bg-indigo-100/60 text-indigo-900 border border-indigo-200 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer shadow-xs flex items-center gap-1"
          >
            <i className="fa-solid fa-boxes-packing text-indigo-600"></i> {activePills.pack}
          </button>
          <button 
            onClick={() => handleQuickPrompt(activePills.salesPrompt)}
            className="px-2.5 py-1 bg-white hover:bg-emerald-100/60 text-emerald-900 border border-emerald-200 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer shadow-xs flex items-center gap-1"
          >
            <i className="fa-solid fa-chart-line text-emerald-600"></i> {activePills.sales}
          </button>
          <button 
            onClick={() => handleQuickPrompt(activePills.stockPrompt)}
            className="px-2.5 py-1 bg-white hover:bg-amber-100/60 text-amber-900 border border-amber-200 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer shadow-xs flex items-center gap-1"
          >
            <i className="fa-solid fa-triangle-exclamation text-amber-600"></i> {activePills.stock}
          </button>
          <button 
            onClick={() => handleQuickPrompt(activePills.gstrPrompt)}
            className="px-2.5 py-1 bg-white hover:bg-purple-100/60 text-purple-900 border border-purple-200 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer shadow-xs flex items-center gap-1"
          >
            <i className="fa-solid fa-file-invoice text-purple-600"></i> {activePills.gstr}
          </button>
          <button 
            onClick={() => handleQuickPrompt(activePills.storePrompt)}
            className="px-2.5 py-1 bg-white hover:bg-blue-100/60 text-blue-900 border border-blue-200 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer shadow-xs flex items-center gap-1"
          >
            <i className="fa-solid fa-store text-blue-600"></i> {activePills.store}
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
                <MarkdownMessage content={m.text} isUser={m.sender === 'user'} />

                {/* Generative UI Widgets */}
                {m.widget?.type === 'ORDER_PACK_CARD' && (
                  <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-1.5">
                    {m.widget.orders.map((o) => (
                      <div key={o.id} className="p-2 bg-gray-50 rounded-xl flex items-center justify-between gap-2 border border-gray-100">
                        <div>
                          <div className="font-bold text-gray-900">{o.id} • {o.customer}</div>
                          <div className="text-[10px] text-gray-500">₹{o.amount} • {o.items}</div>
                        </div>
                        <button 
                          onClick={() => handleSend(`Pack order ${o.actionId || o.id}`)}
                          disabled={!o.actionId && !o.id}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] transition cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                          <i className="fa-solid fa-box"></i> Pack Order
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => handleSend(`Pack all pending orders`)}
                      className="w-full mt-1.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-[11px] transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <i className="fa-solid fa-boxes-packing"></i> Pack All Pending Orders
                    </button>
                  </div>
                )}

                {m.widget?.type === 'ORDER_STATUS_UPDATED_CARD' && (
                  <div className="mt-2.5 pt-2 border-t border-gray-100 p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs shrink-0">
                      <i className="fa-solid fa-check"></i>
                    </div>
                    <div>
                      <div className="text-[11px] text-emerald-950 font-bold">
                        Order #{m.widget.orderNumber} Updated!
                      </div>
                      <div className="text-[10px] text-emerald-700">
                        Status transitioned to <span className="font-extrabold uppercase">{m.widget.newStatus}</span>
                      </div>
                    </div>
                  </div>
                )}

                {m.widget?.type === 'SALES_SUMMARY_CARD' && (
                  <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-1.5">
                    <div className="grid grid-cols-3 gap-1.5 text-center">
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
                    {m.widget.payout && (
                      <div className="flex justify-between items-center text-[10px] px-2 py-1 bg-gray-50 rounded-lg text-gray-600 border border-gray-100">
                        <span>Net Seller Payout:</span>
                        <span className="font-bold text-gray-900">{m.widget.payout}</span>
                      </div>
                    )}
                  </div>
                )}

                {m.widget?.type === 'LOW_STOCK_CARD' && (
                  <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-1.5">
                    {(!m.widget.items || m.widget.items.length === 0) ? (
                      <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2">
                        <i className="fa-solid fa-circle-check text-emerald-600 text-base"></i>
                        <div className="text-[11px] text-emerald-900 font-semibold">
                          All store items are well-stocked (&gt; 5 units). No immediate restock needed!
                        </div>
                      </div>
                    ) : (
                      m.widget.items.map((it, idx) => (
                        <div key={it.id || idx} className="p-2 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-amber-950 text-[11px]">{it.title}</div>
                            <div className="text-[10px] text-amber-800">
                              Only <span className="font-black text-red-600">{it.remaining} {it.unit || 'units'}</span> left
                            </div>
                          </div>
                          <button 
                            onClick={() => handleSend(`Find B2B suppliers for ${it.title}`)}
                            className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px] transition cursor-pointer whitespace-nowrap shadow-xs flex items-center gap-1"
                          >
                            <i className="fa-solid fa-truck-ramp-box"></i> Suppliers
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {m.widget?.type === 'B2B_RESTOCK_CARD' && (
                  <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-1.5">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <i className="fa-solid fa-warehouse text-purple-600"></i> Nearby Wholesale Stock
                    </div>
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
                          className="px-2 py-1 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg text-[10px] transition cursor-pointer whitespace-nowrap shadow-xs"
                        >
                          Draft PO
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {m.widget?.type === 'PURCHASE_ORDER_DRAFTED_CARD' && (
                  <div className="mt-2.5 pt-2 border-t border-gray-100 p-2.5 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs shrink-0">
                        <i className="fa-solid fa-file-invoice"></i>
                      </div>
                      <div>
                        <div className="font-extrabold text-purple-950 text-xs">PO #{m.widget.poNumber} Drafted</div>
                        <div className="text-[10px] text-purple-700">{m.widget.totalAmount} • {m.widget.paymentTerms}</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-600 mt-1 bg-white/70 p-1.5 rounded-lg border border-purple-100">
                      {m.widget.message}
                    </div>
                  </div>
                )}

                {m.widget?.type === 'GSTR_TAX_CARD' && (
                  <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-1.5 text-[11px]">
                    <div className="grid grid-cols-2 gap-1.5 p-2 bg-emerald-50/60 rounded-xl border border-emerald-100">
                      <div>
                        <span className="text-[9px] text-emerald-700 font-bold uppercase">Taxable Turnover</span>
                        <div className="font-black text-emerald-950 text-xs">{m.widget.taxable}</div>
                      </div>
                      <div>
                        <span className="text-[9px] text-emerald-700 font-bold uppercase">Total Tax Liability</span>
                        <div className="font-black text-emerald-950 text-xs">{m.widget.totalTax || m.widget.gross}</div>
                      </div>
                    </div>

                    {Array.isArray(m.widget.slabs) && m.widget.slabs.length > 0 && (
                      <div className="mt-1 space-y-1">
                        <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">GST Slab Breakdown</div>
                        {m.widget.slabs.map((sl, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[10px] px-2 py-1 bg-gray-50 rounded-md border border-gray-100">
                            <span className="text-gray-700 font-medium">{sl.rate}</span>
                            <span className="font-mono text-gray-900 font-bold">{sl.totalTax}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between pt-1 border-t border-gray-100 font-black text-emerald-800">
                      <span>Total Invoiced Gross:</span>
                      <span>{m.widget.gross}</span>
                    </div>
                  </div>
                )}

                {m.widget?.type === 'STORE_STATUS_CARD' && (
                  <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-2">
                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-extrabold text-gray-900 text-xs">{m.widget.storeName}</div>
                          <div className="text-[10px] text-gray-500">{m.widget.businessHours} • {m.widget.deliveryRadiusKm} km radius</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          m.widget.isOpen ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {m.widget.isOpen ? '● Open' : '○ Closed'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                        <button 
                          onClick={() => handleSend(m.widget.isOpen ? 'Close my shop for today' : 'Open my shop for incoming orders')}
                          className={`py-1 px-2 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                            m.widget.isOpen ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          <i className={`fa-solid ${m.widget.isOpen ? 'fa-door-closed' : 'fa-door-open'}`}></i>
                          {m.widget.isOpen ? 'Close Store' : 'Open Store'}
                        </button>
                        <button 
                          onClick={() => handleSend(m.widget.soundboxEnabled ? 'Mute soundbox voice announcements' : 'Enable voice soundbox for incoming orders')}
                          className={`py-1 px-2 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                            m.widget.soundboxEnabled ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <i className={`fa-solid ${m.widget.soundboxEnabled ? 'fa-volume-high' : 'fa-volume-xmark'}`}></i>
                          {m.widget.soundboxEnabled ? 'Soundbox ON' : 'Muted'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {m.widget?.type === 'INVENTORY_MUTATION_CARD' && (
                  <div className="mt-2.5 pt-2 border-t border-gray-100 p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-indigo-950 text-[11px]">{m.widget.title}</div>
                      <div className="text-[10px] text-indigo-700">
                        {m.widget.message}
                      </div>
                    </div>
                    <i className="fa-solid fa-circle-check text-indigo-600 text-base shrink-0"></i>
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
