import React from 'react';

/**
 * Floating Cart Bar Component
 * Matches unified-customer-portal-demo.html
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
      {/* Left side: Icon + Items Count + Store Title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <i className="fa-solid fa-cart-shopping text-base"></i>
        </div>
        <div className="text-left min-w-0">
          <div id="floatCartCount" className="font-extrabold text-sm leading-tight">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </div>
          <div id="floatCartStore" className="text-xs opacity-80 truncate leading-tight">
            {storeName || 'View cart'}
          </div>
        </div>
      </div>

      {/* Right side: Total Price + Arrow */}
      <div className="flex items-center gap-2 shrink-0 font-extrabold text-sm sm:text-base">
        <span>₹<span id="floatCartTotal">{Number(totalPrice).toLocaleString('en-IN')}</span></span>
        <i className="fa-solid fa-arrow-right text-xs"></i>
      </div>
    </button>
  );
}
