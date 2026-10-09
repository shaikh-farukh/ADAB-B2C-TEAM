import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function ProductCard({ product, onAddToCart, onToggleWishlist, wishlist, actionButtonText = 'ADD' }) {
  const navigate = useNavigate();
  return (
    <div className="prod-card group">
      <div 
        onClick={() => navigate(`/product/${product.id}`)}
        className="relative aspect-square bg-gradient-to-br from-gray-50 to-green-50/50 flex items-center justify-center overflow-hidden p-4 cursor-pointer"
      >
        <img 
          src={product.image || 'https://via.placeholder.com/300'} 
          alt={product.name} 
          className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500"
        />
        {product.discount > 0 && (
          <div className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow-sm">
            {product.discount}% OFF
          </div>
        )}
        
        {/* Wishlist Heart Icon */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleWishlist) onToggleWishlist(product.id);
          }}
          className="absolute top-2 right-2 w-7 h-7 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-brand-coral hover:bg-white shadow-sm z-10"
        >
          <i className={`fa-regular fa-heart text-[13px] ${wishlist?.includes(product.id) ? 'fa-solid' : ''}`}></i>
        </button>
      </div>
      <div className="p-3">
        <span className="store-chip">{product.sellerName || 'Store'}</span>
        <div 
          onClick={() => navigate(`/product/${product.id}`)}
          className="font-bold text-[13px] leading-snug mt-1.5 line-clamp-2 min-h-[2.4rem] text-gray-900 cursor-pointer hover:text-brand-green"
        >
          {product.name}
        </div>
        <div className="text-[11px] text-gray-400 mt-0.5">
          {product.unit || '1 unit'}
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <span className="font-extrabold text-base text-brand-dark">₹{product.price}</span>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onAddToCart) onAddToCart(product.id, product.name);
            }}
            className="add-btn hover:bg-brand-green hover:text-white transition-colors cursor-pointer"
          >
            {actionButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}
