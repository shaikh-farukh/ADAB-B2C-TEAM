import React from 'react';

/**
 * Renders nearby B2B wholesale offers with direct Draft Purchase Order action.
 */
export default function B2BRestockCard({ widget, messageId, actionLoading, onDraftPO }) {
  if (!widget?.offers || !Array.isArray(widget.offers)) return null;

  return (
    <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-1.5">
      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
        <i className="fa-solid fa-warehouse text-purple-600"></i> Nearby Wholesale Stock
      </div>
      {widget.offers.map((off) => {
        const isDrafting = actionLoading[`draft_po_${off.listingId || off.supplierStoreId}`];
        const isDrafted = off.poDrafted;

        return (
          <div
            key={off.listingId}
            className="p-2 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between gap-2"
          >
            <div>
              <div className="font-bold text-purple-950 text-[11px]">{off.productName}</div>
              <div className="text-[10px] text-purple-800">
                ₹{off.wholesalePrice}/{off.unit || 'pc'} • {off.supplierName} ({off.distanceKm}km)
              </div>
              <div className="text-[9px] text-emerald-700 font-semibold mt-0.5">
                ✓ {off.creditDays}-Day B2B Credit Available
              </div>
            </div>
            {isDrafted ? (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-xs">
                <i className="fa-solid fa-check"></i> Drafted
              </span>
            ) : (
              <button
                onClick={() => onDraftPO(off, messageId)}
                disabled={isDrafting}
                className={`px-2 py-1 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg text-[10px] transition cursor-pointer whitespace-nowrap shadow-xs flex items-center gap-1 ${
                  isDrafting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                <i className={`fa-solid ${isDrafting ? 'fa-spinner fa-spin' : 'fa-file-invoice'}`}></i>
                {isDrafting ? 'Drafting...' : 'Draft PO'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
