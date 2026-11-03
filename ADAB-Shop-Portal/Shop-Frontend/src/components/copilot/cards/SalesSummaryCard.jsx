import React from 'react';

/**
 * 3-column financial metric card displaying Revenue, Orders, AOV, and Net Seller Payout.
 */
export default function SalesSummaryCard({ widget }) {
  if (!widget) return null;

  return (
    <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-1.5">
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className="p-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
          <div className="text-[9px] text-emerald-700 font-bold uppercase">Revenue</div>
          <div className="font-black text-emerald-900 text-xs">{widget.revenue}</div>
        </div>
        <div className="p-1.5 bg-indigo-50 rounded-lg border border-indigo-100">
          <div className="text-[9px] text-indigo-700 font-bold uppercase">Orders</div>
          <div className="font-black text-indigo-900 text-xs">{widget.orders}</div>
        </div>
        <div className="p-1.5 bg-purple-50 rounded-lg border border-purple-100">
          <div className="text-[9px] text-purple-700 font-bold uppercase">Avg Ticket</div>
          <div className="font-black text-purple-900 text-xs">{widget.aov}</div>
        </div>
      </div>
      {widget.payout && (
        <div className="flex justify-between items-center text-[10px] px-2 py-1 bg-gray-50 rounded-lg text-gray-600 border border-gray-100">
          <span>Net Seller Payout:</span>
          <span className="font-bold text-gray-900">{widget.payout}</span>
        </div>
      )}
    </div>
  );
}
