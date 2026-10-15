import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import { ShoppingCart, Star, ChevronRight, ArrowLeft, ShieldCheck, Truck, RotateCcw, Award, CheckCircle2, ChevronDown, ChevronUp, Store } from 'lucide-react';

export default function ProductDetailPage({ onAddToCart, onToggleWishlist, wishlist }) {
  const location = useLocation();
  const id = location.pathname.split('/')[2];
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [sellers, setSellers] = useState([]);
  const [related, setRelated] = useState([]);
  const [frequentlyBought, setFrequentlyBought] = useState(null);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [addedBundleSuccess, setAddedBundleSuccess] = useState(false);
  
  // Review filters & state
  const [reviewFilter, setReviewFilter] = useState('ALL'); // 'ALL' | 5 | 4 | 'VERIFIED'
  const [expandedSection, setExpandedSection] = useState({ specs: true, seller: true, returns: true });

  useEffect(() => {
    let isCurrent = true;

    const fetchProductDetails = async () => {
      try {
        setLoading(true);
        setErrorStatus(null);

        const fetchPromise = Promise.all([
          api.get(`/catalog/products/${id}`),
          api.get(`/catalog/products/${id}/sellers`).catch(() => ({ data: { data: [] } })),
          api.get(`/catalog/products/${id}/related`).catch(() => ({ data: { data: [] } })),
          api.get(`/catalog/products/${id}/frequently-bought-together`).catch(() => ({ data: { data: null } })),
          api.get(`/customers/me/recently-viewed`).catch(() => ({ data: { data: [] } }))
        ]);

        // Record recently viewed product in background
        api.post('/customers/me/recently-viewed', { productId: id }).catch(() => {});

        const [productRes, sellersRes, relatedRes, freqRes, recentRes] = await fetchPromise;
        if (!isCurrent) return;

        if (productRes.data.success && productRes.data.data) {
          const fetchedProduct = productRes.data.data;
          setProduct({
            ...fetchedProduct,
            images: fetchedProduct.images && fetchedProduct.images.length > 0 ? fetchedProduct.images : [fetchedProduct.image],
            deliveryEstimate: fetchedProduct.deliveryEstimate || 'Tomorrow, by 10 AM',
            returnPolicy: fetchedProduct.returnPolicy || '7 Days Returnable',
            variants: fetchedProduct.variants || [
              { id: 1, name: 'Standard', price: fetchedProduct.price }
            ],
            reviewsList: fetchedProduct.reviewsList || [
              { id: 'rev-1', user: "Alex M.", rating: 5, title: "Superb Freshness", comment: "Excellent quality and fast delivery!", date: "2 days ago", is_verified: true },
              { id: 'rev-2', user: "Sarah J.", rating: 4, title: "Worth the price", comment: "Good product, exactly as described.", date: "1 week ago", is_verified: true }
            ]
          });
        } else {
          setProduct(null);
          setErrorStatus(404);
        }

        if (sellersRes?.data?.data) {
          setSellers(sellersRes.data.data);
        }
        if (relatedRes?.data?.data) {
          setRelated(relatedRes.data.data);
        }
        if (freqRes?.data?.data) {
          setFrequentlyBought(freqRes.data.data);
        }
        if (recentRes?.data?.data && Array.isArray(recentRes.data.data)) {
          setRecentlyViewed(recentRes.data.data.filter(p => p.id !== id));
        }
      } catch (err) {
        console.error("Error fetching product details:", err);
        setProduct(null);
        setErrorStatus(err.response?.status || 500);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchProductDetails();
    }
    return () => {
      isCurrent = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="animate-pulse p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="w-full aspect-square bg-gray-200 rounded-3xl"></div>
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="h-14 bg-gray-200 rounded w-full"></div>
            <div className="h-28 bg-gray-200 rounded-2xl w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // Graceful state for Suspended, Unapproved or Not Found Product
  if (!product || errorStatus) {
    return (
      <div className="py-20 px-4 max-w-xl mx-auto text-center animate-fade-in">
        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <Store className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Product Currently Unavailable</h2>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          This seller listing may have been suspended, updated, or is undergoing quality verification on the ADAB marketplace.
        </p>
        <div className="flex justify-center gap-3">
          <button 
            onClick={() => navigate('/browse')}
            className="px-5 py-2.5 bg-brand-green text-white font-bold text-sm rounded-xl hover:bg-green-700 transition cursor-pointer"
          >
            Explore Available Catalog
          </button>
          <button 
            onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-200 transition cursor-pointer"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const isWishlisted = wishlist?.includes(product.id);
  const variant = Array.isArray(product.variants) && product.variants.length > 0 ? product.variants[selectedVariant] : null;
  const displayPrice = variant && typeof variant === 'object' && variant.price !== undefined ? variant.price : product.price;

  // Review Rating Stats Calculation
  const totalReviews = product.reviewsList?.length || 0;
  const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  if (product.reviewsList) {
    product.reviewsList.forEach(r => {
      const score = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
      ratingDistribution[score] = (ratingDistribution[score] || 0) + 1;
    });
  }

  const filteredReviews = (product.reviewsList || []).filter(r => {
    if (reviewFilter === 'ALL') return true;
    if (reviewFilter === 'VERIFIED') return r.is_verified;
    return Math.round(r.rating) === reviewFilter;
  });

  const toggleAccordion = (key) => {
    setExpandedSection(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-24 md:pb-12 animate-fade-in">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center text-xs text-gray-500 space-x-2">
        <button onClick={() => navigate(-1)} className="hover:text-brand-green flex items-center transition-colors font-bold cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
        </button>
        <span><ChevronRight className="w-3.5 h-3.5" /></span>
        <button onClick={() => navigate('/')} className="hover:text-brand-green transition-colors cursor-pointer">Home</button>
        <span><ChevronRight className="w-3.5 h-3.5" /></span>
        <button onClick={() => navigate('/browse')} className="hover:text-brand-green transition-colors cursor-pointer">Catalog</button>
        <span><ChevronRight className="w-3.5 h-3.5" /></span>
        <span className="text-gray-900 font-bold truncate max-w-[220px]">{product.name}</span>
      </nav>

      {/* Main Grid: Gallery + Primary Details */}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Left: Image Gallery (Mobile Touch Optimized + Desktop Thumbs) */}
        <div className="w-full md:w-1/2">
          <div className="bg-gray-50 rounded-3xl overflow-hidden aspect-square relative group border border-gray-100 flex items-center justify-center p-6">
            <img 
              src={product.images && product.images[selectedImage] ? product.images[selectedImage] : product.image} 
              alt={product.name} 
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" 
            />
            <button 
              onClick={() => onToggleWishlist && onToggleWishlist(product.id)}
              aria-label="Wishlist"
              className="absolute top-4 right-4 w-11 h-11 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md text-brand-coral hover:bg-white hover:scale-110 active:scale-95 transition-all cursor-pointer z-10"
            >
              <i className={`fa-regular fa-heart text-xl ${isWishlisted ? 'fa-solid text-red-500' : ''}`}></i>
            </button>
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur text-white text-[10px] font-bold px-2.5 py-1 rounded-full md:hidden">
              {selectedImage + 1} / {product.images?.length || 1}
            </div>
          </div>

          {/* Multiple Image Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto mt-4 pb-2 scrollbar-hide">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-16 h-16 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all p-1 bg-white cursor-pointer ${
                    selectedImage === idx ? 'border-brand-green ring-2 ring-brand-green/20 scale-105' : 'border-gray-200 hover:border-gray-400 opacity-80 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Buy Box */}
        <div className="w-full md:w-1/2 flex flex-col pt-1">
          {/* Seller Header & Rating Badge */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span 
              onClick={() => product.store_id && navigate(`/stores?store_id=${product.store_id}`)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-brand-green text-xs font-bold rounded-full uppercase tracking-wider border border-green-200 ${product.store_id ? 'hover:underline cursor-pointer' : ''}`}
            >
              <Store className="w-3 h-3" />
              {product.sellerName}
            </span>
            <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              ADAB Verified Listing
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-3">
            {product.name}
          </h1>
          
          {/* Rating Summary Bar */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center gap-1 bg-amber-50 text-amber-900 px-2.5 py-1 rounded-lg text-xs font-extrabold border border-amber-200">
              <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
              <span>{product.rating}</span>
            </div>
            <a href="#reviews-section" className="text-gray-500 hover:text-brand-green text-xs font-semibold underline transition">
              {totalReviews} verified {totalReviews === 1 ? 'review' : 'reviews'}
            </a>
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
            {product.stock_qty !== undefined && product.stock_qty <= 0 ? (
              <span className="text-xs font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                Out of Stock
              </span>
            ) : product.stock_qty !== undefined && product.stock_qty <= 10 ? (
              <span className="text-xs font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Only {product.stock_qty} left — order soon!
              </span>
            ) : (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                In Stock ({product.stock_qty || 'Available'}) & Ready to Ship
              </span>
            )}
          </div>

          {/* Pricing Details */}
          <div className="flex items-end gap-3 mb-6">
            <span className="text-3xl font-black text-gray-900">₹{displayPrice}</span>
            {product.mrp > displayPrice && (
              <>
                <span className="text-lg text-gray-400 line-through font-bold mb-0.5">₹{product.mrp}</span>
                <span className="text-xs font-extrabold text-brand-coral bg-rose-50 px-2.5 py-1 rounded-md mb-1 border border-rose-100">
                  {Math.round(((product.mrp - displayPrice) / product.mrp) * 100)}% OFF
                </span>
              </>
            )}
          </div>

          <div className="h-px bg-gray-100 w-full mb-6"></div>

          {/* Variants Selector */}
          {product.variants && product.variants.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2.5">
                Select Option / Pack
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {product.variants.map((v, i) => {
                  const label = typeof v === 'object' ? v.name : v;
                  const isSelected = selectedVariant === i;
                  return (
                    <button 
                      key={i} 
                      onClick={() => setSelectedVariant(i)}
                      className={`px-4 py-2.5 border-2 font-bold text-xs rounded-xl transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-brand-green text-brand-green bg-green-50 shadow-sm' 
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex gap-3 mb-6">
            {product.stock_qty !== undefined && product.stock_qty <= 0 ? (
              <button 
                type="button"
                disabled
                className="w-full bg-gray-200 text-gray-500 font-extrabold text-base rounded-2xl py-3.5 cursor-not-allowed text-center"
              >
                Out of Stock
              </button>
            ) : (
              <>
                <button 
                  type="button"
                  onClick={() => onAddToCart && onAddToCart(product.id, product.name)}
                  className="flex-1 bg-brand-green hover:bg-green-700 text-white font-extrabold text-base rounded-2xl py-3.5 shadow-lg shadow-brand-green/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                  className="flex-1 bg-gray-900 hover:bg-black text-white font-extrabold text-base rounded-2xl py-3.5 shadow-lg shadow-gray-900/10 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Buy Now
                </button>
              </>
            )}
          </div>

          {/* Transparency: Delivery & Return Commitments */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-3 mb-6 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-brand-green shadow-sm shrink-0 border border-gray-100">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide">Delivery Time</p>
                <p className="font-bold text-xs text-gray-900">{product.deliveryEstimate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-brand-green shadow-sm shrink-0 border border-gray-100">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide">Return & Replacement</p>
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

          {/* Collapsible Accordions: Specs */}
          {product.specs && typeof product.specs === 'object' && (
            <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
              <button
                onClick={() => toggleAccordion('specs')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 text-left font-bold text-xs text-gray-800 cursor-pointer"
              >
                <span>Product Specifications</span>
                {expandedSection.specs ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </button>
              {expandedSection.specs && (
                <div className="p-4 bg-white space-y-2 text-xs">
                  {Object.entries(product.specs).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-gray-500 capitalize">{k}</span>
                      <span className="font-bold text-gray-900">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pillar 2: Multi-Seller Offers Display */}
      {sellers.length > 0 && (
        <div className="pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-gray-900">Compare Seller Offers</h2>
              <p className="text-xs text-gray-500">Other verified stores selling this product with fast delivery</p>
            </div>
            <span className="text-xs font-bold bg-green-50 text-brand-green px-2.5 py-1 rounded-full border border-green-200">
              {sellers.length} {sellers.length === 1 ? 'Seller Available' : 'Sellers Available'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sellers.map((seller) => (
              <div key={seller.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-sm hover:border-brand-green/30 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 
                      onClick={() => seller.store_id && navigate(`/stores?store_id=${seller.store_id}`)}
                      className={`font-extrabold text-sm text-gray-900 ${seller.store_id ? 'hover:text-brand-green hover:underline cursor-pointer' : ''}`}
                    >
                      {seller.store_name}
                    </h4>
                    <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-800 px-2 py-0.5 rounded text-[10px] font-extrabold">
                      <Star className="w-3 h-3 text-amber-400 fill-current" />
                      {seller.rating}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 flex items-center gap-2">
                    <span className="font-black text-gray-900 text-sm">₹{seller.price}</span>
                    {seller.mrp > seller.price && (
                      <span className="text-gray-400 line-through text-[11px]">₹{seller.mrp}</span>
                    )}
                    <span className="text-gray-400">•</span>
                    <span>{seller.delivery_estimate}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 flex items-center gap-1">
                    <RotateCcw className="w-3 h-3 text-gray-400" />
                    <span>{seller.return_policy || 'Standard Returns'}</span>
                  </div>
                </div>

                <button
                  onClick={() => onAddToCart && onAddToCart(seller.id, product.name)}
                  className="bg-brand-green/10 text-brand-green hover:bg-brand-green hover:text-white transition-colors px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Buy from Seller
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Frequently Bought Together Bundle */}
      {frequentlyBought && frequentlyBought.bundleItems && frequentlyBought.bundleItems.length > 0 && (
        <div className="pt-6 border-t border-gray-100">
          <div className="bg-gradient-to-br from-emerald-50/70 via-white to-gray-50 border border-emerald-200/80 rounded-3xl p-5 md:p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                    Combo Savings
                  </span>
                  <h3 className="text-lg font-black text-gray-900">Frequently Bought Together</h3>
                </div>
                <p className="text-xs text-gray-500">
                  Customers frequently combine this item with these local essentials for additional combo savings
                </p>

                {/* Bundle Item Previews Connected with + sign */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {/* Main Product */}
                  <div className="flex items-center gap-2.5 bg-white border border-gray-200/90 rounded-2xl p-2.5 pr-3.5 shadow-2xs">
                    <img src={product.image} alt={product.name} className="w-12 h-12 object-contain rounded-xl bg-gray-50" />
                    <div>
                      <div className="text-[10px] font-extrabold text-emerald-700 uppercase">This Item</div>
                      <div className="text-xs font-bold text-gray-900 truncate max-w-[130px]">{product.name}</div>
                      <div className="text-xs font-black text-gray-900">₹{product.price}</div>
                    </div>
                  </div>

                  {frequentlyBought.bundleItems.map((item) => (
                    <React.Fragment key={item.id}>
                      <span className="text-emerald-700 font-black text-lg">+</span>
                      <div className="flex items-center gap-2.5 bg-white border border-gray-200/90 rounded-2xl p-2.5 pr-3.5 shadow-2xs">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-black text-sm shrink-0">
                          <ShoppingCart className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-[10px] font-extrabold text-gray-400 uppercase">Addon</div>
                          <div className="text-xs font-bold text-gray-900 truncate max-w-[130px]">{item.name}</div>
                          <div className="text-xs font-black text-gray-900">₹{item.price}</div>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Bundle Checkout Box */}
              <div className="bg-white border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-center gap-3 min-w-[240px] shadow-sm">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase">Bundle Total</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-gray-900">₹{frequentlyBought.comboPrice}</span>
                    <span className="text-xs text-gray-400 line-through">₹{frequentlyBought.regularTotal}</span>
                  </div>
                  {frequentlyBought.savings > 0 && (
                    <div className="text-[11px] font-extrabold text-emerald-700 mt-0.5">
                      Save ₹{frequentlyBought.savings} (5% Instant Combo Discount)
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onAddToCart && product) {
                      onAddToCart(product.id, product.name);
                      if (Array.isArray(frequentlyBought.bundleItems)) {
                        frequentlyBought.bundleItems.forEach(b => onAddToCart(b.id, b.name));
                      }
                      setAddedBundleSuccess(true);
                      setTimeout(() => setAddedBundleSuccess(false), 3000);
                    }
                  }}
                  className={`py-3 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                    addedBundleSuccess
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-800 hover:bg-emerald-900 text-white'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{addedBundleSuccess ? 'Added Combo to Cart! ✓' : 'Add Both / All to Cart'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pillar 1: Product Review Display & Analytics Breakdown */}
      <div id="reviews-section" className="pt-6 border-t border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-black text-gray-900">Customer Reviews & Ratings</h2>
            <p className="text-xs text-gray-500">Verified purchases from authentic ADAB customers</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Filter:</span>
            {['ALL', 5, 4, 'VERIFIED'].map((f) => (
              <button
                key={f}
                onClick={() => setReviewFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  reviewFilter === f
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'ALL' ? 'All Reviews' : f === 'VERIFIED' ? 'Verified Only' : `${f}★`}
              </button>
            ))}
          </div>
        </div>

        {/* Rating Analytics Summary */}
        <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 mb-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Big Score */}
          <div className="text-center md:text-left md:border-r border-gray-200 pr-6">
            <div className="text-4xl md:text-5xl font-black text-gray-900 mb-1">
              {product.rating}
              <span className="text-xl text-gray-400 font-normal"> / 5</span>
            </div>
            <div className="flex justify-center md:justify-start items-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.round(product.rating)
                      ? 'text-amber-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 font-medium">Based on {totalReviews} ratings</p>
          </div>

          {/* Star Distribution Breakdown */}
          <div className="space-y-2 col-span-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingDistribution[stars] || 0;
              const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
              return (
                <div key={stars} className="flex items-center gap-3 text-xs">
                  <span className="w-8 font-bold text-gray-600">{stars} ★</span>
                  <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                  <span className="w-10 text-right text-gray-500 font-semibold">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reviews List or Meaningful Empty State */}
        {filteredReviews.length > 0 ? (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <div key={review.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 text-brand-green font-bold text-xs flex items-center justify-center">
                      {review.user ? review.user.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-gray-900 block leading-tight">{review.user}</span>
                      {review.is_verified && (
                        <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          Verified Purchase
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{review.date}</span>
                </div>

                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < review.rating ? 'text-amber-400 fill-current' : 'text-gray-200'
                      }`}
                    />
                  ))}
                  {review.title && (
                    <span className="ml-2 font-bold text-xs text-gray-900">{review.title}</span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">{review.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 bg-white rounded-2xl border border-gray-100 text-center space-y-2">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-400">
              <Award className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-gray-900">No reviews found for this filter</h4>
            <p className="text-xs text-gray-500">Try selecting "All Reviews" to see full community feedback.</p>
          </div>
        )}
      </div>

      {/* Related Products Recommendation */}
      {related.length > 0 && (
        <div className="pt-8 border-t border-gray-100">
          <h2 className="text-lg font-black text-gray-900 mb-4">You might also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.slice(0, 4).map((rel) => (
              <div 
                key={rel.id} 
                className="group bg-white rounded-2xl border border-gray-100 p-3 hover:shadow-xl transition-all cursor-pointer"
                onClick={() => {
                  navigate(`/product/${rel.id}`);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <div className="aspect-square bg-gray-50 rounded-xl mb-3 overflow-hidden flex items-center justify-center">
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

      {/* Recently Viewed Products */}
      {recentlyViewed.length > 0 && (
        <div className="pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-gray-900">Recently Viewed</h2>
              <p className="text-xs text-gray-500">Pick up where you left off</p>
            </div>
            <button
              onClick={() => navigate('/browse')}
              className="text-xs font-bold text-brand-green hover:underline cursor-pointer"
            >
              Browse Catalog →
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {recentlyViewed.slice(0, 4).map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  navigate(`/product/${item.id}`);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-white border border-gray-100 rounded-2xl p-3.5 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="aspect-square bg-gray-50 rounded-xl mb-2 flex items-center justify-center p-2 overflow-hidden">
                  <img
                    src={item.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80'}
                    alt={item.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-gray-900 truncate mb-1">{item.name}</h4>
                  <div className="font-black text-sm text-gray-900">₹{item.price}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pillar 5: Mobile Fixed Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 p-3 px-4 flex items-center justify-between gap-3 md:hidden z-40 shadow-2xl">
        <div>
          <div className="text-[10px] text-gray-500 font-bold uppercase">Total Price</div>
          <div className="text-lg font-black text-gray-900 leading-tight">₹{displayPrice}</div>
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-[240px]">
          {product.stock_qty !== undefined && product.stock_qty <= 0 ? (
            <button
              type="button"
              disabled
              className="w-full bg-gray-200 text-gray-500 font-extrabold text-xs py-3 px-3 rounded-xl cursor-not-allowed text-center"
            >
              Out of Stock
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onAddToCart && onAddToCart(product.id, product.name)}
                className="flex-1 bg-brand-green text-white font-extrabold text-xs py-3 px-3 rounded-xl flex items-center justify-center gap-1 active:scale-95 shadow-md shadow-brand-green/20"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onAddToCart) onAddToCart(product.id, product.name);
                  navigate('/checkout');
                }}
                className="flex-1 bg-gray-900 text-white font-extrabold text-xs py-3 px-3 rounded-xl flex items-center justify-center active:scale-95 shadow-md shadow-black/10"
              >
                Buy Now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
