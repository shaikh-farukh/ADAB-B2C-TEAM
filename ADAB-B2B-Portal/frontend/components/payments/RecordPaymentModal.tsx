import React, { useState } from 'react';
import { X, DollarSign, CreditCard, FileText, Loader2, Calendar, IndianRupee } from 'lucide-react';
import paymentService from '../../services/paymentService';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
  outstandingAmount: number;
  distributorId?: number | string;
  onSuccess: () => void;
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  outstandingAmount,
  distributorId,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<string>(outstandingAmount.toString());
  const [method, setMethod] = useState<string>('CASH');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const requiresRef = ['UPI', 'BANK_TRANSFER', 'CHEQUE'].includes(method);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (paymentAmount > outstandingAmount) {
      setError(`Amount cannot exceed outstanding balance (₹${outstandingAmount.toFixed(2)})`);
      return;
    }

    if (requiresRef && !reference.trim()) {
      setError(`Reference number is required for ${method}`);
      return;
    }

    setIsLoading(true);
    try {
      let response;
      if (distributorId) {
        // Manufacturer recording payment for a distributor's invoice
        response = await paymentService.recordPaymentForOrder({
          distributor_id: distributorId,
          amount: paymentAmount,
          paymentMode: method as any,
          referenceId: reference,
          invoiceId: invoiceId,
        });
      } else {
        // Distributor recording their own payment
        response = await paymentService.recordPayment({
          amount: paymentAmount,
          paymentMode: method as any,
          referenceId: reference,
          invoiceIds: [invoiceId],
          autoAllocate: false
        });
      }

      if (response.success) {
        onSuccess();
        onClose();
      } else {
        setError(response.message || 'Failed to record payment');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while recording the payment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-xl font-black text-gray-900 uppercase">Record Payment</h2>
            <p className="text-xs text-gray-500 font-bold mt-1 uppercase tracking-wider">Invoice: {invoiceNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-bold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Payment Amount (₹)</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={outstandingAmount}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold focus:ring-2 focus:ring-adab-green focus:border-transparent transition-all outline-none"
                placeholder="0.00"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <button type="button" onClick={() => setAmount(outstandingAmount.toString())} className="text-[10px] font-black uppercase text-adab-green hover:text-green-700 bg-green-50 px-2 py-1 rounded">Max</button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Payment Method</label>
            <div className="relative">
              <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold focus:ring-2 focus:ring-adab-green focus:border-transparent transition-all outline-none appearance-none"
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
              Reference Number {requiresRef ? <span className="text-red-500">*</span> : <span className="text-gray-300">(Optional)</span>}
            </label>
            <div className="relative">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                required={requiresRef}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold focus:ring-2 focus:ring-adab-green focus:border-transparent transition-all outline-none"
                placeholder={requiresRef ? "Enter transaction ID" : "Optional reference"}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Payment Date</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold focus:ring-2 focus:ring-adab-green focus:border-transparent transition-all outline-none"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-3 px-4 bg-gray-100 text-gray-600 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 px-4 bg-adab-green text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-green-700 transition-colors disabled:opacity-50 shadow-lg shadow-green-900/20"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordPaymentModal;
