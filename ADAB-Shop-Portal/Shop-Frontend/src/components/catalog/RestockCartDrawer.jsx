import React, { useState } from 'react';
import { sellerApi } from '../../api/sellerApi';
import useRestockCart from '../../hooks/useRestockCart';

export default function RestockCartDrawer({ isOpen, onClose, onOrderPlaced }) {
  const { cart, updateCases, removeFromCart, clearCart, totalCartons, totalAmount, totalProfit } = useRestockCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(null);

  if (!isOpen) return null;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const itemsPayload = cart.map((item) => ({
        masterCatalogId: item.id,
        orderedCases: item.orderedCases
      }));

      const res = await sellerApi.bulkOrderRestockCases({
        items: itemsPayload,
        notes: 'Restock order from Seller FMCG Restock Cart'
      });

      if (res.data?.success) {
        setOrderSuccess(res.data.data);
        clearCart();
        if (onOrderPlaced) onOrderPlaced(res.data.data);
      } else {
        setErrorMessage(res.data?.message || 'Failed to place restock order');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setErrorMessage(err.response?.data?.message || err.message || 'Error communicating with distributor server');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <i className="fa-solid fa-boxes-stacked"></i>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-gray-900 leading-tight">
                Wholesale Restock Cart
              </h2>
              <p className="text-xs text-gray-500">
                {totalCartons} {totalCartons === 1 ? 'carton' : 'cartons'} from verified FMCG manufacturers
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200/70 flex items-center justify-center transition cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {orderSuccess ? (
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
                <i className="fa-solid fa-check"></i>
              </div>
              <h3 className="text-lg font-black text-gray-900">Restock Order Dispatched!</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Your order was successfully sent to the authorized local distributor van.
              </p>
              <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Orders Placed:</span>
                  <span className="font-bold text-gray-800">{orderSuccess.total_orders_placed || 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Wholesale Bill:</span>
                  <span className="font-extrabold text-indigo-700">₹{orderSuccess.total_amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Mode:</span>
                  <span className="font-bold text-emerald-700">Cash on Delivery (To Driver)</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOrderSuccess(null);
                  onClose();
                }}
                className="w-full btn-primary !py-2.5 !text-xs font-bold cursor-pointer"
              >
                Back to Catalog
              </button>
            </div>
          ) : cart.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center text-2xl mx-auto">
                <i className="fa-solid fa-cart-shopping"></i>
              </div>
              <h3 className="font-bold text-sm text-gray-700">Your Restock Cart is Empty</h3>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                Add cartons from the FMCG catalog to place a bulk delivery order with your local stockist.
              </p>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <i className="fa-solid fa-circle-exclamation shrink-0"></i>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                {cart.map((item) => {
                  const lineTotal = (item.orderedCases || 1) * (item.case_wholesale_price || 0);
                  const lineProfit = (item.orderedCases || 1) * (item.profit_per_case || 0);
                  const totalUnits = (item.orderedCases || 1) * (item.case_size || 1);

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl border border-gray-200 bg-white hover:border-indigo-200 transition space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                            {item.default_image_url ? (
                              <img src={item.default_image_url} alt={item.product_name} className="w-full h-full object-cover" />
                            ) : (
                              <i className="fa-solid fa-box text-gray-300 text-lg"></i>
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700">
                              {item.brand_name}
                            </span>
                            <h4 className="font-bold text-xs text-gray-900 truncate mt-0.5" title={item.product_name}>
                              {item.product_name}
                            </h4>
                            <div className="text-[11px] text-gray-500 font-medium mt-0.5">
                              {item.case_size} {item.standard_unit || 'units'}/carton • ₹{item.case_wholesale_price?.toFixed(2)}/box
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="text-gray-400 hover:text-red-500 p-1 text-xs transition cursor-pointer"
                          title="Remove item"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>

                      {/* Stepper & Line Economics */}
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                        {/* Carton Counter */}
                        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-slate-50">
                          <button
                            type="button"
                            onClick={() => updateCases(item.id, (item.orderedCases || 1) - 1)}
                            className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 font-bold transition cursor-pointer"
                          >
                            <i className="fa-solid fa-minus text-[10px]"></i>
                          </button>
                          <span className="w-8 text-center font-bold text-xs text-gray-900">
                            {item.orderedCases}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCases(item.id, (item.orderedCases || 1) + 1)}
                            className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 font-bold transition cursor-pointer"
                          >
                            <i className="fa-solid fa-plus text-[10px]"></i>
                          </button>
                        </div>

                        {/* Line Totals */}
                        <div className="text-right">
                          <div className="font-black text-sm text-gray-900">
                            ₹{lineTotal.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-emerald-700 font-bold">
                            +{lineProfit.toFixed(2)} profit ({totalUnits} packs)
                          </div>
                        </div>
                      </div>

                      {/* Local Distributor Info */}
                      <div className="pt-1.5 border-t border-gray-100 text-[10px] text-blue-800 flex items-center gap-1.5">
                        <i className="fa-solid fa-van-shuttle text-blue-600"></i>
                        <span className="truncate">
                          Fulfilled by <strong>{item.distributor_name}</strong> ({item.lead_time_hours}h delivery)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Economics Card */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Total Cartons:</span>
                  <span className="font-bold text-gray-900">{totalCartons} cases</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Van Fee:</span>
                  <span className="font-bold text-emerald-700">FREE (Local Stockist)</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Payment Method:</span>
                  <span className="font-bold text-gray-900">Cash on Delivery</span>
                </div>
                <div className="pt-2 border-t border-indigo-200 flex justify-between items-baseline">
                  <span className="font-black text-gray-900 text-sm">Total Wholesale Pay:</span>
                  <span className="font-black text-indigo-700 text-lg">₹{totalAmount.toFixed(2)}</span>
                </div>
                <div className="pt-1 text-[11px] text-emerald-700 font-extrabold flex items-center gap-1">
                  <i className="fa-solid fa-piggy-bank text-emerald-600"></i>
                  <span>Projected Retail Profit: +₹{totalProfit.toFixed(2)} in your pocket</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer Actions */}
        {!orderSuccess && cart.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-gray-100 bg-white space-y-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCheckout}
              className="w-full btn-primary !py-3 !text-sm font-extrabold flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>Routing to Local Distributor...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-truck-ramp-box"></i>
                  <span>Confirm Restock Delivery ({totalCartons} Cartons)</span>
                </>
              )}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={clearCart}
              className="w-full py-1.5 text-xs text-gray-400 hover:text-gray-600 transition text-center cursor-pointer"
            >
              Clear Entire Restock Cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

