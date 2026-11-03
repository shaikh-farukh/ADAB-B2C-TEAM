import React from 'react';

/**
 * Renders GSTR Tax calculation card with multi-slab breakdown.
 */
export default function GstrTaxCard({ widget }) {
  if (!widget) return null;

  return (
    <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-1.5 text-[11px]">
      <div className="grid grid-cols-2 gap-1.5 p-2 bg-emerald-50/60 rounded-xl border border-emerald-100">
        <div>
          <span className="text-[9px] text-emerald-700 font-bold uppercase">Taxable Turnover</span>
          <div className="font-black text-emerald-950 text-xs">{widget.taxable}</div>
        </div>
        <div>
          <span className="text-[9px] text-emerald-700 font-bold uppercase">Total Tax Liability</span>
          <div className="font-black text-emerald-950 text-xs">{widget.totalTax || widget.gross}</div>
        </div>
      </div>

      {Array.isArray(widget.slabs) && widget.slabs.length > 0 && (
        <div className="mt-1 space-y-1">
          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">GST Slab Breakdown</div>
          {widget.slabs.map((sl, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center text-[10px] px-2 py-1 bg-gray-50 rounded-md border border-gray-100"
            >
              <span className="text-gray-700 font-medium">{sl.rate}</span>
              <span className="font-mono text-gray-900 font-bold">{sl.totalTax}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between pt-1 border-t border-gray-100 font-black text-emerald-800">
        <span>Total Invoiced Gross:</span>
        <span>{widget.gross}</span>
      </div>
    </div>
  );
}
