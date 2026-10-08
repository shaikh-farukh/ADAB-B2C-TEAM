import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/api';

export default function ProductDetailPage({ onAddToCart, onToggleWishlist, wishlist }) {
  const location = useLocation();
  const id = location.pathname.split('/')[2];
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/catalog/products/${id}`);
        if (res.data.success) {
          const fetchedProduct = res.data.data;
          setProduct({
            ...fetchedProduct,
            deliveryEstimate: 'Tomorrow, by 10 AM',
            returnPolicy: '7 Days Returnable',
            variants: ['Standard']
          });
        } else {
          setProduct(null);
        }
      } catch (err) {
        console.error("Error fetching product details:", err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchProduct();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="animate-pulse p-4 md:p-8">
        <div className="w-full h-64 md:h-96 bg-gray-200 rounded-2xl mb-6"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
        <div className="h-12 bg-gray-200 rounded w-full mb-4"></div>
      </div>
    );
  }

  if (!product) return <div>Product not found.</div>;

  const isWishlisted = wishlist?.includes(product.id);

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start">
      {/* Image Gallery */}
      <div className="w-full md:w-1/2">
        <div className="bg-gray-100 rounded-3xl overflow-hidden aspect-square relative">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          <button 
            onClick={() => onToggleWishlist(product.id)}
            className="absolute top-4 right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-brand-coral hover:bg-gray-50"
          >
            <i className={`fa-regular fa-heart text-2xl ${isWishlisted ? 'fa-solid' : ''}`}></i>
          </button>
        </div>
      </div>

      {/* Product Details */}
      <div className="w-full md:w-1/2 flex flex-col pt-4">
        <div className="text-sm font-bold text-brand-green uppercase tracking-wider mb-2">
          {product.sellerName}
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-4">
          {product.name}
        </h1>
        
        {/* Rating */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-bold">
            <span>{product.rating}</span>
            <i className="fa-solid fa-star text-[10px]"></i>
          </div>
          <span className="text-gray-500 text-sm font-medium">{product.reviews} reviews</span>
        </div>

        {/* Pricing */}
        <div className="flex items-end gap-3 mb-8">
          <span className="text-4xl font-black text-gray-900">₹{product.price}</span>
          <span className="text-xl text-gray-400 line-through font-bold mb-1">₹{product.mrp}</span>
          <span className="text-sm font-bold text-brand-coral mb-2">
            {Math.round(((product.mrp - product.price) / product.mrp) * 100)}% OFF
          </span>
        </div>

        <div className="h-px bg-gray-200 w-full mb-8"></div>

        {/* Variants (Mock) */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Select Quantity</h3>
          <div className="flex flex-wrap gap-3">
            {product.variants.map((v, i) => (
              <button key={i} className={`px-5 py-2 border-2 font-bold rounded-xl ${i === 0 ? 'border-brand-green text-brand-green bg-green-50' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => onAddToCart(product.id, product.name)}
            className="flex-1 bg-brand-green text-white font-bold text-lg rounded-2xl py-4 shadow-xl shadow-brand-green/30 active:scale-[0.98] transition-transform"
          >
            Add to Cart
          </button>
        </div>

        {/* Description */}
        {product.description && (
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
          </div>
        )}

        {/* Delivery & Returns */}
        <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-700 shadow-sm">
              <i className="fa-solid fa-truck-fast"></i>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Delivery</p>
              <p className="font-bold text-gray-900">{product.deliveryEstimate}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-700 shadow-sm">
              <i className="fa-solid fa-rotate-left"></i>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Returns</p>
              <p className="font-bold text-gray-900">{product.returnPolicy}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
