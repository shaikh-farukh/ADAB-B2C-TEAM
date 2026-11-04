import React from 'react';

/**
 * Renders low inventory items with remaining quantities, category context,
 * and quick-action supplier restock triggers.
 */
export default function LowStockCard({ widget, onFindSuppliers }) {
  if (!widget) return null;

  const items = widget.items || [];
  const count = widget.count ?? items.length;
  const threshold = widget.threshold ?? 5;

  return (
    <div className="space-y-2.5">
      {/* Header with Title & Badge */}
      <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
          <i className="fa-solid fa-triangle-exclamation text-amber-500"></i>
          <span>Low Stock Items</span>
          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-extrabold">
            {count}
          </span>
        </div>
        <span className="text-[10px] text-gray-400 font-medium">
          Threshold &le; {threshold} units
        </span>
      </div>

      {items.length === 0 ? (
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2">
          <i className="fa-solid fa-circle-check text-emerald-600 text-base"></i>
          <div className="text-[11px] text-emerald-900 font-semibold">
            All store items are well-stocked (&gt; {threshold} units). No immediate restock needed!
          </div>
        </div>
      ) : (
        <div className="max-h-[300px] overflow-y-auto space-y-1.5 pr-0.5">
          {items.map((it, idx) => (
            <div
              key={it.id || idx}
              className="p-2.5 bg-amber-50/70 hover:bg-amber-50 rounded-xl border border-amber-200/70 flex items-center justify-between gap-2.5 transition shadow-2xs"
            >
              <div className="min-w-0 flex-1">
                <div className="font-bold text-gray-900 text-[11px] truncate">{it.title}</div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                  {it.category && (
                    <span className="px-1.5 py-0.2 bg-gray-200/80 text-gray-700 rounded text-[9px] font-medium">
                      {it.category}
                    </span>
                  )}
                  {it.sellPrice !== undefined && (
                    <span className="font-semibold text-gray-700">₹{it.sellPrice}</span>
                  )}
                  <span className="text-amber-900">
                    Only <span className="font-black text-rose-600">{it.remaining} {it.unit || 'units'}</span> left
                  </span>
                </div>
              </div>
              {onFindSuppliers && (
                <button
                  type="button"
                  onClick={() => onFindSuppliers(it.title)}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold rounded-lg text-[10px] transition cursor-pointer whitespace-nowrap shadow-xs flex items-center gap-1 shrink-0"
                  title={`Find B2B suppliers for ${it.title}`}
                >
                  <i className="fa-solid fa-truck-ramp-box"></i> Suppliers
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
