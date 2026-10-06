import React, { useState, useEffect } from 'react';
import {
  X,
  Loader2,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  MessageSquare,
  Send,
  Building2,
  Package,
  History
} from 'lucide-react';
import { useSocket } from '../context/useSocket';
import distributorService from '../services/distributorService';
import requestService from '../services/requestService';

export interface NegotiationStep {
  sender_type: 'distributor' | 'manufacturer';
  sender_id?: number;
  sender_name?: string;
  action: 'CREATE_RFQ' | 'COUNTER_OFFER' | 'ACCEPTED' | 'REJECTED';
  price?: number;
  target_price?: number;
  counter_price?: number;
  agreed_price?: number;
  notes?: string;
  deadline?: string;
  timestamp: string;
}

export interface RFQItem {
  id: number;
  unique_request_id?: string;
  name?: string;
  product_name?: string;
  quantity?: number;
  target_price?: number;
  counter_price?: number | null;
  deadline?: string | null;
  status?: string;
  negotiation_history?: NegotiationStep[] | string;
  distributor_name?: string;
  company_name?: string;
  manufacturer_name?: string;
  description?: string;
  request_type?: string;
}

interface RFQNegotiationModalProps {
  isOpen: boolean;
  onClose: () => void;
  rfq: RFQItem | null;
  userRole: 'distributor' | 'manufacturer';
  onSuccess?: () => void;
}

export const RFQNegotiationModal: React.FC<RFQNegotiationModalProps> = ({
  isOpen,
  onClose,
  rfq,
  userRole,
  onSuccess
}) => {
  const [currentRfq, setCurrentRfq] = useState<RFQItem | null>(rfq);
  const [counterPriceInput, setCounterPriceInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [deadlineInput, setDeadlineInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync state when rfq prop updates
  useEffect(() => {
    setCurrentRfq(rfq);
    setErrorMsg(null);
    setSuccessMsg(null);
    if (rfq?.deadline) {
      try {
        const d = new Date(rfq.deadline);
        setDeadlineInput(d.toISOString().split('T')[0]);
      } catch (e) {
        setDeadlineInput('');
      }
    } else {
      setDeadlineInput('');
    }
  }, [rfq]);

  // Real-time updates via Socket.io (Day 1 infrastructure reuse)
  useSocket({
    event: 'RFQ_COUNTER_OFFER',
    handler: (data: any) => {
      if (data?.requestId === currentRfq?.id || data?.rfq?.id === currentRfq?.id) {
        const updated = data.rfq || {
          ...currentRfq,
          counter_price: data.counter_price,
          target_price: data.target_price,
          deadline: data.deadline,
          status: data.status || 'COUNTERED',
          negotiation_history: data.negotiation_history
        };
        setCurrentRfq(updated);
        setSuccessMsg('Received a new counter-offer from the manufacturer!');
      }
    }
  });

  useSocket({
    event: 'RFQ_UPDATE',
    handler: (data: any) => {
      if (data?.requestId === currentRfq?.id || data?.rfq?.id === currentRfq?.id) {
        const updated = data.rfq || {
          ...currentRfq,
          status: data.status,
          negotiation_history: data.negotiation_history
        };
        setCurrentRfq(updated);
        if (data.type === 'RFQ_ACCEPTED') {
          setSuccessMsg('Quote has been accepted!');
        } else if (data.type === 'RFQ_REJECTED') {
          setErrorMsg('Quote has been declined.');
        }
      }
    }
  });

  if (!isOpen || !currentRfq) return null;

  // Normalize negotiation history array
  let historyList: NegotiationStep[] = [];
  if (Array.isArray(currentRfq.negotiation_history)) {
    historyList = currentRfq.negotiation_history;
  } else if (typeof currentRfq.negotiation_history === 'string') {
    try {
      historyList = JSON.parse(currentRfq.negotiation_history);
    } catch (e) {
      historyList = [];
    }
  }

  // Handle Manufacturer Submitting Counter-Offer
  const handleManufacturerCounter = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const price = parseFloat(counterPriceInput);
    if (isNaN(price) || price <= 0) {
      setErrorMsg('Please enter a valid counter-offer price greater than ₹0');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await requestService.counterOfferRFQ(currentRfq.id, {
        counter_price: price,
        notes: notesInput.trim(),
        deadline: deadlineInput ? new Date(deadlineInput).toISOString() : undefined
      });

      if (res.success) {
        setSuccessMsg('Counter-offer submitted successfully!');
        setCounterPriceInput('');
        setNotesInput('');
        setCurrentRfq(res.data);
        onSuccess?.();
      } else {
        setErrorMsg(res.message || 'Failed to submit counter-offer');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Error submitting counter-offer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Distributor Accept / Reject Response
  const handleDistributorRespond = async (action: 'ACCEPT' | 'REJECT') => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = await distributorService.respondRFQ(currentRfq.id, action, notesInput.trim());
      if (res.success) {
        setSuccessMsg(action === 'ACCEPT' ? 'Quote accepted successfully!' : 'Quote rejected.');
        setNotesInput('');
        setCurrentRfq(res.data);
        onSuccess?.();
      } else {
        setErrorMsg(res.message || `Failed to ${action.toLowerCase()} quote`);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || `Error responding to quote`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const status = currentRfq.status || 'PENDING';
  const isFinalized = status === 'ACCEPTED' || status === 'REJECTED';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] max-w-2xl w-full shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="p-6 md:p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/50 via-white to-orange-50/20">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center shadow-inner">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-tight">
                  RFQ Negotiation
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  status === 'ACCEPTED'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : status === 'REJECTED'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : status === 'COUNTERED'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {status}
                </span>
              </div>
              <p className="text-[11px] font-bold text-gray-400 tracking-wider uppercase mt-0.5">
                Ref: {currentRfq.unique_request_id || `REQ-${currentRfq.id}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">

          {/* Alerts */}
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700 flex items-center gap-2 animate-in fade-in">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-xs font-bold text-green-700 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Pricing & Deadline Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Target Price */}
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                Target Price (Distributor)
              </span>
              <div className="text-xl font-black text-gray-900 flex items-baseline gap-0.5">
                <span className="text-sm font-semibold text-gray-500">₹</span>
                {currentRfq.target_price ? Number(currentRfq.target_price).toFixed(2) : 'N/A'}
              </div>
              {currentRfq.quantity && (
                <span className="text-[10px] font-semibold text-gray-400 mt-1 block">
                  Qty: {currentRfq.quantity} units
                </span>
              )}
            </div>

            {/* Counter Price */}
            <div className={`p-4 rounded-2xl border ${
              currentRfq.counter_price
                ? 'bg-amber-50/50 border-amber-200/80'
                : 'bg-gray-50 border-gray-100'
            }`}>
              <span className="text-[10px] font-black uppercase tracking-widest block mb-1 text-amber-700">
                Counter Price (Manufacturer)
              </span>
              <div className="text-xl font-black text-amber-800 flex items-baseline gap-0.5">
                <span className="text-sm font-semibold text-amber-600">₹</span>
                {currentRfq.counter_price ? Number(currentRfq.counter_price).toFixed(2) : 'Pending'}
              </div>
              <span className="text-[10px] font-semibold text-amber-600/80 mt-1 block">
                {currentRfq.counter_price ? 'Awaiting response' : 'No counter yet'}
              </span>
            </div>

            {/* Deadline */}
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Deadline
              </span>
              <div className="text-sm font-bold text-gray-800 mt-1">
                {currentRfq.deadline ? new Date(currentRfq.deadline).toLocaleDateString() : 'No deadline'}
              </div>
              <span className="text-[10px] font-semibold text-gray-400 mt-1 block">
                {currentRfq.deadline ? new Date(currentRfq.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Flexible timeline'}
              </span>
            </div>

          </div>

          {/* Product / Requirement Details */}
          {(currentRfq.product_name || currentRfq.name || currentRfq.description) && (
            <div className="p-4 bg-gray-50/70 border border-gray-100 rounded-2xl">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Item Scope</span>
              </div>
              <p className="text-xs font-bold text-gray-800">
                {currentRfq.product_name || currentRfq.name || 'Bulk Procurement'}
              </p>
              {currentRfq.description && (
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {currentRfq.description}
                </p>
              )}
            </div>
          )}

          {/* Negotiation History Timeline */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-orange-500" />
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Negotiation History</h4>
            </div>

            {historyList.length === 0 ? (
              <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl text-center text-xs text-gray-400 font-medium">
                No past negotiation interactions recorded for this quote.
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                {historyList.map((step, idx) => {
                  const isDist = step.sender_type === 'distributor';
                  return (
                    <div key={idx} className="relative">
                      {/* Timeline node */}
                      <div className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full border-2 border-white ring-2 ${
                        step.action === 'ACCEPTED'
                          ? 'bg-green-500 ring-green-200'
                          : step.action === 'REJECTED'
                          ? 'bg-red-500 ring-red-200'
                          : step.action === 'COUNTER_OFFER'
                          ? 'bg-amber-500 ring-amber-200'
                          : 'bg-blue-500 ring-blue-200'
                      }`} />

                      <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              isDist ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {isDist ? 'Distributor' : 'Manufacturer'}
                            </span>
                            <span className="text-xs font-bold text-gray-800">
                              {step.action === 'CREATE_RFQ' && 'Initiated RFQ'}
                              {step.action === 'COUNTER_OFFER' && 'Submitted Counter-Offer'}
                              {step.action === 'ACCEPTED' && 'Accepted Quote'}
                              {step.action === 'REJECTED' && 'Declined Quote'}
                            </span>
                          </div>
                          <span className="text-[10px] font-medium text-gray-400">
                            {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {(step.price !== undefined || step.counter_price !== undefined || step.target_price !== undefined || step.agreed_price !== undefined) && (
                          <div className="text-xs font-black text-gray-900">
                            Price: ₹{Number(step.price || step.counter_price || step.target_price || step.agreed_price).toFixed(2)}
                          </div>
                        )}

                        {step.notes && (
                          <p className="text-xs text-gray-600 italic">
                            "{step.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Sections */}
          {!isFinalized && (
            <div className="pt-4 border-t border-gray-100 space-y-4">

              {/* Manufacturer Action: Counter-Offer Form */}
              {userRole === 'manufacturer' && (
                <form onSubmit={handleManufacturerCounter} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-orange-600" />
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                      Submit Counter-Offer
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                        Counter-Offer Price (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        placeholder="e.g. 520.00"
                        value={counterPriceInput}
                        onChange={(e) => setCounterPriceInput(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                        Offer Validity Deadline
                      </label>
                      <input
                        type="date"
                        value={deadlineInput}
                        onChange={(e) => setDeadlineInput(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                      Terms / Counter Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ready for dispatch within 5 business days"
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Send Counter-Offer
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Distributor Action: Accept / Reject Quote */}
              {userRole === 'distributor' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-orange-600" />
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                      Respond to Quotation
                    </h4>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                      Response Remarks (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Terms agreed, proceed to invoice"
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleDistributorRespond('ACCEPT')}
                      className="py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-green-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Accept Quote
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleDistributorRespond('REJECT')}
                      className="py-3.5 bg-white border border-gray-200 hover:bg-gray-50 text-red-600 rounded-xl text-xs font-black uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" /> Reject Quote
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {isFinalized && (
            <div className={`p-4 rounded-2xl border text-center ${
              status === 'ACCEPTED'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <p className="text-xs font-black uppercase tracking-wider">
                {status === 'ACCEPTED' ? 'Negotiation Finalized: Quote Accepted' : 'Negotiation Finalized: Quote Rejected'}
              </p>
              <p className="text-[11px] font-medium mt-0.5 opacity-80">
                {status === 'ACCEPTED'
                  ? 'Both parties have reached an agreement on pricing and quantity terms.'
                  : 'This negotiation was closed without agreement.'}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-gray-100 flex justify-end bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default RFQNegotiationModal;
