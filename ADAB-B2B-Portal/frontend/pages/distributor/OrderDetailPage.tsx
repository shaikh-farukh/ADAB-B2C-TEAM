import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ClipboardList, 
  Clock, 
  Truck, 
  CheckCircle2, 
  FileText, 
  Mail, 
  Phone, 
  MapPin, 
  Building2,
  Package,
  Download,
  AlertCircle,
  ArrowUpRight,
  Info,
  ArrowLeft,
  CheckCircle,
  CreditCard
} from 'lucide-react';
import distributorService from '../../services/distributorService';
import StatusBadge from '../../components/common/StatusBadge';
import { useNotification } from '../../context/NotificationContext';
import { adabTheme } from '../../theme/adabTheme';
import { OrderTimeline } from '../../components/orders/OrderTimeline';
import { loadRazorpayScript } from '../../utils/loadRazorpay';

const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [orderData, setOrderData] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [showInvoiceToast, setShowInvoiceToast] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showSuccessUI, setShowSuccessUI] = useState(false);

  const fetchOrderDetails = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const response = await distributorService.getOrderById(id);
      if (response.success && response.data) {
        setOrderData(response.data);
      } else {
        showError(response.message || "Order not found");
      }
      
      try {
        const timelineRes = await distributorService.getTimeline(id);
        if (timelineRes.success) {
          setTimeline(timelineRes.data);
        }
      } catch (e) {
        console.error("Timeline fetch error", e);
      }
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to load order record");
    } finally {
      setIsLoading(false);
    }
  }, [id, showError]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const handlePayNow = async () => {
    if (!orderData || !orderData.order) return;
    setIsProcessingPayment(true);
    try {
      const res = await loadRazorpayScript();
      if (!res) {
        showError("Razorpay SDK failed to load. Are you online?");
        setIsProcessingPayment(false);
        return;
      }

      const checkoutResponse = await distributorService.createRazorpayCheckout([orderData.order.id]);
      if (!checkoutResponse.success) {
        showError(checkoutResponse.message || "Failed to initiate payment");
        setIsProcessingPayment(false);
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
        description: `Order ${orderData.order.order_number}`,
        order_id: razorpay_order_id,
        handler: async function (response: any) {
          console.log("✅ Razorpay handler called with:", JSON.stringify(response));
          try {
            const verifyRes = await distributorService.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              checkout_id: checkout_id
            });
            console.log("✅ Verify response:", JSON.stringify(verifyRes));
            if (verifyRes.success) {
              setShowSuccessUI(true);
              showSuccess("Payment verified successfully!");
              fetchOrderDetails();
            } else {
              showError("Payment verification failed: " + (verifyRes.message || "Unknown error"));
            }
          } catch (error: any) {
            console.error("❌ Verify error:", error);
            const msg = error?.response?.data?.message || error?.message || "Network error verifying payment";
            showError("Payment verification error: " + msg);
          }
        },
        theme: { color: "#3399cc" }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.on('payment.failed', function (response: any) {
        console.error("❌ Razorpay payment.failed event:", JSON.stringify(response?.error));
        showError("Payment Failed: " + (response?.error?.description || "Unknown error"));
      });
      paymentObject.open();
    } catch (err: any) {
      console.error("❌ handlePayNow outer error:", err);
      const errorMsg = err.response?.data?.message || err.message || 'Error processing payment.';
      showError(errorMsg);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleLoadInvoice = async () => {
    if (!id) return;
    setPdfLoading(true);
    try {
      const blob = await distributorService.downloadInvoicePDF(id);
      
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      setPdfUrl(url);
    } catch (err) {
      showError("Invoice generation failed or not yet available.");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!id) return;

    const triggerDownload = (url: string) => {
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${orderData?.order?.order_number || id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setShowInvoiceToast(true);
      setTimeout(() => setShowInvoiceToast(false), 3000);
    };

    if (pdfUrl) {
      triggerDownload(pdfUrl);
      return;
    }

    setPdfLoading(true);
    try {
      const blob = await distributorService.downloadInvoicePDF(id);
      
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      setPdfUrl(url);
      triggerDownload(url);
    } catch (err) {
      showError("Invoice generation failed or not yet available.");
    } finally {
      setPdfLoading(false);
    }
  };

  if (!isLoading && !orderData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4 animate-in fade-in duration-500">
        <div className="bg-orange-50 p-6 rounded-full mb-6 shadow-inner"><AlertCircle className="w-12 h-12 text-adab-orange" /></div>
        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-200 tracking-tight">Record Not Found</h2>
        <p className="text-gray-500 text-sm mt-2 max-w-xs">The requested procurement order could not be located in our secure records.</p>
        <button onClick={() => navigate('/distributor/orders')} className="mt-10 px-8 py-3 bg-adab-orange text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-orange-900/10 hover:bg-orange-700 transition-all">Return to Registry</button>
      </div>
    );
  }

  if (showSuccessUI) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center animate-in zoom-in-95 duration-500">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-[2.5rem] p-16 shadow-2xl shadow-gray-200/50">
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-10 border border-green-100">
             <CheckCircle2 className="w-12 h-12 text-adab-green" />
          </div>
          <h2 className="text-4xl font-black text-gray-900 dark:text-gray-200 tracking-tight mb-4">Payment Confirmed</h2>
          <p className="text-gray-500 text-lg max-w-md mx-auto mb-12 font-medium">Your digital payment has been securely verified and the order is marked as paid.</p>
          <div className="flex flex-col gap-4">
             <button onClick={() => setShowSuccessUI(false)} className="w-full py-5 bg-gray-900 dark:bg-gray-800 text-white rounded-2xl text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-gray-900/10 hover:bg-gray-800 transition-all active:scale-95">
               View Order Details
             </button>
             <button onClick={() => navigate('/distributor/orders')} className="w-full py-5 bg-white text-gray-700 rounded-2xl text-sm font-black uppercase tracking-[0.2em] border border-gray-200 hover:bg-gray-50 transition-all active:scale-95">
               Back to My Orders
             </button>
          </div>
        </div>
      </div>
    );
  }

  const order = orderData?.order;
  const items = orderData?.items || [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-10">
        <div className="flex-1 min-w-0">
          <button onClick={() => navigate('/distributor/orders')} className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-adab-orange transition-colors mb-6 group">
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back to History
          </button>
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="bg-gray-100 h-6 w-32 rounded-lg" />
              <div className="bg-gray-200 h-10 w-2/3 rounded-xl" />
              <div className="bg-gray-100 h-4 w-1/3 rounded-lg" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 text-adab-green mb-1.5">
                <ClipboardList className="w-5 h-5 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Procurement Tracking</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-gray-200 tracking-tight truncate uppercase leading-none">{order?.order_number || order?.id}</h1>
              <p className="text-xs md:text-sm text-gray-500 mt-3 font-medium">Purchase Order transmitted on <span className="text-gray-900 dark:text-gray-200 font-bold">{order?.order_date ? new Date(order.order_date).toLocaleDateString() : 'N/A'}</span></p>
            </>
          )}
        </div>
        {!isLoading && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <StatusBadge status={order?.status || ''} className="px-6 py-3 text-sm shadow-sm" />
            <button onClick={handleDownloadInvoice} className="inline-flex items-center justify-center px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.15em] transition-all bg-adab-orange text-white hover:bg-orange-700 shadow-xl shadow-orange-900/10 active:scale-95">
              <Download className="w-4 h-4 mr-3" /> Download Invoice
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
        {/* Sidebar Info */}
        <div className="space-y-8">
          {[...Array(2)].map((_, i) => (
            isLoading ? (
              <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-2xl p-8 shadow-sm animate-pulse space-y-6">
                <div className="bg-gray-100 h-5 w-1/2 rounded-lg" />
                <div className="space-y-3">
                  <div className="bg-gray-50 h-3 w-3/4 rounded-lg" />
                  <div className="bg-gray-50 h-3 w-1/2 rounded-lg" />
                </div>
              </div>
            ) : null
          ))}
          {!isLoading && order && (
            <>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden group">
                <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-adab-green shrink-0" />
                  <h3 className="font-black text-gray-900 dark:text-gray-200 text-xs uppercase tracking-widest">Manufacturer Details</h3>
                </div>
                <div className="p-8 space-y-6 text-sm">
                  <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Corporate Entity</p><p className="font-extrabold text-gray-900 dark:text-gray-200 text-base">{order.manufacturer_name || 'N/A'}</p></div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100 shrink-0"><Mail className="w-4 h-4" /></div>
                    <p className="font-medium text-gray-600 break-all">{order.manufacturer_email || 'N/A'}</p>
                  </div>
                  <div className="flex items-start gap-4">
                     <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100 shrink-0"><MapPin className="w-4 h-4" /></div>
                     <p className="font-medium text-gray-600 leading-relaxed">{order.manufacturer_location || 'N/A'}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                  <FileText className="w-5 h-5 text-adab-orange shrink-0" />
                  <h3 className="font-black text-gray-900 dark:text-gray-200 text-xs uppercase tracking-widest">Commercial Status</h3>
                </div>
                <div className="p-8 space-y-5">
                   <div>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Order Status Tier</p>
                     <span className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest border border-gray-200 inline-block">{order.status}</span>
                   </div>
                   <div className="pt-5 border-t border-gray-100">
                     <div className="flex items-center justify-between mb-2">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Mode</p>
                       <span className="text-[10px] font-black uppercase tracking-widest text-adab-orange">{order.payment_status || 'PENDING'}</span>
                     </div>
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <CreditCard className="w-4 h-4 text-gray-500" />
                         <span className="text-sm font-bold text-gray-900">
                           {order.payment_mode === 'NET_30' ? 'Net-30 Credit Line' : order.payment_mode === 'ONLINE' ? 'Online Payment' : 'Cash on Delivery / Direct'}
                         </span>
                       </div>
                       
                       {order.payment_mode === 'ONLINE' && order.payment_status !== 'PAID' && order.payment_status !== 'CAPTURED' && order.payment_status !== 'SETTLED' && (
                         <button 
                           onClick={handlePayNow} 
                           disabled={isProcessingPayment}
                           className="px-4 py-2 bg-adab-green text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                         >
                           {isProcessingPayment ? 'Processing...' : 'Pay Now'}
                         </button>
                       )}
                     </div>
                     
                     {order.payment_mode === 'NET_30' && (
                       <p className="text-[10px] font-medium text-adab-green mt-1">Payable within 30 days of invoice generation.</p>
                     )}
                   </div>
                </div>
              </div>

              {/* Timeline Tracking */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm p-6">
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-200 mb-4 flex items-center uppercase tracking-wider">
                  <Truck className="w-4 h-4 mr-2 text-adab-orange" />
                  Order Tracking
                </h2>
                
                <OrderTimeline events={timeline || []} currentStatus={order.status} />
              </div>
            </>
          )}
        </div>

        {/* Main Content (Line Items) */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
              <Package className="w-5 h-5 text-adab-green shrink-0" />
              <h3 className="font-black text-gray-900 dark:text-gray-200 text-xs uppercase tracking-widest">Procured Itemized List</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className="bg-white dark:bg-gray-900 border-b border-gray-50 dark:border-white/5">
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Reference</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Unit Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                  {isLoading ? (
                    [...Array(3)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-8 py-6 space-y-2">
                          <div className="bg-gray-100 h-5 w-48 rounded-lg" />
                          <div className="bg-gray-50 h-3 w-24 rounded-lg" />
                        </td>
                        <td className="px-8 py-6"><div className="bg-gray-100 h-6 w-12 mx-auto rounded-lg" /></td>
                        <td className="px-8 py-6"><div className="bg-gray-100 h-6 w-16 ml-auto rounded-lg" /></td>
                      </tr>
                    ))
                  ) : items.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-900 dark:text-gray-200 group-hover:text-adab-orange transition-colors">{item.product_name}</span>
                          <span className="text-[11px] font-mono text-gray-400 uppercase tracking-widest mt-0.5">SKU: {item.product_id || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <span className="px-4 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl text-sm font-black text-gray-700 dark:text-gray-300">{item.quantity}</span>
                      </td>
                      <td className="px-6 py-6 text-right text-sm font-bold text-gray-500 dark:text-gray-400">₹{Number(item.unit_price || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Value Summary Footer */}
            {isLoading ? (
              <div className="p-10 flex flex-col items-end animate-pulse border-t border-gray-100 space-y-3">
                <div className="w-56 h-4 bg-gray-100 rounded-lg" />
                <div className="w-64 h-10 bg-gray-200 rounded-xl" />
              </div>
            ) : (
              <div className="bg-gray-50/50 dark:bg-white/5 p-8 md:p-12 flex flex-col items-end border-t border-gray-100 dark:border-white/5">
                <div className="space-y-4 w-full max-w-[320px]">
                  <div className="flex justify-between text-[11px] font-black text-gray-400 uppercase tracking-widest">
                    <span>Gross PO Subtotal</span>
                    <span className="text-gray-900 dark:text-gray-200">₹{Number(order?.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="pt-8 border-t border-gray-200 dark:border-white/10 flex justify-between items-end gap-6">
                    <div className="text-left">
                      <span className="text-[10px] font-black text-gray-900 dark:text-gray-200 uppercase tracking-[0.2em] leading-none block mb-1">Total Valuation</span>
                      <span className="text-3xl md:text-5xl font-black text-adab-green tracking-tighter leading-none">₹{Number(order?.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-6 flex items-start gap-4 shadow-sm shadow-blue-900/5">
            <Info className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-black text-gray-900 dark:text-gray-200 uppercase tracking-widest">Tracking Information</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                Logistics and tracking details will be populated here once the manufacturer marks the order as 'Shipped'.
              </p>
            </div>
          </div>

          {/* Inline PDF Invoice Preview */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-adab-orange shrink-0" />
                <h3 className="font-black text-gray-900 dark:text-gray-200 text-xs uppercase tracking-widest">Invoice Preview</h3>
              </div>
              {!pdfUrl && (
                <button
                  onClick={handleLoadInvoice}
                  disabled={pdfLoading}
                  className="inline-flex items-center px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-adab-orange text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pdfLoading ? 'Generating...' : 'Load Invoice'}
                </button>
              )}
            </div>
            <div className="p-4">
              {pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="w-full rounded-lg border border-gray-100 dark:border-white/10"
                  style={{ height: '600px' }}
                  title="Invoice PDF Preview"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mb-4" />
                  <p className="text-sm font-bold text-gray-400">Click "Load Invoice" to generate and preview the PDF</p>
                  <p className="text-xs text-gray-300 mt-1">The invoice will be displayed inline here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Invoice UI */ }
      {showInvoiceToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-300 w-[90%] md:w-auto">
          <div className="bg-gray-900 text-white px-8 py-5 rounded-2xl shadow-2xl flex items-center gap-5 border border-white/10">
            <div className="w-10 h-10 rounded-full bg-adab-green flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-sm tracking-wide uppercase">Generating Secure Link...</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold truncate">Download starting in 2 seconds</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailPage;