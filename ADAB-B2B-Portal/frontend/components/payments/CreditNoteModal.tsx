import React, { useState } from 'react';
import { X, Loader2, FileText } from 'lucide-react';
import paymentService from '../../services/paymentService';

interface CreditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
  maxAmount: number;
  onSuccess: () => void;
}

const CreditNoteModal: React.FC<CreditNoteModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  maxAmount,
  onSuccess,
}) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    if (numAmount > maxAmount) {
      setError(`Amount cannot exceed outstanding balance (₹${maxAmount.toFixed(2)})`);
      return;
    }
    if (!reason.trim()) {
      setError('Reason is required');
      return;
    }

    setIsLoading(true);
    const res = await paymentService.applyCreditNote({
      invoice_id: Number(invoiceId),
      amount: numAmount,
      reason: reason.trim(),
    });

    setIsLoading(false);
    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.message || 'Failed to issue credit note');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 uppercase">Issue Credit Note</h3>
              <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Invoice {invoiceNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl">
              {error}
            </div>
          )}

          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount (₹)</label>
              <span className="text-[10px] font-bold text-gray-500">Max: ₹{maxAmount.toFixed(2)}</span>
            </div>
            <input
              type="number"
              step="0.01"
              max={maxAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Reason / Notes</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all resize-none h-24"
              placeholder="E.g., Returned damaged items, adjustment..."
              required
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-black uppercase text-xs hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-black uppercase text-xs hover:bg-orange-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Issue Credit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreditNoteModal;
