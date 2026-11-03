import React from 'react';

/**
 * Renders low inventory items with remaining quantities and a button to find B2B suppliers.
 */
export default function LowStockCard({ widget, onFindSuppliers }) {
  if (!widget) return null;

  return (
    <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-1.5">
      {!widget.items || widget.items.length === 0 ? (
        <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2">
          <i className="fa-solid fa-circle-check text-emerald-600 text-base"></i>
          <div className="text-[11px] text-emerald-900 font-semibold">
            All store items are well-stocked (&gt; 5 units). No immediate restock needed!
          </div>
        </div>
      ) : (
        widget.items.map((it, idx) => (
          <div
            key={it.id || idx}
            className="p-2 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between gap-2"
          >
            <div>
              <div className="font-bold text-amber-950 text-[11px]">{it.title}</div>
              <div className="text-[10px] text-amber-800">
                Only <span className="font-black text-red-600">{it.remaining} {it.unit || 'units'}</span> left
              </div>
            </div>
            <button
              onClick={() => onFindSuppliers(it.title)}
              className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px] transition cursor-pointer whitespace-nowrap shadow-xs flex items-center gap-1"
            >
              <i className="fa-solid fa-truck-ramp-box"></i> Suppliers
            </button>
          </div>
        ))
      )}
    </div>
  );
}
