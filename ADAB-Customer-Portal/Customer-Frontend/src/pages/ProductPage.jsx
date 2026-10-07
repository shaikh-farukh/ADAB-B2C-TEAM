import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShoppingCart, Star, ChevronRight, ArrowLeft } from 'lucide-react';

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/catalog/products/${id}`);
        setProduct(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-medium">Loading product...</div>;
  }

  if (error || !product) {
    return <div className="p-8 text-center text-red-500 font-medium">Error loading product: {error}</div>;
  }

  const variant = product.variants ? product.variants[selectedVariant] : null;
  const displayPrice = variant ? variant.price : product.price;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center text-sm text-gray-500 mb-8 space-x-2">
        <button onClick={() => navigate(-1)} className="hover:text-brand-green flex items-center transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </button>
        <span><ChevronRight className="w-4 h-4" /></span>
        <button onClick={() => navigate('/')} className="hover:text-brand-green transition-colors">Home</button>
        <span><ChevronRight className="w-4 h-4" /></span>
        <span className="text-gray-900 font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          
          {/* Images Section */}
          <div className="p-8 bg-gray-50/50">
            <div className="aspect-square rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100 mb-6 relative group">
              <img 
                src={product.images ? product.images[selectedImage] : product.image} 
                alt={product.name} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            {product.images && product.images.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {product.images.map((img, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                      selectedImage === idx ? 'border-brand-green ring-2 ring-brand-green/20' : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="p-8 lg:p-12 flex flex-col">
            <div className="mb-2">
              <span className="inline-block px-3 py-1 bg-brand-light text-brand-green text-xs font-bold rounded-full uppercase tracking-wider mb-4">
                {product.sellerName}
              </span>
              <h1 className="text-3xl font-black text-gray-900 leading-tight mb-4">{product.name}</h1>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-100">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="ml-1.5 font-bold text-yellow-700">{product.rating}</span>
                </div>
                <span className="text-sm text-gray-500 font-medium">{product.reviews || 0} reviews</span>
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded">In Stock</span>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-end gap-3 mb-2">
                <span className="text-4xl font-black text-gray-900">${displayPrice.toFixed(2)}</span>
                {product.mrp > displayPrice && (
                  <span className="text-lg text-gray-400 line-through font-medium mb-1">${product.mrp}</span>
                )}
              </div>
              <p className="text-sm text-gray-500">Inclusive of all taxes</p>
            </div>

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Select Size</h3>
                <div className="flex flex-wrap gap-3">
                  {product.variants.map((v, idx) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(idx)}
                      className={`px-5 py-2.5 rounded-xl border-2 font-bold transition-all ${
                        selectedVariant === idx 
                          ? 'border-brand-green bg-brand-light text-brand-green' 
                          : 'border-gray-200 text-gray-600 hover:border-brand-green/50'
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-auto pt-8 border-t border-gray-100 flex gap-4">
              <button className="flex-1 bg-brand-green hover:bg-green-600 text-white py-4 rounded-2xl font-black text-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-200">
                <ShoppingCart className="w-6 h-6" />
                Add to Cart
              </button>
              <button className="flex-1 bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-black text-lg transition-colors flex items-center justify-center shadow-lg shadow-gray-200">
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Description & Specs */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-xl font-black text-gray-900 mb-4">Product Description</h2>
          <p className="text-gray-600 leading-relaxed font-medium">
            {product.description || "No description available for this product."}
          </p>
        </div>
        
        {product.specs && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-black text-gray-900 mb-4">Specifications</h2>
            <div className="space-y-4">
              {Object.entries(product.specs).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                  <span className="text-gray-500 font-medium capitalize">{key}</span>
                  <span className="text-gray-900 font-bold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
