import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function ProductCard({ product, onAddToCart, onToggleWishlist, wishlist, actionButtonText = 'ADD' }) {
  const navigate = useNavigate();
  const discount = product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : (product.discount || 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] overflow-hidden group hover:border-[#18753C]/30 transition-colors">
      <div 
        onClick={() => navigate(`/product/${product.id}`)}
        className="relative aspect-square bg-[#F9FAFB] flex items-center justify-center p-4 cursor-pointer"
      >
        <img 
          src={product.image || 'https://via.placeholder.com/300'} 
          alt={product.name} 
          className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
        />
        {discount > 0 && (
          <div className="absolute top-2 left-2 bg-[#F26E21] text-white text-[10px] font-extrabold px-2 py-1 rounded shadow-sm tracking-wide z-10">
            {discount}% OFF
          </div>
        )}
        
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
      <div className="p-4">
        <span 
          onClick={(e) => {
            e.stopPropagation();
            if (product.store_id) {
              navigate(`/stores?store_id=${product.store_id}`);
            }
          }}
          className={`bg-[#E8F5E9] text-[#18753C] text-[10px] font-extrabold px-2 py-1 rounded mb-2 inline-block uppercase tracking-wider ${product.store_id ? 'hover:bg-emerald-200 transition-colors cursor-pointer' : ''}`}
        >
          {product.sellerName || 'Verified Shop'}
        </span>
        <div 
          onClick={() => navigate(`/product/${product.id}`)}
          className="font-bold text-[14px] leading-tight line-clamp-2 min-h-[2.5rem] text-[#111827] cursor-pointer hover:text-[#18753C] mb-1"
        >
          {product.name}
        </div>
        
        {/* Rating */}
        <div className="flex items-center gap-1.5 mb-2">
          <i className="fa-solid fa-star text-[#F26E21] text-[10px]"></i>
          <span className="font-bold text-sm text-[#111827]">{product.rating ? parseFloat(product.rating).toFixed(1) : '4.5'}</span>
          <span className="text-gray-400 text-sm">({product.reviews || 82})</span>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-baseline gap-2">
            <span className="font-extrabold text-xl text-[#111827]">₹{product.price}</span>
            {product.mrp > product.price && (
              <span className="text-sm text-gray-400 line-through">₹{product.mrp}</span>
            )}
          </div>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onAddToCart) onAddToCart(product.id, product.name);
            }}
            className="border-2 border-[#18753C] text-[#18753C] bg-white hover:bg-[#18753C] hover:text-white px-4 py-1.5 rounded-xl font-bold text-sm transition-colors cursor-pointer"
          >
            {actionButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}
