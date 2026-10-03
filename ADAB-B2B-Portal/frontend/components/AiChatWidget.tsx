import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Mic, MicOff, Check, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { aiService, Message } from '../services/aiService';

const AiChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your B2B AI Assistant. How can I help you manage your suppliers and orders today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Pending Action state for Guardrails
  const [pendingAction, setPendingAction] = useState<{
    id: string;
    type: string;
    description: string;
    args: any;
    originalToolCall: any;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Speech Recognition setup
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  if (recognition) {
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  }

  const toggleListen = () => {
    if (!recognition) return alert('Speech recognition not supported in this browser.');
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingAction]);

  const executeToolCall = (toolCall: any) => {
    const { name, arguments: argsString } = toolCall.function;
    const args = JSON.parse(argsString || '{}');

    switch (name) {
      case 'navigate':
        let path = '/manufacturer/dashboard';
        if (args.target === 'orders') path = '/manufacturer/orders';
        else if (args.target === 'profile') path = '/profile';
        else if (args.target === 'signup') path = '/signup';
        else if (args.target === 'login') path = '/login';

        navigate(path);
        return { success: true, message: `Navigated to ${args.target}.` };

      case 'start_registration':
        navigate('/signup', { state: { email: args.email, company_name: args.company_name, role: args.role } });
        return { success: true, message: `Started registration.` };

      case 'propose_update_profile':
        setPendingAction({
          id: toolCall.id,
          type: 'update_profile',
          description: `Update profile with: ${JSON.stringify(args)}`,
          args,
          originalToolCall: toolCall
        });
        return { pending: true };

      case 'propose_place_order':
        setPendingAction({
          id: toolCall.id,
          type: 'place_order',
          description: `Place order for Product ${args.product_id} (Qty: ${args.quantity})`,
          args,
          originalToolCall: toolCall
        });
        return { pending: true };

      default:
        return { success: false, message: 'Unknown action.' };
    }
  };

  const processResponse = async (history: Message[]) => {
    setIsTyping(true);
    try {
      const responseMsg = await aiService.chat(history);
      const newHistory = [...history, responseMsg];

      setMessages(newHistory);

      if (responseMsg.tool_calls && responseMsg.tool_calls.length > 0) {
        const toolCall = responseMsg.tool_calls[0];
        const result = executeToolCall(toolCall);

        if (!result.pending) {
          // Immediately reply with tool result
          const toolResultMsg: Message = {
            role: 'tool',
            content: JSON.stringify(result),
            tool_call_id: toolCall.id,
            name: toolCall.function.name
          };
          setMessages([...newHistory, toolResultMsg]);
          // Let AI respond to the tool output
          processResponse([...newHistory, toolResultMsg]);
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Check your API key or connection.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || pendingAction) return;

    const userMsg: Message = { role: 'user', content: input };
    const newHistory = [...messages, userMsg];

    setMessages(newHistory);
    setInput('');

    await processResponse(newHistory);
  };

  const confirmAction = async () => {
    if (!pendingAction) return;

    // In a real app, hit the backend API here. We'll simulate success.
    const resultMsg: Message = {
      role: 'tool',
      content: JSON.stringify({ success: true, message: 'Action confirmed and executed successfully by the user.' }),
      tool_call_id: pendingAction.id,
      name: pendingAction.originalToolCall.function.name
    };

    const newHistory = [...messages, resultMsg];
    setMessages(newHistory);
    setPendingAction(null);

    // Let AI acknowledge success
    await processResponse(newHistory);
  };

  const cancelAction = async () => {
    if (!pendingAction) return;

    const resultMsg: Message = {
      role: 'tool',
      content: JSON.stringify({ success: false, message: 'User explicitly cancelled the action.' }),
      tool_call_id: pendingAction.id,
      name: pendingAction.originalToolCall.function.name
    };

    const newHistory = [...messages, resultMsg];
    setMessages(newHistory);
    setPendingAction(null);

    // Let AI acknowledge cancellation
    await processResponse(newHistory);
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-adab-green text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 z-50 group"
          aria-label="Open AI Chat"
        >
          <MessageSquare size={24} />
          <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-white scale-0 group-hover:scale-100 transition-transform"></span>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[350px] h-[550px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-8 duration-300">

          {/* Header */}
          <div className="bg-adab-green p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Bot size={20} />
              <div>
                <h3 className="font-bold text-sm">AI Agent Protocol</h3>
                <p className="text-[10px] text-green-100 opacity-90 uppercase tracking-widest">Active Guardrails</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-4 custom-scrollbar">
            {messages.filter(m => m.role !== 'tool' && !(m.role === 'assistant' && !m.content)).map((msg, idx) => (
              <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-green-100 text-adab-green flex items-center justify-center shrink-0 border border-green-200">
                    <Bot size={16} />
                  </div>
                )}

                <div className={`p-3 rounded-2xl max-w-[75%] text-sm ${
                  msg.role === 'user'
                    ? 'bg-adab-green text-white rounded-tr-sm shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-100 rounded-tl-sm shadow-sm whitespace-pre-wrap'
                }`}>
                  {msg.content}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center shrink-0 border border-gray-300">
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-2 justify-start">
                <div className="w-8 h-8 rounded-full bg-green-100 text-adab-green flex items-center justify-center shrink-0 border border-green-200">
                  <Bot size={16} />
                </div>
                <div className="p-3 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            )}

            {/* Guardrail Confirmation Card */}
            {pendingAction && (
              <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm animate-in fade-in duration-300">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="font-bold text-amber-800 text-sm">Action Requires Confirmation</h4>
                    <p className="text-xs text-amber-700 mt-1">{pendingAction.description}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={confirmAction} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1">
                    <Check size={14} /> Confirm
                  </button>
                  <button onClick={cancelAction} className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1">
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-gray-100">
            <div className={`flex items-center gap-2 bg-gray-50 rounded-xl border p-1 pl-3 transition-all ${
              pendingAction ? 'opacity-50 pointer-events-none' : 'focus-within:border-adab-green/50 focus-within:ring-2 focus-within:ring-adab-green/10 border-gray-200'
            }`}>
              <button
                onClick={toggleListen}
                className={`p-1.5 rounded-full transition-colors ${
                  isListening ? 'bg-red-100 text-red-500 animate-pulse' : 'text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                }`}
                title="Use Voice (Web Speech API)"
              >
                {isListening ? <Mic size={18} /> : <MicOff size={18} />}
              </button>

              <input
                type="text"
                placeholder={isListening ? "Listening..." : "Ask me anything..."}
                className="flex-1 bg-transparent border-none focus:outline-none text-sm text-gray-700"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                disabled={!!pendingAction}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || !!pendingAction || isTyping}
                className="p-2 bg-adab-green text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>

        </div>
      )}
    </>
  );
};

export default AiChatWidget;
