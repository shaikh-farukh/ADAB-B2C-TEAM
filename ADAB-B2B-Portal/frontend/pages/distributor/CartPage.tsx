import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowLeft, 
  CreditCard, 
  ShieldCheck, 
  Package,
  AlertCircle,
  CheckCircle2,
  PackageX,
  ChevronLeft,
  MapPin
} from 'lucide-react';
import distributorService from '../../services/distributorService';
import creditService from '../../services/creditService';
import PaymentMethodSelector from '../../components/payments/PaymentMethodSelector';
import CheckoutCreditWidget from '../../components/payments/CheckoutCreditWidget';
import { useNotification } from '../../context/NotificationContext';
import DeliveryOptionSelector from '../../components/distributor/DeliveryOptionSelector';
import { loadRazorpayScript } from '../../utils/loadRazorpay';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessUI, setShowSuccessUI] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<string>('IN_HOUSE');
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'NET_30' | 'ONLINE'>('CASH');
  const [creditBalance, setCreditBalance] = useState<number | null>(null);

  const fetchCart = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await distributorService.getCart();
      if (response.success && response.data) {
        setItems(response.data.items || []);
        setSummary(response.data.summary || null);
      } else {
        setItems([]);
        setSummary(null);
      }
    } catch (err) {
      console.error("Cart fetch error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCredit = useCallback(async () => {
    try {
      const response = await creditService.getCreditBalance();
      if (response && response.data) {
        setCreditBalance(response.data.availableCredit);
      }
    } catch (err) {
      console.error("Failed to fetch credit balance", err);
    }
  }, []);

  useEffect(() => {
    fetchCart();
    fetchCredit();
  }, [fetchCart, fetchCredit]);

  const handleUpdateQuantity = async (cartId: number, newQty: number, moq: number) => {
    if (newQty < (moq || 1)) {
      showError(`Quantity cannot be lower than the Minimum Order Quantity (MOQ) of ${moq || 1}`);
      return;
    }
    try {
      const response = await distributorService.updateCartItem(cartId, newQty);
      if (response.success) {
        fetchCart();
      } else {
        showError(response.message || "Failed to update quantity");
      }
    } catch (err: any) {
      showError(err.response?.data?.message || "Quantity update failed");
    }
  };

  const handleRemoveItem = async (cartId: number) => {
    try {
      const response = await distributorService.removeFromCart(cartId);
      if (response.success) {
        showSuccess("Item removed");
        fetchCart();
      }
    } catch (err) {
      showError("Removal failed");
    }
  };

  const handleClearCart = async () => {
    try {
      const response = await distributorService.clearCart();
      if (response.success) {
        setItems([]);
        setSummary(null);
      }
    } catch (err) {
      showError("Failed to clear cart");
    }
  };

  const handleTransmitOrder = async () => {
    if (items.length === 0) {
      showError("Your cart is empty");
      return;
    }
    if (!shippingAddress.trim()) {
      showError("Shipping address is required");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await distributorService.placeOrder({
        shipping_address: shippingAddress,
        delivery_mode: deliveryMode,
        payment_mode: paymentMode,
        delivery_charge: deliveryCharge
      });
      
      if (response.success) {
        if (paymentMode === 'ONLINE') {
          const res = await loadRazorpayScript();
          if (!res) {
            showError("Razorpay SDK failed to load. Are you online?");
            setIsProcessing(false);
            return;
          }

          const orderIds = response.data.orders.map((o: any) => o.order_id);
          const checkoutResponse = await distributorService.createRazorpayCheckout(orderIds);
          
          if (!checkoutResponse.success) {
            showError(checkoutResponse.message || "Failed to initiate payment");
            setIsProcessing(false);
            return;
          }

          const { razorpay_order_id, amount_paise, checkout_id } = checkoutResponse.data;

          const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID?.trim();
          console.log("🔥 Triggering Razorpay with key:", keyId, "and Order ID:", razorpay_order_id);

          const options = {
            key: keyId, // Use env var, trim to prevent CRLF issues
            amount: amount_paise,
            currency: "INR",
            name: "ADAB B2B Portal",
            description: "B2B Order Payment",
            order_id: razorpay_order_id,
            handler: async function (response: any) {
              try {
                const verifyRes = await distributorService.verifyRazorpayPayment({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  checkout_id: checkout_id
                });
                
                if (verifyRes.success) {
                  setShowSuccessUI(true);
                  showSuccess("Payment successful and order placed");
                  setItems([]);
                } else {
                  showError("Payment verification failed");
                }
              } catch (error: any) {
                const errorMsg = error.response?.data?.message || "Payment verification failed due to network error";
                showError(`Payment verification failed: ${errorMsg}`);
              }
            },
            prefill: {
              name: "Distributor", // Could be dynamic from profile
              email: "distributor@example.com",
              contact: "9999999999"
            },
            theme: {
              color: "#3399cc"
            },
            modal: {
              ondismiss: function() {
                // The cart has already been converted to an order on the backend.
                setItems([]);
                showError("Payment was cancelled. You can pay this invoice later from the Pending Invoices dashboard.");
                navigate('/distributor/orders');
              }
            }
          };

          const paymentObject = new (window as any).Razorpay(options);
          
          paymentObject.on('payment.failed', function (response: any) {
            showError("Payment Failed");
          });

          paymentObject.open();
          setIsProcessing(false); // Modal is open, stop processing state
          return;
        }

        setIsProcessing(false);
        setShowSuccessUI(true);
        showSuccess(response.message || "Order placed successfully");
        setItems([]);
      } else {
        showError(response.message || "Order placement failed");
        setIsProcessing(false);
      }
    } catch (err: any) {
      showError(err.response?.data?.message || "Network error during order transmission");
      setIsProcessing(false);
    }
  };

  if (!isLoading && items.length === 0 && !showSuccessUI) {
    return (
      <div className="max-w-6xl mx-auto py-32 text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <PackageX className="w-12 h-12 text-gray-200" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-200 tracking-tight">Procurement cart is empty</h2>
          <p className="text-gray-500 text-sm max-w-xs mx-auto">Discover new products and start building your order from the catalog.</p>
        </div>
        <button onClick={() => navigate('/distributor/catalog')} className="px-10 py-4 bg-adab-orange text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-orange-900/10 hover:bg-orange-700 transition-all active:scale-95">
          Browse Active Catalog
        </button>
      </div>
    );
  }

  if (showSuccessUI) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center animate-in zoom-in-95 duration-500">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:borderbg-white dark:bg-gray-900 rounded-[2.5rem] dark:border dark:border-white/10 p-16 shadow-2xl shadow-gray-200/50">
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-10 border border-green-100">
             <CheckCircle2 className="w-12 h-12 text-adab-green" />
          </div>
          <h2 className="text-4xl font-black text-gray-900 dark:text-gray-200 tracking-tight leading-none mb-4 uppercase">Success</h2>
          <p className="text-gray-500 font-medium leading-relaxed max-sm mx-auto mb-12">
            Your purchase order has been transmitted to the manufacturers for validation and processing.
          </p>
          <button 
            onClick={() => navigate('/distributor/orders')}
            className="w-full py-5 bg-adab-green text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-green-900/20 hover:bg-green-800 transition-all active:scale-95"
          >
            Track Order Status
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 md:space-y-10 animate-in fade-in duration-500 pb-24">
      {/* Polished Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b border-gray-100 pb-10">
        <div>
           <button onClick={() => navigate('/distributor/catalog')} className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-adab-orange transition-colors mb-6 group">
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Continue Sourcing
          </button>
          <div className="flex items-center gap-2 text-adab-orange mb-1.5">
            <ShoppingCart className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Order Finalization</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-gray-200 tracking-tight">Review Selection</h1>
          <p className="mt-1.5 text-sm text-gray-500 font-medium">Verify your items and quantities before submitting the Purchase Order.</p>
        </div>
        <button onClick={handleClearCart} className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-widest flex items-center gap-2">
          <Trash2 className="w-4 h-4" /> Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Item List */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Details</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Procured Qty</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Unit Price</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Subtotal</th>
                    <th className="px-6 py-5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    [...Array(3)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-6 space-y-3"><div className="h-5 bg-gray-100 rounded-lg w-48" /><div className="h-3 bg-gray-50 rounded-lg w-24" /></td>
                        <td className="px-6 py-6"><div className="h-10 bg-gray-100 rounded-xl w-24 mx-auto" /></td>
                        <td className="px-6 py-6"><div className="h-5 bg-gray-100 rounded-lg w-16 ml-auto" /></td>
                        <td className="px-6 py-6"><div className="h-5 bg-gray-100 rounded-lg w-20 ml-auto" /></td>
                        <td className="px-6 py-6"></td>
                      </tr>
                    ))
                  ) : items.map((item) => (
                    <tr key={item.cart_id} className="hover:bg-gray-50/30 transition-colors group">
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 border border-gray-200 group-hover:bg-white transition-colors">
                            <Package className="w-6 h-6" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-gray-900 dark:text-gray-200 group-hover:text-adab-orange transition-colors truncate">{item.product_name}</p>
                            <div className="flex gap-4 mt-0.5">
                              <p className="text-[10px] font-mono font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/80 dark:border-amber-800/40 uppercase tracking-wider">SKU: {item.sku || item.product_id}</p>
                              {item.moq && (
                                <p className="text-[10px] text-adab-orange font-bold uppercase tracking-widest">MOQ: {item.moq}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center">
                         <div className="inline-flex items-center gap-3 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-white/5 rounded-xl">
                            <button 
                              onClick={() => handleUpdateQuantity(item.cart_id, item.quantity - 1, item.moq)} 
                              disabled={item.quantity <= (item.moq || 1)}
                              className="text-gray-400 hover:text-adab-orange disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-black text-gray-900 dark:text-gray-200 min-w-[2ch]">{item.quantity}</span>
                            <button 
                              onClick={() => handleUpdateQuantity(item.cart_id, item.quantity + 1, item.moq)} 
                              className="text-gray-400 hover:text-adab-orange"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                         </div>
                      </td>
                      <td className="px-6 py-6 text-right font-bold text-gray-500 text-sm">
                        ₹{Number(item.price || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-6 text-right font-black text-gray-900 dark:text-gray-200 text-sm">
                        ₹{Number(item.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-6 text-right">
                        <button onClick={() => handleRemoveItem(item.cart_id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Shipping & Delivery Section */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl p-8 shadow-sm">
            <h3 className="text-sm font-black text-gray-900 dark:text-gray-200 uppercase tracking-widest mb-6 flex items-center gap-3">
              <MapPin className="w-5 h-5 text-adab-orange" />
              Logistics Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Delivery Mode radios */}
              <DeliveryOptionSelector 
                  subtotal={summary?.items_subtotal || 0} 
                  shopId={items[0]?.shop_id || 1} 
                  distanceKm={10} 
                  onDeliveryChargeUpdate={(charge, mode) => {
                      setDeliveryCharge(charge);
                      setDeliveryMode(mode);
                  }} 
              />

              {/* Payment Mode radios */}
              <PaymentMethodSelector 
                paymentMode={paymentMode} 
                onChange={(mode) => setPaymentMode(mode as 'CASH' | 'NET_30' | 'ONLINE')} 
              />

              {/* Shipping Address */}
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Fulfillment Shipping Address</label>
                <textarea 
                  rows={5}
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Provide complete warehouse or delivery hub address..."
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-adab-green/10 focus:border-adab-green transition-all text-sm font-bold resize-none text-gray-900 dark:text-gray-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:borderbg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5/50 p-8 md:p-10 sticky top-8">
            {isLoading ? (
              <div className="space-y-8 animate-pulse">
                <div className="h-8 bg-gray-100 w-1/2 rounded-xl" />
                <div className="space-y-3"><div className="h-4 bg-gray-50 w-full rounded-lg" /><div className="h-4 bg-gray-50 w-full rounded-lg" /></div>
                <div className="h-16 bg-gray-200 w-full rounded-2xl" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-8">
                  <CreditCard className="w-5 h-5 text-adab-orange" />
                  <h3 className="text-xl font-black text-gray-900 dark:text-gray-200 tracking-tight">Order Summary</h3>
                </div>
                
                <div className="space-y-5 pb-8 border-b border-gray-100">
                  <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <span>Items Subtotal</span>
                    <span className="text-gray-900 dark:text-gray-200">₹{Number(summary?.items_subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <span>Platform Fees</span>
                    <span className="text-gray-900 dark:text-gray-200">₹{Number(summary?.estimated_fees || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <span>Estimated Shipping</span>
                    <span className="text-gray-900 dark:text-gray-200">${Number(deliveryCharge).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="py-8 flex flex-col justify-between items-end gap-2">
                   <div className="text-left w-full flex justify-between items-end">
                     <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-1">Total PO Value</span>
                     <span className="text-3xl font-black text-adab-green tracking-tighter leading-none">${(Number(summary?.items_subtotal || 0) + Number(summary?.estimated_fees || 0) + Number(deliveryCharge)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                   </div>
                   {paymentMode === 'NET_30' && creditBalance !== null && (
                     <div className="w-full mt-6 bg-green-50/50 rounded-xl p-5 border border-green-100/50 space-y-4">
                       <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                         <span>Current Credit Balance</span>
                         <span className="text-gray-900">${creditBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                       </div>
                       <div className="flex justify-between items-center text-xs font-bold text-red-400">
                         <span>Less: This Order</span>
                         <span>-${(Number(summary?.items_subtotal || 0) + Number(summary?.estimated_fees || 0) + Number(deliveryCharge)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                       </div>
                       <div className="pt-4 border-t border-green-100/50 flex justify-between items-end">
                         <span className="text-[10px] font-black text-adab-green uppercase tracking-[0.1em]">Remaining Credit</span>
                         <span className={`text-xl font-black tracking-tighter leading-none ${(creditBalance - (Number(summary?.items_subtotal || 0) + Number(summary?.estimated_fees || 0) + Number(deliveryCharge))) < 0 ? 'text-red-500' : 'text-adab-green'}`}>
                           ${(creditBalance - (Number(summary?.items_subtotal || 0) + Number(summary?.estimated_fees || 0) + Number(deliveryCharge))).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                         </span>
                       </div>
                     </div>
                   )}
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={handleTransmitOrder}
                    disabled={isProcessing || !shippingAddress.trim()}
                    className="w-full py-4 bg-adab-green text-white rounded-2xl text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-green-900/20 hover:bg-green-800 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? "Processing..." : "Transmit Order"}
                    {!isProcessing && <Plus className="w-4 h-4" />}
                  </button>
                  <p className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-widest">
                    By confirming, you agree to the ADAB Merchant terms
                  </p>
                </div>

                <div className="mt-10 pt-10 border-t border-gray-100 flex items-start gap-4">
                  <ShieldCheck className="w-6 h-6 text-adab-orange shrink-0" />
                  <p className="text-[10px] leading-relaxed text-gray-500 font-medium">
                    Secure checkout powered by ADAB Trust Engine. All procurement requests undergo verification by the selected manufacturer.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;