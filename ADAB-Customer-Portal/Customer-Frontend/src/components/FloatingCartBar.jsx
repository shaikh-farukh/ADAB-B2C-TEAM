import React from 'react';

/**
 * Floating Cart Bar Component
 * Matches unified-customer-portal-demo.html 100%
 * Sticks above bottom navigation and slides into view when cart has items
 */
export default function FloatingCartBar({
  itemCount = 0,
  totalPrice = 0,
  storeName = 'View cart',
  onOpenCart
}) {
  const isHidden = itemCount <= 0;

  return (
    <button
      type="button"
      id="floatCart"
      onClick={onOpenCart}
      aria-label="View shopping cart"
      className={`float-cart cursor-pointer ${isHidden ? 'hidden-bar' : ''}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold text-sm shrink-0">
          <i className="fa-solid fa-bag-shopping"></i>
        </div>
        <div className="min-w-0 text-left">
          <div className="text-xs font-extrabold" id="floatCartCount">
            {`${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
          </div>
          <div className="text-[10px] text-green-200 truncate" id="floatCartStore">
            {storeName || 'View cart'}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-extrabold">
          ₹<span id="floatCartTotal">{Number(totalPrice).toLocaleString('en-IN')}</span>
        </span>
        <i className="fa-solid fa-arrow-right text-xs"></i>
      </div>
    </button>
  );
}
