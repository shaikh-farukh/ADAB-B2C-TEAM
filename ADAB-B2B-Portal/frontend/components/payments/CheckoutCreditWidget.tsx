import React from 'react';

interface CheckoutCreditWidgetProps {
  creditBalance: number;
  orderTotal: number;
}

const CheckoutCreditWidget: React.FC<CheckoutCreditWidgetProps> = ({ creditBalance, orderTotal }) => {
  const remaining = creditBalance - orderTotal;
  const isExceeded = remaining < 0;

  return (
    <div className="w-full mt-6 bg-green-50/50 dark:bg-green-900/10 rounded-xl p-5 border border-green-100/50 dark:border-green-900/30 space-y-4">
      <div className="flex justify-between items-center text-xs font-bold text-gray-500">
        <span>Current Credit Balance</span>
        <span className="text-gray-900 dark:text-gray-200">₹{creditBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>
      <div className="flex justify-between items-center text-xs font-bold text-red-400">
        <span>Less: This Order</span>
        <span>-${orderTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>
      <div className="pt-4 border-t border-green-100/50 dark:border-green-900/30 flex justify-between items-end">
        <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${isExceeded ? 'text-red-500' : 'text-adab-green'}`}>
          {isExceeded ? 'Credit Exceeded' : 'Remaining Credit'}
        </span>
        <span className={`text-xl font-black tracking-tighter leading-none ${isExceeded ? 'text-red-500' : 'text-adab-green'}`}>
          ₹{remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
};

export default CheckoutCreditWidget;
