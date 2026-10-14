import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function ProductCard({ 
  product, 
  onAddToCart, 
  onToggleWishlist, 
  onRemove,
  wishlist, 
  actionButtonText = 'ADD',
  customClassName = '',
  compact = false
}) {
  const navigate = useNavigate();
  const discount = product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : (product.discount || 0);
  const isOutOfStock = product.stock_qty !== undefined && product.stock_qty <= 0;
  const isLowStock = product.stock_qty !== undefined && product.stock_qty > 0 && product.stock_qty <= 10;

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] overflow-hidden group hover:border-[#18753C]/30 transition-all duration-200 flex flex-col justify-between ${customClassName}`}>
      <div 
        onClick={() => navigate(`/product/${product.id}`)}
        className="relative aspect-square bg-[#F9FAFB] flex items-center justify-center p-3 sm:p-4 cursor-pointer"
      >
        <img 
          src={product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80'} 
          alt={product.name} 
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80';
          }}
          className={`w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500 ${isOutOfStock ? 'opacity-40 grayscale' : ''}`}
        />
        {isOutOfStock ? (
          <div className="absolute top-2 left-2 bg-gray-900 text-white text-[10px] font-black px-2 py-1 rounded shadow-sm tracking-wide z-10">
            OUT OF STOCK
          </div>
        ) : discount > 0 ? (
          <div className="absolute top-2 left-2 bg-[#F26E21] text-white text-[10px] font-extrabold px-2 py-1 rounded shadow-sm tracking-wide z-10">
            {discount}% OFF
          </div>
        ) : null}
        
        {/* Wishlist Heart Icon */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleWishlist) onToggleWishlist(product.id);
          }}
          className="absolute top-2 right-2 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-white shadow-sm z-10 transition-colors cursor-pointer"
        >
          <i className={`fa-regular fa-heart text-[14px] ${wishlist?.includes(product.id) ? 'fa-solid text-red-500' : ''}`}></i>
        </button>
      </div>
      <div className="p-4 flex flex-col justify-between flex-1">
        <div>
        {product.sellerName && (
          <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500 mb-1.5 truncate">
            <i className="fa-solid fa-store text-[10px] text-emerald-600"></i>
            <span className="truncate">{product.sellerName}</span>
          </div>
        )}
        <div 
          onClick={() => navigate(`/product/${product.id}`)}
          className="font-bold text-[14px] leading-tight line-clamp-2 min-h-[2.5rem] text-[#111827] cursor-pointer hover:text-[#18753C] mb-1 capitalize"
        >
          {product.name}
        </div>
        
        {/* Rating & Low Stock Badge */}
        <div className="flex items-center justify-between gap-1.5 mb-2">
          <div className="flex items-center gap-1.5">
            <i className="fa-solid fa-star text-[#F26E21] text-[10px]"></i>
            <span className="font-bold text-sm text-[#111827]">{product.rating ? parseFloat(product.rating).toFixed(1) : '4.5'}</span>
            <span className="text-gray-400 text-sm">({product.reviews || 0})</span>
          </div>
          {isLowStock && (
            <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
              Only {product.stock_qty} left
            </span>
          )}
        </div>
        </div>

        {/* Price Row */}
        <div className="flex items-baseline gap-1.5 mt-3 pt-1">
          <span className="font-extrabold text-lg text-[#111827]">₹{product.price}</span>
          {product.mrp > product.price && (
            <span className="text-xs text-gray-400 line-through">₹{product.mrp}</span>
          )}
        </div>

        {/* Action Buttons on Next New Line */}
        <div className="mt-3 pt-1 flex items-center gap-2">
          {onRemove && (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(product.id);
              }}
              className="flex-1 border border-red-200 text-red-600 bg-red-50/50 hover:bg-red-500 hover:text-white py-2 rounded-xl font-bold text-xs tracking-wide transition-colors cursor-pointer text-center flex items-center justify-center gap-1 shadow-2xs"
            >
              <i className="fa-regular fa-trash-can text-[11px]"></i>
              <span>Remove</span>
            </button>
          )}
          {isOutOfStock ? (
            <button 
              type="button"
              disabled
              className={`${onRemove ? 'flex-1' : 'w-full'} border border-gray-200 text-gray-400 bg-gray-100 py-2 px-3 rounded-xl font-extrabold text-xs tracking-wide cursor-not-allowed text-center`}
            >
              OUT OF STOCK
            </button>
          ) : (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onAddToCart) onAddToCart(product.id, product.name);
              }}
              className={`${onRemove ? 'flex-1' : 'w-full'} border-2 border-[#18753C] text-[#18753C] bg-white hover:bg-[#18753C] hover:text-white py-2 px-3 rounded-xl font-extrabold text-xs tracking-wide transition-colors cursor-pointer text-center shadow-2xs`}
            >
              {actionButtonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
