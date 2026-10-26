import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePOS } from '../hooks/usePOS';
import { useSeller } from '../context/SellerContext';
import { useTranslation } from '../context/LanguageContext';
import listingService from '../services/listingService';

export default function POSPage() {
  const { cart, addToCart, updateQuantity, clearCart, cartTotal, checkout, isProcessing } = usePOS();
  const { store } = useSeller();
  const { t } = useTranslation();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerPhone, setCustomerPhone] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [completedSale, setCompletedSale] = useState(null);

  useEffect(() => {
    async function loadLiveProducts() {
      try {
        setLoading(true);
        const res = await listingService.getListings({ limit: 50 });
        const items = res.data || [];
        if (items.length > 0) {
          setProducts(items.map(p => ({
            id: p.id,
            name: p.title,
            price: Number(p.sell_price) || 0,
            stock: p.stock_qty || 0,
            type: p.product_type || 'General'
          })));
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error('Error fetching listings for POS:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLiveProducts();
  }, []);

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    const billItems = [...cart];
    const billTotal = cartTotal;
    const currentMethod = paymentMethod;
    const receiptNum = `RCP-${Date.now().toString().slice(-6)}`;
    const billDate = new Date().toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const result = await checkout(currentMethod, customerPhone);

    setCompletedSale({
      receiptId: result?.receipt_id || result?.id || receiptNum,
      date: billDate,
      paymentMethod: currentMethod,
      customerPhone: customerPhone.trim() || 'Walk-in Customer',
      items: billItems,
      subtotal: billTotal,
      gst: Math.round(billTotal * 0.05),
      total: billTotal,
      storeName: store?.store_name || 'My Store'
    });

    if (!result) {
      clearCart();
    }
    setCustomerPhone('');
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = categoryFilter === 'All' || p.type.toLowerCase().includes(categoryFilter.toLowerCase());
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section id="sec-pos" className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-indigo-900">
            {t('posTitle', 'Bill Counter')} <span className="text-sm font-normal text-indigo-600">(POS)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">{t('posSubtitle', 'Tap live store items or scan barcodes to bill walk-in customers instantly.')}</p>
        </div>
        <div className="w-full sm:w-64">
          <input 
            type="search" 
            placeholder={t('posSearchPlaceholder', 'Filter item name...')} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 outline-none focus:border-indigo-500" 
          />
        </div>
      </div>
      
      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        {/* Products Grid */}
        <div className="card p-4 shadow-sm">
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 hide-scroll">
            {['All', 'Grocery', 'Dairy', 'Snacks', 'Clothing'].map(cat => {
              const catKey = cat === 'All' ? 'catAll' : `cat${cat}`;
              return (
                <button 
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${categoryFilter === cat ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                >
                  {t(catKey, cat)}
                </button>
              );
            })}
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-xs text-gray-400">{t('posLoadingCatalog', 'Loading live catalog...')}</div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">{t('posNoProducts', 'No products found matching filters.')}</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredProducts.map(product => (
                <button 
                  key={product.id}
                  onClick={() => addToCart(product)} 
                  className="card p-3 text-left hover:border-indigo-300 hover:bg-indigo-50 transition-all border border-gray-200 shadow-sm group cursor-pointer"
                >
                  <div className="font-bold text-sm truncate text-gray-800 group-hover:text-indigo-900">{product.name}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-indigo-700 font-extrabold text-sm">₹{product.price}</span>
                    <span className="text-[10px] text-gray-400">{t('posQtyLabel', 'Qty')}: {product.stock}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* POS Cart Sidebar */}
        <div className="card p-4 flex flex-col h-fit sticky top-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
            <h3 className="font-bold text-sm text-gray-800">{t('posCurrentBill', 'Current Bill')}</h3>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-rose-600 text-xs font-semibold hover:underline">
                {t('posClearCart', 'Clear')}
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto mb-4 hide-scroll">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs">
                <i className="fa-solid fa-basket-shopping text-2xl mb-2 text-gray-300 block"></i>
                {t('posEmptyCart', 'Cart is empty. Tap products to add.')}
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded-lg">
                  <div className="flex-1 truncate mr-2">
                    <div className="font-bold text-gray-800 truncate">{item.name}</div>
                    <div className="text-gray-500">₹{item.price} × {item.qty}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-300">-</button>
                    <span className="font-bold w-4 text-center">{item.qty}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-300">+</button>
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div className="border-t border-gray-100 pt-3 space-y-3">
              <div className="flex justify-between items-center text-sm font-extrabold text-gray-900">
                <span>{t('posTotalAmount', 'Total Amount:')}</span>
                <span className="text-indigo-700 text-base">₹{cartTotal}</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
                  Customer Mobile (Optional)
                </label>
                <input 
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 outline-none focus:border-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
                  {t('posPaymentMethod', 'Payment Method')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setPaymentMethod('cash')} 
                    className={`py-1.5 rounded-lg text-xs font-bold border transition ${paymentMethod === 'cash' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                  >
                    {t('posMethodCash', 'Cash')}
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('upi')} 
                    className={`py-1.5 rounded-lg text-xs font-bold border transition ${paymentMethod === 'upi' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                  >
                    {t('posMethodUpi', 'UPI / QR')}
                  </button>
                </div>
              </div>

              <button 
                onClick={handleCheckout} 
                disabled={isProcessing}
                className="w-full btn-primary !bg-indigo-600 hover:!bg-indigo-700 !text-xs !py-2.5 flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-receipt"></i>
                {isProcessing ? t('posProcessing', 'Processing...') : `${t('posPrintBill', 'Print & Charge')} • ₹${cartTotal}`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* POS RECEIPT MODAL */}
      {completedSale && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setCompletedSale(null)}
        >
          <div 
            className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Store Info */}
            <div className="text-center pb-3 border-b border-dashed border-gray-300">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 text-xl">
                <i className="fa-solid fa-check"></i>
              </div>
              <h2 className="text-lg font-black text-gray-900">{completedSale.storeName}</h2>
              <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mt-0.5">Payment Completed</div>
              <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-2 font-mono">
                <span>{completedSale.receiptId}</span>
                <span>•</span>
                <span>{completedSale.date}</span>
              </div>
            </div>

            {/* Customer & Payment Badge */}
            <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between text-xs">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Billed To</span>
                <span className="font-bold text-gray-800">{completedSale.customerPhone}</span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Mode</span>
                <span className="font-bold text-indigo-700 uppercase">
                  {completedSale.paymentMethod === 'upi' ? 'UPI / QR Code' : 'Cash Counter'}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 text-xs">
              {completedSale.items.map((it, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between">
                  <div className="flex-1 pr-2 truncate">
                    <div className="font-bold text-gray-900 truncate">{it.name}</div>
                    <div className="text-gray-400 text-[11px]">
                      ₹{it.price} × {it.qty}
                    </div>
                  </div>
                  <div className="font-extrabold text-gray-900 text-right">
                    ₹{it.price * it.qty}
                  </div>
                </div>
              ))}
            </div>

            {/* Breakdown & Grand Total */}
            <div className="border-t-2 border-dashed border-gray-200 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{completedSale.subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-500 text-[11px]">
                <span>Taxes & GST (Included)</span>
                <span>₹{completedSale.gst}</span>
              </div>
              <div className="flex justify-between items-center text-base font-black text-gray-900 pt-2 border-t border-gray-100">
                <span>Grand Total</span>
                <span className="text-emerald-700 font-mono">₹{completedSale.total}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="flex-1 btn-soft !py-2.5 !text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-print"></i> Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setCompletedSale(null)}
                className="flex-1 btn-primary !bg-indigo-600 hover:!bg-indigo-700 !py-2.5 !text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-plus"></i> New Sale
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
