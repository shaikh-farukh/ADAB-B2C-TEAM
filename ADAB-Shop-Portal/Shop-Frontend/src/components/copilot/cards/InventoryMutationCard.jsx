import React from 'react';

/**
 * Confirmation card displaying changes in stock quantities or pricing.
 */
export default function InventoryMutationCard({ widget }) {
  if (!widget) return null;

  return (
    <div className="mt-2.5 pt-2 border-t border-gray-100 p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between gap-2">
      <div>
        <div className="font-bold text-indigo-950 text-[11px]">{widget.title}</div>
        <div className="text-[10px] text-indigo-700">{widget.message}</div>
      </div>
      <i className="fa-solid fa-circle-check text-indigo-600 text-base shrink-0"></i>
    </div>
  );
}
