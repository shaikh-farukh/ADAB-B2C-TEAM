import React from 'react';

interface PaymentMethodSelectorProps {
  paymentMode: 'CASH' | 'NET_30' | 'ONLINE';
  onChange: (mode: 'CASH' | 'NET_30' | 'ONLINE') => void;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({ paymentMode, onChange }) => {
  return (
    <div className="space-y-4">
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Payment Mode</label>
      <div className="flex flex-col gap-3">
        <label className={`flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
          ${paymentMode === 'CASH' ? 'border-adab-orange bg-orange-50/50 dark:bg-orange-900/20' : 'border-gray-100 dark:border-white/5 bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-white/20'}`}>
          <input type="radio" name="paymentMode" className="sr-only" checked={paymentMode === 'CASH'} onChange={() => onChange('CASH')} />
          <span className="text-sm font-bold text-gray-900 dark:text-gray-200">Cash on Delivery / Direct</span>
          <span className="text-[10px] text-gray-400 mt-1">Pay immediately upon delivery or via direct transfer</span>
        </label>

        <label className={`flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
          ${paymentMode === 'ONLINE' ? 'border-adab-orange bg-orange-50/50 dark:bg-orange-900/20' : 'border-gray-100 dark:border-white/5 bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-white/20'}`}>
          <input type="radio" name="paymentMode" className="sr-only" checked={paymentMode === 'ONLINE'} onChange={() => onChange('ONLINE')} />
          <span className="text-sm font-bold text-gray-900 dark:text-gray-200">Online Payment</span>
          <span className="text-[10px] text-gray-400 mt-1">Pay securely via Credit Card, UPI, or Net Banking</span>
        </label>

        <label className={`flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
          ${paymentMode === 'NET_30' ? 'border-adab-green bg-green-50/50 dark:bg-green-900/20' : 'border-gray-100 dark:border-white/5 bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-white/20'}`}>
          <input type="radio" name="paymentMode" className="sr-only" checked={paymentMode === 'NET_30'} onChange={() => onChange('NET_30')} />
          <span className="text-sm font-bold text-gray-900 dark:text-gray-200">Net-30 B2B Credit Line</span>
          <span className="text-[10px] text-gray-400 mt-1">Use your pre-approved credit balance. Payable in 30 days.</span>
        </label>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
