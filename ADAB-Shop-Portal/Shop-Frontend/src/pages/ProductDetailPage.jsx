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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Carton Stepper
  const [cartonQty, setCartonQty] = useState(1);
  const [isRestockCartOpen, setIsRestockCartOpen] = useState(false);

  // Adoption Modal State
  const [isAdoptModalOpen, setIsAdoptModalOpen] = useState(false);
  const [customSellPrice, setCustomSellPrice] = useState('');
  const [customStock, setCustomStock] = useState('20');
  const [isAdopting, setIsAdopting] = useState(false);

  // Quick Order State
  const [isQuickOrdering, setIsQuickOrdering] = useState(false);
  const [quickOrderSuccess, setQuickOrderSuccess] = useState(null);

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
        setCustomSellPrice(prod.printed_mrp ? Number(prod.printed_mrp).toString() : '50');
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

  const handleConfirmAdopt = async (e) => {
    e.preventDefault();
    if (!product) return;

    try {
      setIsAdopting(true);
      const res = await sellerApi.adoptMasterCatalogItem({
        masterCatalogId: product.id,
        sellPrice: Number(customSellPrice),
        stockQty: Number(customStock)
      });

      if (res?.success || res?.data?.success) {
        setIsAdoptModalOpen(false);
        setProduct((prev) => ({ ...prev, already_in_store: true }));
        showToast(`🎉 "${product.product_name}" is now live on your store POS & inventory!`);
      }
    } catch (err) {
      console.error('Adoption error:', err);
      showToast('Error adding product to store: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsAdopting(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, cartonQty);
    showToast(`🛒 Added ${cartonQty} carton(s) of "${product.product_name}" to Restock Cart!`);
  };

  const handleQuickOrder = async () => {
    if (!product) return;
    setIsQuickOrdering(true);
    try {
      const res = await sellerApi.orderRestockCases({
        masterCatalogId: product.id,
        orderedCases: cartonQty,
        notes: `Quick 1-click restock from product detail page`
      });

      if (res?.success || res?.data?.success) {
        const orderData = res?.data?.data || res?.data;
        setQuickOrderSuccess(orderData);
      }
    } catch (err) {
      console.error('Quick order error:', err);
      showToast('Error placing order: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsQuickOrdering(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <i className="fa-solid fa-circle-notch fa-spin text-3xl text-indigo-600"></i>
        <p className="text-xs font-bold text-gray-500">Loading verified manufacturer product specs...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="card p-12 text-center max-w-lg mx-auto space-y-4">
        <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl mx-auto">
          <i className="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h2 className="text-lg font-extrabold text-gray-900">{error || 'Product Not Available'}</h2>
        <p className="text-xs text-gray-500">
          This item may have been unlisted by the manufacturer or is no longer active in the B2B catalog.
        </p>
        <Link to="/catalog" className="btn-primary !text-xs !py-2.5 inline-flex items-center gap-2">
          <i className="fa-solid fa-arrow-left"></i> Back to FMCG Catalog
        </Link>
      </div>
    );
  }

  const mrp = Number(product.printed_mrp) || 0;
  const wholesale = Number(product.wholesale_price) || 0;
  const profitPerUnit = Number(product.profit_per_unit) || Math.max(0, mrp - wholesale);
  const marginPct = product.retailer_margin_pct || (mrp > 0 ? (((mrp - wholesale) / mrp) * 100).toFixed(1) : '0.0');

  const caseSize = Number(product.case_size) || 1;
  const caseWholesale = Number(product.case_wholesale_price) || wholesale * caseSize;
  const caseMrp = Number(product.case_mrp) || mrp * caseSize;
  const caseProfit = Number(product.case_retailer_profit) || Math.max(0, caseMrp - caseWholesale);

  const totalCartonWholesale = caseWholesale * cartonQty;
  const totalCartonProfit = caseProfit * cartonQty;
  const totalUnits = caseSize * cartonQty;

  const isVeg = product.attributes?.dietary_type === '100% Vegetarian' || product.attributes?.dietary_type === 'Veg';
  const isNonVeg = product.attributes?.dietary_type === 'Contains Egg' || product.attributes?.dietary_type === 'Non-Veg';

  return (
    <section className="space-y-6 pb-20 relative animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-2xl text-xs flex items-center gap-3 animate-in fade-in slide-in-from-top-4 border border-gray-700">
          <i className="fa-solid fa-circle-check text-emerald-400 text-sm"></i>
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage('')} className="ml-2 text-gray-400 hover:text-white">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Top Breadcrumb & Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
            <Link to="/catalog" className="hover:text-indigo-600 transition flex items-center gap-1">
              <i className="fa-solid fa-arrow-left text-[10px]"></i> FMCG Catalog
            </Link>
            <span>/</span>
            <span className="text-gray-500">{product.category_name}</span>
            {product.sub_category && (
              <>
                <span>/</span>
                <span className="text-gray-500">{product.sub_category}</span>
              </>
            )}
            <span>/</span>
            <span className="text-gray-900 font-bold truncate max-w-[200px]">{product.product_name}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              {product.product_name}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              📍 Delivering to Pincode: {storePincode}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Cart Button */}
          <button
            type="button"
            onClick={() => setIsRestockCartOpen(true)}
            className="btn-soft !text-xs flex items-center gap-1.5 relative cursor-pointer"
          >
            <i className="fa-solid fa-boxes-stacked text-indigo-600"></i>
            <span>Restock Cart</span>
            {totalCartons > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white font-black text-[10px] animate-pulse">
                {totalCartons}
              </span>
            )}
          </button>

          <Link to="/products" className="btn-soft !text-xs flex items-center gap-1.5">
            <i className="fa-solid fa-store"></i> My Store
          </Link>
        </div>
      </div>

      {/* Main 3-Column Amazon-Style Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Column 1: Image & Barcode Visuals (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="card p-4 space-y-3 bg-white border border-gray-200">
            <div className="aspect-square w-full rounded-2xl overflow-hidden bg-slate-50 border border-gray-100 flex items-center justify-center relative group">
              {product.default_image_url ? (
                <img
                  src={product.default_image_url}
                  alt={product.product_name}
                  className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="text-center p-6 text-gray-300">
                  <i className="fa-solid fa-box-open text-5xl mb-2"></i>
                  <p className="text-xs text-gray-400">Verified FMCG Master Item</p>
                </div>
              )}

              {/* Veg / Non-Veg Indicator */}
              {isVeg && (
                <div className="absolute top-3 left-3 w-5 h-5 border-2 border-emerald-600 rounded bg-white flex items-center justify-center" title="100% Vegetarian">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-600"></div>
                </div>
              )}
              {isNonVeg && (
                <div className="absolute top-3 left-3 w-5 h-5 border-2 border-red-600 rounded bg-white flex items-center justify-center" title="Contains Non-Veg / Egg">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-600"></div>
                </div>
              )}
            </div>

            {/* Barcode & Packaging Pill */}
            <div className="p-3 rounded-xl bg-slate-50 border border-gray-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-gray-500">
                <span className="flex items-center gap-1.5 font-bold">
                  <i className="fa-solid fa-barcode text-gray-700"></i> EAN-13 Barcode:
                </span>
                <span className="font-mono font-bold text-gray-900">{product.barcode || 'Standard Item'}</span>
              </div>
              <div className="flex items-center justify-between text-gray-500">
                <span>Shipper Packaging:</span>
                <span className="font-bold text-gray-800">{product.packaging_type || 'Shipper Carton'}</span>
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

        {/* Column 2: Specs, Description, FSSAI & Dynamic Attributes (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Brand & Title Card */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-wider border border-indigo-100">
                {product.brand_name}
              </span>
              <span className="text-xs text-gray-500 font-medium">
                {product.category_name}
              </span>
            </div>

            <h2 className="text-lg font-extrabold text-gray-900 leading-snug">
              {product.product_name}
            </h2>

            <p className="text-xs text-gray-600 leading-relaxed">
              {product.description || 'Verified authentic manufacturer production item. Fully compliant with FMCG packaging and retailer margin distribution.'}
            </p>
          </div>

          {/* Food Safety, FSSAI & Storage Compliance */}
          <div className="card p-5 space-y-3 border border-emerald-100 bg-emerald-50/30">
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
              <i className="fa-solid fa-shield-check text-emerald-600"></i> Compliance & Storage Specs
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-emerald-100">
                <span className="text-gray-600 font-medium">FSSAI License:</span>
                <span className="font-mono font-bold text-gray-900 flex items-center gap-1">
                  <i className="fa-solid fa-circle-check text-emerald-500 text-[10px]"></i>
                  {product.fssai_license_no || '10012011000145'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-emerald-100">
                <span className="text-gray-600 font-medium">Shelf Life:</span>
                <span className="font-bold text-gray-800">
                  {product.shelf_life_days ? `${product.shelf_life_days} Days from Mfg` : '180 Days'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-600 font-medium">Storage Condition:</span>
                <span className="font-bold text-indigo-700 flex items-center gap-1">
                  <i className="fa-solid fa-temperature-half"></i> {product.storage_condition || 'Ambient'}
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Specifications (JSONB) */}
          {product.attributes && Object.keys(product.attributes).length > 0 && (
            <div className="card p-5 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <i className="fa-solid fa-sparkles text-amber-500"></i> Category Specifications
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(product.attributes).map(([key, val]) => (
                  <div key={key} className="p-2.5 rounded-xl bg-slate-50 border border-gray-100">
                    <div className="text-[10px] text-gray-400 font-bold uppercase truncate">
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div className="font-extrabold text-gray-900 truncate mt-0.5">
                      {String(val)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Column 3: The Kirana Profit Card & Action Center (4 cols) */}
        <div className="lg:col-span-4 space-y-4 sticky top-6">
          <div className="card p-5 space-y-4 bg-white border-2 border-indigo-100 shadow-md">
            
            {/* Profit Margin Hero Box */}
            <div className="p-3.5 rounded-2xl bg-indigo-600 text-white space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-xs text-indigo-100">
                <span>Retail Printed MRP:</span>
                <span className="font-extrabold line-through text-indigo-200">₹{mrp.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-100">Your Wholesale Cost:</span>
                <span className="text-lg font-black text-white">₹{wholesale.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-indigo-400/50 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-200">Your Store Margin:</span>
                <span className="px-2 py-0.5 rounded-lg bg-emerald-400 text-emerald-950 font-black text-xs">
                  +{marginPct}% (+₹{profitPerUnit.toFixed(2)} / {product.standard_unit || 'pc'})
                </span>
              </div>
            </div>

            {/* Shipper Carton Economics */}
            <div className="p-3 rounded-xl bg-slate-50 border border-gray-200 space-y-1.5 text-xs">
              <div className="font-black text-gray-900 text-xs flex items-center justify-between">
                <span>Shipper Carton Pack:</span>
                <span className="text-indigo-700">{caseSize} {product.standard_unit || 'units'} / carton</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Carton Purchase Cost:</span>
                <span className="font-bold text-gray-900">₹{caseWholesale.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Carton Retail Value:</span>
                <span className="font-bold text-gray-900">₹{caseMrp.toFixed(2)}</span>
              </div>
              <div className="pt-1.5 border-t border-gray-200 flex justify-between font-black text-emerald-700">
                <span>Net Carton Profit:</span>
                <span>+₹{caseProfit.toFixed(2)} per carton</span>
              </div>
            </div>

            {/* Local Stockist Delivery SLA */}
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs space-y-1 text-blue-900">
              <div className="font-bold flex items-center gap-1.5">
                <i className="fa-solid fa-truck-fast text-blue-600"></i>
                <span>Fulfilled by Local Stockist</span>
              </div>
              <div className="text-[11px] text-blue-700">
                <strong>{product.distributor_name || 'Apex City Stockists'}</strong> • Delivery van reaches Pincode {storePincode} in {product.lead_time_hours || 12}h.
              </div>
            </div>

            {/* Carton Stepper */}
            <div className="space-y-1.5">
              <label className="font-bold text-xs text-gray-700 block">
                Select Carton Quantity to Restock:
              </label>
              <div className="flex items-center justify-between border border-gray-200 rounded-xl p-1 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setCartonQty(Math.max(1, cartonQty - 1))}
                  className="w-10 h-9 rounded-lg bg-white border border-gray-200 text-gray-700 font-extrabold text-sm flex items-center justify-center hover:bg-gray-100 transition cursor-pointer"
                >
                  <i className="fa-solid fa-minus text-xs"></i>
                </button>
                <div className="text-center font-black text-sm text-gray-900">
                  {cartonQty} {cartonQty === 1 ? 'Carton' : 'Cartons'} ({totalUnits} packs)
                </div>
                <button
                  type="button"
                  onClick={() => setCartonQty(cartonQty + 1)}
                  className="w-10 h-9 rounded-lg bg-white border border-gray-200 text-gray-700 font-extrabold text-sm flex items-center justify-center hover:bg-gray-100 transition cursor-pointer"
                >
                  <i className="fa-solid fa-plus text-xs"></i>
                </button>
              </div>
              <div className="flex justify-between text-[11px] text-gray-500 px-1">
                <span>Total Wholesale: <strong>₹{totalCartonWholesale.toFixed(2)}</strong></span>
                <span className="text-emerald-700 font-bold">Profit: <strong>+₹{totalCartonProfit.toFixed(2)}</strong></span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              {/* Button 1: Sell to Consumer (1-Click Adoption) */}
              {product.already_in_store ? (
                <div className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-extrabold flex items-center justify-center gap-2 border border-emerald-200">
                  <i className="fa-solid fa-circle-check text-emerald-600"></i> Already Active in Your Store
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAdoptModalOpen(true)}
                  className="w-full btn-soft !py-2.5 !text-xs font-extrabold flex items-center justify-center gap-2 hover:border-emerald-300 hover:text-emerald-700 cursor-pointer"
                >
                  <i className="fa-solid fa-plus text-emerald-600"></i> Put on My Shop Shelf (POS)
                </button>
              )}

              {/* Button 2: Add Cartons to Restock Cart */}
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full btn-soft !py-2.5 !text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer hover:border-indigo-300 hover:text-indigo-700"
              >
                <i className="fa-solid fa-cart-plus text-indigo-600"></i> Add to Restock Cart
              </button>

              {/* Button 3: Instant Quick Order (Cash on Delivery) */}
              <button
                type="button"
                disabled={isQuickOrdering}
                onClick={handleQuickOrder}
                className="w-full btn-primary !py-3 !text-xs font-black flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isQuickOrdering ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Placing Order...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-bolt"></i> Quick Order {cartonQty} Carton (Cash on Delivery)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Restock Cart Slide-Over Drawer */}
      <RestockCartDrawer
        isOpen={isRestockCartOpen}
        onClose={() => setIsRestockCartOpen(false)}
        onOrderPlaced={(order) => {
          showToast(`🎉 Bulk Restock Order placed! Van delivery in 12h.`);
        }}
      />

      {/* 1-Click Store Adoption Modal */}
      {isAdoptModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsAdoptModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded">
                  {product.brand_name}
                </span>
                <h3 className="text-base font-extrabold text-gray-900 mt-1">
                  Put on My Shop Shelf (POS)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAdoptModalOpen(false)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div>
              <div className="font-bold text-xs text-gray-800">{product.product_name}</div>
              <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                Barcode: {product.barcode || 'Standard Item'} • Printed MRP: ₹{product.printed_mrp}
              </div>
            </div>

            <form onSubmit={handleConfirmAdopt} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Your Retail Selling Price (₹) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  value={customSellPrice}
                  onChange={(e) => setCustomSellPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold text-sm text-gray-900 outline-none focus:border-indigo-500 bg-white"
                  required
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  Defaults to printed MRP. You may offer a merchant discount if desired.
                </span>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Initial Opening Stock Quantity ({product.standard_unit || 'units'}) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={customStock}
                  onChange={(e) => setCustomStock(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold text-sm text-gray-900 outline-none focus:border-indigo-500 bg-white"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAdoptModalOpen(false)}
                  className="flex-1 btn-soft !py-2.5 !text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdopting}
                  className="flex-1 btn-primary !py-2.5 !text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-check"></i>
                  {isAdopting ? 'Publishing...' : 'Publish to Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Order Success Modal */}
      {quickOrderSuccess && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setQuickOrderSuccess(null)}
        >
          <div 
            className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 text-center space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto">
              <i className="fa-solid fa-check"></i>
            </div>
            <h3 className="text-lg font-black text-gray-900">Restock Order Placed!</h3>
            <p className="text-xs text-gray-600">
              Your order for <strong>{quickOrderSuccess.ordered_cases} carton(s)</strong> has been sent to <strong>{quickOrderSuccess.assigned_distributor}</strong>.
            </p>
            <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl text-left text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Order Code:</span>
                <span className="font-mono font-bold text-gray-800">{quickOrderSuccess.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Bill Amount:</span>
                <span className="font-extrabold text-indigo-700">₹{quickOrderSuccess.total_amount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Delivery Van SLA:</span>
                <span className="font-bold text-gray-800">{quickOrderSuccess.lead_time_hours || 12} hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment:</span>
                <span className="font-bold text-emerald-700">Cash on Delivery</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setQuickOrderSuccess(null)}
              className="w-full btn-primary !py-2.5 !text-xs font-bold cursor-pointer"
            >
              OK, Got It!
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

