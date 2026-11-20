import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { sellerApi } from '../api/sellerApi';
import useRestockCart from '../hooks/useRestockCart';
import RestockCartDrawer from '../components/catalog/RestockCartDrawer';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, totalCartons } = useRestockCart();

  const [product, setProduct] = useState(null);
  const [storePincode, setStorePincode] = useState('400001');
  const [storeName, setStoreName] = useState('My Kirana Store');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Carton Stepper & Drawer
  const [cartonQty, setCartonQty] = useState(1);
  const [isRestockCartOpen, setIsRestockCartOpen] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState('pack'); // 'pack' | 'carton' | 'specs'

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 5000);
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await sellerApi.getMasterProductById(id);
      const prod =
        res?.data?.data?.product ||
        res?.data?.product ||
        res?.product;

      const storePin =
        res?.data?.data?.storePincode ||
        res?.data?.storePincode ||
        res?.storePincode;

      if (prod) {
        setProduct(prod);
        if (storePin) {
          setStorePincode(storePin);
        }
      } else {
        setError('Manufacturer product not found');
      }
    } catch (err) {
      console.error('Error fetching product:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, cartonQty);
    showToast(`🛒 Added ${cartonQty} carton(s) of "${product.product_name}" to Wholesale Cart!`);
  };

  const handleBuyNow = () => {
    if (!product) return;
    addToCart(product, cartonQty);
    navigate('/catalog/checkout');
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <i className="fa-solid fa-circle-notch fa-spin text-3xl text-amber-500"></i>
        <p className="text-xs font-bold text-gray-500">Loading verified FMCG product specs...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="card p-12 text-center max-w-lg mx-auto space-y-4 my-12 bg-white rounded-3xl border border-gray-200">
        <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl mx-auto">
          <i className="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h2 className="text-lg font-extrabold text-gray-900">{error || 'Product Not Available'}</h2>
        <p className="text-xs text-gray-500">
          This item may have been unlisted by the brand or is no longer active in the B2B catalog.
        </p>
        <Link to="/catalog" className="btn-primary !text-xs !py-2.5 inline-flex items-center gap-2">
          <i className="fa-solid fa-arrow-left"></i> Back to FMCG Master Catalog
        </Link>
      </div>
    );
  }

  // Pricing & margin metrics
  const mrp = Number(product.printed_mrp) || 0;
  const wholesale = Number(product.wholesale_price) || 0;
  const profitPerUnit = Number(product.profit_per_unit) || Math.max(0, mrp - wholesale);
  const marginPct = product.retailer_margin_pct || (mrp > 0 ? (((mrp - wholesale) / mrp) * 100).toFixed(1) : '20.0');

  const caseSize = Number(product.case_size) || 24;
  const caseWholesale = Number(product.case_wholesale_price) || wholesale * caseSize;
  const caseMrp = Number(product.case_mrp) || mrp * caseSize;
  const caseProfit = Number(product.case_retailer_profit) || Math.max(0, caseMrp - caseWholesale);

  const totalCartonWholesale = caseWholesale * cartonQty;
  const totalCartonProfit = caseProfit * cartonQty;
  const totalUnits = caseSize * cartonQty;

  const isVeg = product.attributes?.dietary_type === '100% Vegetarian' || product.attributes?.dietary_type === 'Veg';
  const isNonVeg = product.attributes?.dietary_type === 'Contains Egg' || product.attributes?.dietary_type === 'Non-Veg';

  return (
    <section className="space-y-6 pb-20 max-w-7xl mx-auto animate-in fade-in duration-200">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl text-xs flex items-center gap-3 animate-in fade-in slide-in-from-top-4 border border-gray-700">
          <i className="fa-solid fa-circle-check text-emerald-400 text-base"></i>
          <span className="font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage('')} className="ml-2 text-gray-400 hover:text-white">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Amazon-Style Breadcrumb Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-gray-100 pb-3">
        <div className="flex items-center gap-1.5 text-gray-500 font-medium overflow-x-auto whitespace-nowrap hide-scroll">
          <Link to="/catalog" className="text-gray-600 hover:text-amber-600 font-semibold transition">
            National FMCG Catalog
          </Link>
          <span className="text-gray-300">›</span>
          <span className="text-gray-600">{product.category_name || 'Personal Care'}</span>
          <span className="text-gray-300">›</span>
          <span className="text-indigo-600 font-bold">{product.brand_name}</span>
          <span className="text-gray-300">›</span>
          <span className="text-gray-900 font-bold truncate max-w-[220px]">{product.product_name}</span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setIsRestockCartOpen(true)}
            className="btn-soft !text-xs flex items-center gap-1.5 cursor-pointer font-bold relative"
          >
            <i className="fa-solid fa-cart-shopping text-indigo-600"></i>
            <span>Wholesale Cart</span>
            {totalCartons > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-black text-[10px]">
                {totalCartons}
              </span>
            )}
          </button>

          <Link to="/partner" className="btn-soft !text-xs flex items-center gap-1.5">
            <i className="fa-solid fa-store"></i>
            <span>B2B Store Orders</span>
          </Link>
        </div>
      </div>

      {/* Main 3-Column Layout: Media | Details & Specs | Amazon Buy Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COLUMN 1: PRODUCT MEDIA GALLERY (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="card p-5 bg-white border border-gray-200 rounded-3xl shadow-xs space-y-4">
            
            {/* Main Stage Image */}
            <div className="aspect-square w-full rounded-2xl overflow-hidden bg-slate-50 border border-gray-100 flex items-center justify-center relative group p-4">
              {product.default_image_url ? (
                <img
                  src={product.default_image_url}
                  alt={product.product_name}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="text-center p-6 text-gray-300">
                  <i className="fa-solid fa-box-open text-6xl mb-2 text-indigo-200"></i>
                  <p className="text-xs text-gray-400 font-bold">Verified Master FMCG Product</p>
                </div>
              )}

              {/* Dietary Indicator */}
              {isVeg && (
                <div className="absolute top-3 left-3 w-6 h-6 border-2 border-emerald-600 rounded bg-white flex items-center justify-center shadow-xs" title="100% Vegetarian">
                  <div className="w-3 h-3 rounded-full bg-emerald-600"></div>
                </div>
              )}
              {isNonVeg && (
                <div className="absolute top-3 left-3 w-6 h-6 border-2 border-red-600 rounded bg-white flex items-center justify-center shadow-xs" title="Non-Veg / Contains Egg">
                  <div className="w-3 h-3 rounded-full bg-red-600"></div>
                </div>
              )}

              {/* Flipkart Assured / Genuine FMCG Badge */}
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-blue-600 text-white font-black text-[10px] tracking-wider uppercase shadow-xs flex items-center gap-1">
                <i className="fa-solid fa-check"></i> ADAB Assured
              </div>
            </div>

            {/* Thumbnail Selector Strip (Amazon Style) */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setActiveMediaTab('pack')}
                className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                  activeMediaTab === 'pack' ? 'border-amber-500 bg-amber-50/30' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-[11px] font-bold text-gray-800">Consumer Pack</div>
                <div className="text-[10px] text-gray-400">1 Unit</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveMediaTab('carton')}
                className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                  activeMediaTab === 'carton' ? 'border-amber-500 bg-amber-50/30' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-[11px] font-bold text-gray-800">Shipper Box</div>
                <div className="text-[10px] text-gray-400">{caseSize} Packs</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveMediaTab('specs')}
                className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                  activeMediaTab === 'specs' ? 'border-amber-500 bg-amber-50/30' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-[11px] font-bold text-gray-800">FSSAI / Barcode</div>
                <div className="text-[10px] text-gray-400">Compliance</div>
              </button>
            </div>

            {/* Barcode & Packaging Quick Specs */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-gray-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-1.5 font-bold">
                  <i className="fa-solid fa-barcode text-gray-700"></i> EAN-13 Barcode:
                </span>
                <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                  {product.barcode || '8901262010057'}
                </span>
              </div>

              <div className="flex items-center justify-between text-gray-500">
                <span>Shipper Packaging:</span>
                <span className="font-bold text-gray-800">{product.packaging_type || 'Corrugated Shipper Carton'}</span>
              </div>

              {product.net_weight && (
                <div className="flex items-center justify-between text-gray-500">
                  <span>Net Content:</span>
                  <span className="font-bold text-gray-800">{product.net_weight} {product.weight_unit || 'g'}</span>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* COLUMN 2: PRODUCT TITLE, PRICING & WHOLESALE DETAILS (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Brand Link & Title */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-indigo-700 hover:underline cursor-pointer">
                Brand: {product.brand_name}
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
              <span className="text-xs text-gray-500 font-medium">{product.category_name}</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug">
              {product.product_name}
            </h1>

            {/* Amazon / Flipkart Style Rating Row */}
            <div className="flex items-center gap-2 text-xs pt-1">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[11px]">
                <span>4.8</span>
                <i className="fa-solid fa-star text-[9px]"></i>
              </div>
              <span className="text-indigo-600 font-medium">1,420 Verified Kirana Orders</span>
              <span className="text-gray-300">|</span>
              <span className="text-emerald-700 font-bold">#1 Top Restocked in {product.category_name || 'Category'}</span>
            </div>
          </div>

          <div className="h-px bg-gray-100"></div>

          {/* AMAZON SIGNATURE PRICE BLOCK */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-2xl sm:text-3xl font-light text-rose-600">
                -{marginPct}%
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-bold text-gray-500 self-start mt-1">₹</span>
                <span className="text-3xl sm:text-4xl font-black text-gray-950 tracking-tight">
                  {wholesale.toFixed(2)}
                </span>
                <span className="text-xs text-gray-500 font-medium">/ {product.standard_unit || 'pack'}</span>
              </div>
            </div>

            <div className="text-xs text-gray-500 space-x-2">
              <span>M.R.P.:</span>
              <span className="line-through font-medium">₹{mrp.toFixed(2)}</span>
              <span className="text-emerald-700 font-bold">
                (You earn ₹{profitPerUnit.toFixed(2)} profit on each pack sold!)
              </span>
            </div>

            <div className="text-[11px] text-gray-400">
              Inclusive of all GST taxes • 100% Input Tax Credit (ITC) compliant
            </div>
          </div>

          {/* WHOLESALE SHIPPER CARTON DEAL BREAKDOWN */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-amber-50/40 border border-amber-200/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-black text-gray-900 border-b border-amber-200/60 pb-2">
              <span className="flex items-center gap-2">
                <i className="fa-solid fa-boxes-packing text-amber-600 text-sm"></i>
                Wholesale Shipper Carton Deal:
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[11px]">
                {caseSize} {product.standard_unit || 'packs'} / carton
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-white border border-gray-200/80">
                <div className="text-[10px] text-gray-400 font-bold uppercase">Carton Cost</div>
                <div className="font-black text-gray-900 text-sm mt-0.5">₹{caseWholesale.toFixed(2)}</div>
              </div>
              <div className="p-2 rounded-xl bg-white border border-gray-200/80">
                <div className="text-[10px] text-gray-400 font-bold uppercase">Retail MRP Value</div>
                <div className="font-black text-gray-900 text-sm mt-0.5">₹{caseMrp.toFixed(2)}</div>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="text-[10px] text-emerald-700 font-bold uppercase">Net Profit</div>
                <div className="font-black text-emerald-700 text-sm mt-0.5">+₹{caseProfit.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* HOW WHOLESALE ORDERING & POS LISTING WORKS (Amazon B2B Banner) */}
          <div className="card p-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl space-y-2.5">
            <div className="text-xs font-black text-indigo-900 flex items-center gap-2">
              <i className="fa-solid fa-circle-nodes text-indigo-600"></i>
              How It Works for Your Kirana Store:
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-600">
              <div className="p-2 bg-white rounded-xl border border-indigo-100/60 space-y-1">
                <div className="font-bold text-gray-900 text-xs">1. Order Cartons</div>
                <p className="text-[10px] text-gray-500 leading-tight">Pay COD, UPI, or 14-day Khata</p>
              </div>
              <div className="p-2 bg-white rounded-xl border border-indigo-100/60 space-y-1">
                <div className="font-bold text-gray-900 text-xs">2. Van Delivers</div>
                <p className="text-[10px] text-gray-500 leading-tight">Local distributor reaches shop</p>
              </div>
              <div className="p-2 bg-white rounded-xl border border-indigo-100/60 space-y-1">
                <div className="font-bold text-emerald-700 text-xs">3. Auto In POS</div>
                <p className="text-[10px] text-gray-500 leading-tight">Scan barcode at counter</p>
              </div>
            </div>
          </div>

          {/* Specifications Table (Amazon Style) */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-700">
              Product Details & Compliance Specs
            </h3>

            <div className="divide-y divide-gray-100 text-xs border-t border-b border-gray-100">
              <div className="py-2 grid grid-cols-3">
                <span className="text-gray-400 font-medium">Manufacturer:</span>
                <span className="col-span-2 font-bold text-gray-800">{product.brand_name} Ltd.</span>
              </div>
              <div className="py-2 grid grid-cols-3">
                <span className="text-gray-400 font-medium">FSSAI License:</span>
                <span className="col-span-2 font-mono font-bold text-gray-800 flex items-center gap-1.5">
                  <i className="fa-solid fa-shield-check text-emerald-600"></i>
                  {product.fssai_license_no || '10012011000145'}
                </span>
              </div>
              <div className="py-2 grid grid-cols-3">
                <span className="text-gray-400 font-medium">Shelf Life:</span>
                <span className="col-span-2 font-bold text-gray-800">
                  {product.shelf_life_days ? `${product.shelf_life_days} Days from Mfg` : '180 Days'}
                </span>
              </div>
              <div className="py-2 grid grid-cols-3">
                <span className="text-gray-400 font-medium">Storage:</span>
                <span className="col-span-2 font-bold text-gray-800">{product.storage_condition || 'Ambient (Dry & Cool)'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* COLUMN 3: THE FAMOUS AMAZON BUY BOX (3 cols) */}
        <div className="lg:col-span-3 space-y-4 sticky top-6">
          <div className="card p-5 bg-white border-2 border-amber-300 rounded-3xl shadow-xl space-y-4">
            
            {/* Price in Buy Box */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-bold text-gray-500">₹</span>
                <span className="text-2xl font-black text-gray-950">
                  {totalCartonWholesale.toFixed(2)}
                </span>
                <span className="text-xs text-gray-400 font-normal">
                  ({cartonQty} {cartonQty === 1 ? 'Carton' : 'Cartons'})
                </span>
              </div>

              <div className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                <i className="fa-solid fa-truck-fast text-emerald-600"></i>
                <span>FREE Delivery by Local Distributor</span>
              </div>
            </div>

            {/* Delivery Location & SLA */}
            <div className="text-xs space-y-1 pt-2 border-t border-gray-100 text-gray-600">
              <div className="flex items-center gap-1 font-bold text-gray-900">
                <i className="fa-solid fa-location-dot text-indigo-600"></i>
                <span>Delivering to Pincode {storePincode}</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Order now. Local van delivery arrives <strong>Tomorrow by 11:00 AM</strong>.
              </p>
            </div>

            {/* Stock Availability */}
            <div className="space-y-1">
              <div className="text-sm font-extrabold text-emerald-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>In Stock at Local Depot</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Shipped and fulfilled by <strong>{product.distributor_name || 'Apex City Stockists'}</strong>.
              </p>
            </div>

            {/* Quantity Stepper (Cartons) */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-bold text-gray-700">
                Carton Quantity:
              </label>
              <div className="flex items-center justify-between border border-gray-300 rounded-xl bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setCartonQty(Math.max(1, cartonQty - 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-100 flex items-center justify-center transition cursor-pointer"
                >
                  -
                </button>
                <div className="text-center font-black text-xs text-gray-900">
                  {cartonQty} {cartonQty === 1 ? 'Carton' : 'Cartons'} ({totalUnits} pcs)
                </div>
                <button
                  type="button"
                  onClick={() => setCartonQty(cartonQty + 1)}
                  className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-100 flex items-center justify-center transition cursor-pointer"
                >
                  +
                </button>
              </div>

              <div className="flex justify-between text-[11px] text-gray-500 pt-1">
                <span>Profit:</span>
                <span className="font-black text-emerald-700">+₹{totalCartonProfit.toFixed(2)}</span>
              </div>
            </div>

            {/* AMAZON YELLOW & ORANGE BUTTONS */}
            <div className="space-y-2.5 pt-2">
              {/* Button 1: Add to Cart (Amazon Yellow) */}
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full py-3 px-4 rounded-full bg-gradient-to-b from-amber-300 to-amber-400 hover:from-amber-400 hover:to-amber-500 text-gray-950 font-black text-xs uppercase tracking-wider transition-all shadow-sm active:scale-[0.99] cursor-pointer border border-amber-500 flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-cart-shopping"></i>
                <span>Add to Wholesale Cart</span>
              </button>

              {/* Button 2: Buy Cartons / Restock Cartons (Amazon Orange) */}
              <button
                type="button"
                onClick={handleBuyNow}
                className="w-full py-3 px-4 rounded-full bg-gradient-to-b from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer border border-orange-600 flex items-center justify-center gap-2 shadow-orange-500/20"
              >
                <i className={`fa-solid ${product.already_in_store ? 'fa-rotate' : 'fa-bolt'}`}></i>
                <span>{product.already_in_store ? 'Restock Cartons (Proceed to Pay)' : 'Buy Cartons (Proceed to Pay)'}</span>
              </button>
            </div>

            {/* Status if already in store vs new */}
            {product.already_in_store ? (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-bold flex items-center gap-1.5 justify-center">
                <i className="fa-solid fa-circle-check text-emerald-600"></i>
                <span>Active in your Store POS Inventory</span>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-800 font-bold flex items-center gap-1.5 justify-center">
                <i className="fa-solid fa-sparkles text-blue-600"></i>
                <span>New Product: Order first carton for your store</span>
              </div>
            )}

            {/* Security Guarantee */}
            <div className="pt-2 text-[11px] text-gray-400 space-y-1 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-gray-600 font-bold">
                <i className="fa-solid fa-lock text-indigo-600"></i>
                <span>Secure B2B Transaction</span>
              </div>
              <p className="text-[10px]">
                Payment only after physical carton inspection upon delivery van arrival.
              </p>
            </div>

          </div>
        </div>

      </div>

      {/* Restock Cart Side Drawer */}
      <RestockCartDrawer
        isOpen={isRestockCartOpen}
        onClose={() => setIsRestockCartOpen(false)}
        onOrderPlaced={() => fetchProduct()}
      />

    </section>
  );
}
