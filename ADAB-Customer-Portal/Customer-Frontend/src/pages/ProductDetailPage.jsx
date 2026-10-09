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
  const [sellers, setSellers] = useState([]);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        setLoading(true);
        const [productRes, sellersRes, relatedRes] = await Promise.all([
          api.get(`/catalog/products/${id}`),
          api.get(`/catalog/products/${id}/sellers`).catch(() => ({ data: { data: [] } })),
          api.get(`/catalog/products/${id}/related`).catch(() => ({ data: { data: [] } }))
        ]);

        if (productRes.data.success && productRes.data.data) {
          const fetchedProduct = productRes.data.data;
          setProduct({
            ...fetchedProduct,
            images: fetchedProduct.images || [fetchedProduct.image],
            deliveryEstimate: fetchedProduct.deliveryEstimate || 'Tomorrow, by 10 AM',
            returnPolicy: fetchedProduct.returnPolicy || '7 Days Returnable',
            variants: fetchedProduct.variants || [
              { id: 1, name: 'Standard', price: fetchedProduct.price }
            ],
            reviewsList: [
              { id: 1, user: "Alex M.", rating: 5, comment: "Excellent quality and fast delivery!", date: "2 days ago" },
              { id: 2, user: "Sarah J.", rating: 4, comment: "Good product, exactly as described.", date: "1 week ago" }
            ]
          });
        } else {
          setProduct(null);
        }

        if (sellersRes?.data?.data) {
          setSellers(sellersRes.data.data);
        }
        if (relatedRes?.data?.data) {
          setRelated(relatedRes.data.data);
        }
      } catch (err) {
        console.error("Error fetching product details:", err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchProductDetails();
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

      {/* Other Sellers */}
      {sellers.length > 0 && (
        <div className="mt-12 pt-8 border-t border-gray-100">
          <h2 className="text-lg font-black text-gray-900 mb-4">Other Sellers on ADAB</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sellers.map((seller) => (
              <div key={seller.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex justify-between items-center shadow-sm">
                <div>
                  <h4 className="font-bold text-sm text-gray-900">{seller.store_name}</h4>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <Star className="w-3 h-3 text-amber-400 fill-current" />
                    <span>{seller.rating}</span>
                    <span className="mx-1">•</span>
                    <span>₹{seller.price}</span>
                  </div>
                </div>
                <button
                  onClick={() => onAddToCart && onAddToCart(seller.id, product.name)}
                  className="bg-brand-green/10 text-brand-green hover:bg-brand-green hover:text-white transition-colors px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      {product.reviewsList && product.reviewsList.length > 0 && (
        <div className="mt-12 pt-8 border-t border-gray-100">
          <h2 className="text-lg font-black text-gray-900 mb-4">Customer Reviews</h2>
          <div className="space-y-4">
            {product.reviewsList.map((review) => (
              <div key={review.id} className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-gray-900">{review.user}</span>
                  <span className="text-xs text-gray-500">{review.date}</span>
                </div>
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'text-amber-400 fill-current' : 'text-gray-300'}`} />
                  ))}
                </div>
                <p className="text-sm text-gray-700">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related Products */}
      {related.length > 0 && (
        <div className="mt-12 pt-8 border-t border-gray-100 mb-12">
          <h2 className="text-lg font-black text-gray-900 mb-4">You might also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.slice(0, 4).map((rel) => (
              <div key={rel.id} className="group bg-white rounded-2xl border border-gray-100 p-3 hover:shadow-xl transition-all cursor-pointer" onClick={() => navigate(`/product/${rel.id}`)}>
                <div className="aspect-square bg-gray-50 rounded-xl mb-3 overflow-hidden">
                  <img src={rel.image} alt={rel.name} className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform" />
                </div>
                <h4 className="font-bold text-sm text-gray-900 truncate mb-1">{rel.name}</h4>
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                  <Star className="w-3 h-3 text-amber-400 fill-current" />
                  <span>{rel.rating}</span>
                </div>
                <div className="font-black text-gray-900">₹{rel.price}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
