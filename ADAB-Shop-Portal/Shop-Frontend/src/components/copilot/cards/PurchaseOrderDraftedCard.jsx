import React from 'react';

/**
 * Confirmation card displaying details of a drafted B2B Purchase Order.
 */
export default function PurchaseOrderDraftedCard({ widget }) {
  if (!widget) return null;

  return (
    <div className="mt-2.5 pt-2 border-t border-gray-100 p-2.5 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100 space-y-1">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs shrink-0">
          <i className="fa-solid fa-file-invoice"></i>
        </div>
        <div>
          <div className="font-extrabold text-purple-950 text-xs">PO #{widget.poNumber} Drafted</div>
          <div className="text-[10px] text-purple-700">
            {widget.totalAmount} • {widget.paymentTerms}
          </div>
        </div>
      </div>
      <div className="text-[10px] text-gray-600 mt-1 bg-white/70 p-1.5 rounded-lg border border-purple-100">
        {widget.message}
      </div>
    </div>
  );
}
