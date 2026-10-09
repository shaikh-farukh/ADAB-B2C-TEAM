import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import { ShoppingCart, Star, ChevronRight, ArrowLeft } from 'lucide-react';

export default function ProductDetailPage({ onAddToCart, onToggleWishlist, wishlist }) {
  const location = useLocation();
  const id = location.pathname.split('/')[2];
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/catalog/products/${id}`);
        if (res.data.success && res.data.data) {
          const fetchedProduct = res.data.data;
          setProduct({
            ...fetchedProduct,
            images: fetchedProduct.images || [fetchedProduct.image],
            deliveryEstimate: fetchedProduct.deliveryEstimate || 'Tomorrow, by 10 AM',
            returnPolicy: fetchedProduct.returnPolicy || '7 Days Returnable',
            variants: fetchedProduct.variants || [
              { id: 1, name: 'Standard', price: fetchedProduct.price }
            ]
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

  if (!product) return <div className="p-8 text-center text-gray-500 font-bold">Product not found.</div>;

  const isWishlisted = wishlist?.includes(product.id);
  const variant = Array.isArray(product.variants) && product.variants.length > 0 ? product.variants[selectedVariant] : null;
  const displayPrice = variant && typeof variant === 'object' && variant.price !== undefined ? variant.price : product.price;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center text-xs text-gray-500 space-x-2">
        <button onClick={() => navigate(-1)} className="hover:text-brand-green flex items-center transition-colors font-bold cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
        </button>
        <span><ChevronRight className="w-3.5 h-3.5" /></span>
        <button onClick={() => navigate('/')} className="hover:text-brand-green transition-colors cursor-pointer">Home</button>
        <span><ChevronRight className="w-3.5 h-3.5" /></span>
        <span className="text-gray-900 font-bold truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Image Gallery */}
        <div className="w-full md:w-1/2">
          <div className="bg-gray-100 rounded-3xl overflow-hidden aspect-square relative group">
            <img 
              src={product.images && product.images[selectedImage] ? product.images[selectedImage] : product.image} 
              alt={product.name} 
              className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300" 
            />
            <button 
              onClick={() => onToggleWishlist && onToggleWishlist(product.id)}
              className="absolute top-4 right-4 w-11 h-11 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md text-brand-coral hover:bg-white transition-all cursor-pointer z-10"
            >
              <i className={`fa-regular fa-heart text-xl ${isWishlisted ? 'fa-solid' : ''}`}></i>
            </button>
          </div>

          {/* Multiple Image Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto mt-4 pb-1">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all p-1 bg-white cursor-pointer ${
                    selectedImage === idx ? 'border-brand-green ring-2 ring-brand-green/20' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="w-full md:w-1/2 flex flex-col pt-1">
          <div className="text-xs font-extrabold text-brand-green uppercase tracking-wider mb-2">
            {product.sellerName}
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-3">
            {product.name}
          </h1>
          
          {/* Rating & Reviews */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center gap-1 bg-green-50 text-green-800 px-2.5 py-1 rounded-lg text-xs font-bold border border-green-200">
              <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
              <span>{product.rating}</span>
            </div>
            <span className="text-gray-500 text-xs font-medium">{product.reviews || 0} reviews</span>
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">In Stock</span>
          </div>

          {/* Pricing */}
          <div className="flex items-end gap-3 mb-6">
            <span className="text-3xl font-black text-gray-900">₹{displayPrice}</span>
            {product.mrp > displayPrice && (
              <>
                <span className="text-lg text-gray-400 line-through font-bold mb-0.5">₹{product.mrp}</span>
                <span className="text-xs font-extrabold text-brand-coral bg-rose-50 px-2 py-0.5 rounded mb-1">
                  {Math.round(((product.mrp - displayPrice) / product.mrp) * 100)}% OFF
                </span>
              </>
            )}
          </div>

          <div className="h-px bg-gray-200 w-full mb-6"></div>

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2.5">Select Variant / Size</h3>
              <div className="flex flex-wrap gap-2.5">
                {product.variants.map((v, i) => {
                  const label = typeof v === 'object' ? v.name : v;
                  const isSelected = selectedVariant === i;
                  return (
                    <button 
                      key={i} 
                      onClick={() => setSelectedVariant(i)}
                      className={`px-4 py-2 border-2 font-bold text-xs rounded-xl transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-brand-green text-brand-green bg-green-50' 
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <button 
              type="button"
              onClick={() => onAddToCart && onAddToCart(product.id, product.name)}
              className="flex-1 bg-brand-green hover:bg-green-700 text-white font-extrabold text-base rounded-2xl py-3.5 shadow-lg shadow-brand-green/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingCart className="w-5 h-5" />
              Add to Cart
            </button>
            <button
              type="button"
              onClick={() => {
                if (onAddToCart) onAddToCart(product.id, product.name);
                navigate('/checkout');
              }}
              className="flex-1 bg-gray-900 hover:bg-black text-white font-extrabold text-base rounded-2xl py-3.5 shadow-lg shadow-gray-900/10 active:scale-[0.98] transition-transform cursor-pointer"
            >
              Buy Now
            </button>
          </div>

          {/* Delivery & Returns */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-gray-700 shadow-sm shrink-0">
                <i className="fa-solid fa-truck-fast text-brand-green"></i>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide">Delivery</p>
                <p className="font-bold text-xs text-gray-900">{product.deliveryEstimate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-gray-700 shadow-sm shrink-0">
                <i className="fa-solid fa-rotate-left text-brand-green"></i>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide">Returns</p>
                <p className="font-bold text-xs text-gray-900">{product.returnPolicy}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="mb-6">
              <h3 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Description</h3>
              <p className="text-gray-600 text-xs leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Specifications */}
          {product.specs && typeof product.specs === 'object' && (
            <div>
              <h3 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Specifications</h3>
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-xs">
                {Object.entries(product.specs).map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                    <span className="text-gray-500 capitalize">{k}</span>
                    <span className="font-bold text-gray-800">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
