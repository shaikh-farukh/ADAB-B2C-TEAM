import React, { useEffect, useState } from 'react';
import { CreditCard, AlertCircle, CheckCircle2, IndianRupee } from 'lucide-react';
import creditService, { CreditBalanceResponse } from '../../services/creditService';

const CreditLineWidget: React.FC = () => {
  const [data, setData] = useState<CreditBalanceResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const [showSuccessUI, setShowSuccessUI] = useState(false);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      const result = await creditService.getCreditBalance();
      setData(result.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch credit balance');
    } finally {
      setLoading(false);
    }
  };

  const handleRazorpayPayment = async (invoiceId: number, amount: number) => {
    if (isProcessing) return;
    setIsProcessing(invoiceId);

    try {
      const { loadRazorpayScript } = await import('../../utils/loadRazorpay');
      const paymentService = (await import('../../services/paymentService')).default;
      const res = await loadRazorpayScript();
      if (!res) {
        alert("Razorpay SDK failed to load. Are you online?");
        setIsProcessing(null);
        return;
      }

      // We use createLedgerCheckout with the invoice balance amount
      const checkoutResponse = await paymentService.createLedgerCheckout(amount, invoiceId);
      if (!checkoutResponse.success) {
        alert(checkoutResponse.message || "Failed to initiate payment");
        setIsProcessing(null);
        return;
      }

      const { razorpay_order_id, checkout_id } = checkoutResponse.data;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID?.trim(),
        amount: Math.round(amount * 100),
        currency: "INR",
        name: "ADAB B2B Portal",
        description: `Invoice Payment: ${invoiceId}`,
        order_id: razorpay_order_id,
        handler: async function (response: any) {
          try {
            const verifyRes = await paymentService.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              checkout_id: checkout_id
            });
            if (verifyRes.success) {
              setShowSuccessUI(true);
              fetchBalance();
            } else {
              alert("Payment verification failed");
            }
          } catch (error) {
            alert("Network error verifying payment");
          }
        },
        theme: { color: "#3399cc" }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.on('payment.failed', function () {
        alert("Payment Failed");
      });
      paymentObject.open();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Payment could not be processed.');
    } finally {
      setIsProcessing(null);
    }
  };

  if (loading) {

    return <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 animate-pulse h-64" />;
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-white dark:bg-dark-surface-card rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30">
        <div className="flex items-center text-red-600 dark:text-red-400 space-x-2">
          <AlertCircle size={20} />
          <span>{error || 'No credit data available.'}</span>
        </div>
      </div>
    );
  }

  if (showSuccessUI) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50/95 dark:bg-gray-950/95 p-4 backdrop-blur-sm">
        <div className="max-w-2xl w-full mx-auto py-20 text-center animate-in zoom-in-95 duration-500">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-[2.5rem] p-16 shadow-2xl shadow-gray-200/50">
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-10 border border-green-100">
              <CheckCircle2 className="w-12 h-12 text-adab-green" />
            </div>
            <h2 className="text-4xl font-black text-gray-900 dark:text-gray-200 tracking-tight leading-none mb-4 uppercase">Success</h2>
            <p className="text-gray-500 font-medium leading-relaxed max-w-sm mx-auto mb-12">
              Your payment has been successfully verified and applied to your invoice. The ledger has been updated.
            </p>
            <button
              onClick={() => {
                setShowSuccessUI(false);
                fetchBalance(); // Refresh the list so the paid invoice disappears
              }}
              className="w-full py-5 bg-adab-green text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-green-900/20 hover:bg-green-800 transition-all active:scale-95"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const usedPercentage = data.totalLimit > 0 ? (data.usedBalance / data.totalLimit) * 100 : 0;

  return (
    <div className="bg-white dark:bg-dark-surface-card rounded-3xl shadow-xl border border-gray-100 dark:border-dark-border-primary overflow-hidden transition-colors duration-200">
      {/* Header section */}
      <div className="p-6 bg-gradient-to-r from-gray-900 to-gray-800 dark:from-dark-app-secondary dark:to-dark-app-primary text-white">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CreditCard className="text-adab-green" /> Net-30 Credit Line
            </h2>
            <p className="text-gray-400 text-sm mt-1">Manage your B2B purchasing power</p>
          </div>
          {data.hasOverdueInvoices && (
            <div className="flex items-center gap-2 bg-red-500/20 text-red-300 px-3 py-1.5 rounded-full text-xs font-bold">
              <AlertCircle size={14} /> Account Restricted
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span className="text-gray-300">Used: ₹{data.usedBalance.toLocaleString()}</span>
            <span className="text-adab-green">Available: ₹{data.availableCredit.toLocaleString()}</span>
          </div>
          <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${usedPercentage > 90 ? 'bg-red-500' : 'bg-adab-green'}`}
              style={{ width: `${Math.min(usedPercentage, 100)}%` }}
            />
          </div>
          <div className="text-right text-xs text-gray-400 font-bold uppercase tracking-wider">
            Total Limit: ₹{data.totalLimit.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Repayment Table */}
      <div className="p-6">
        <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text-primary mb-4 uppercase tracking-wider flex items-center gap-2">
          Pending Invoices <span className="bg-gray-100 dark:bg-dark-surface-elevated text-gray-600 dark:text-dark-text-secondary px-2 py-0.5 rounded-full text-xs">{data.invoices.length}</span>
        </h3>

        {data.invoices.length === 0 ? (
          <div className="text-center py-8 text-gray-400 flex flex-col items-center">
            <CheckCircle2 size={32} className="text-gray-200 dark:text-dark-border-secondary mb-2" />
            <p>All caught up! No pending Net-30 invoices.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-gray-400 uppercase bg-gray-50 dark:bg-dark-surface-elevated border-b border-gray-100 dark:border-dark-border-primary">
                <tr>
                  <th className="px-4 py-3 font-semibold dark:text-dark-text-secondary">Invoice #</th>
                  <th className="px-4 py-3 font-semibold dark:text-dark-text-secondary">Manufacturer</th>
                  <th className="px-4 py-3 font-semibold dark:text-dark-text-secondary">Amount</th>
                  <th className="px-4 py-3 font-semibold dark:text-dark-text-secondary">Due Date</th>
                  <th className="px-4 py-3 font-semibold text-right dark:text-dark-text-secondary">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-border-primary">
                {[...data.invoices].sort((a, b) => {
                  const aDate = a.net_30_due_date ? new Date(a.net_30_due_date).getTime() : 0;
                  const bDate = b.net_30_due_date ? new Date(b.net_30_due_date).getTime() : 0;
                  return aDate - bDate; // Earliest dates (most overdue) first
                }).map((inv) => {
                  const dueDateObj = inv.net_30_due_date ? new Date(inv.net_30_due_date) : null;
                  const today = new Date();
                  today.setHours(0, 0, 0, 0); // Normalize to midnight for accurate day diff

                  let isOverdue = false;
                  let diffDays = 0;
                  let statusText = '';
                  let statusColor = 'bg-gray-50 text-gray-600 border-gray-200';

                  if (dueDateObj) {
                    const dueDateMidnight = new Date(dueDateObj);
                    dueDateMidnight.setHours(0, 0, 0, 0);
                    const diffTime = dueDateMidnight.getTime() - today.getTime();
                    diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    isOverdue = diffDays < 0;

                    if (isOverdue) {
                      statusText = `${Math.abs(diffDays)} days late`;
                      statusColor = 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30';
                    } else if (diffDays === 0) {
                      statusText = 'Due today';
                      statusColor = 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900/30';
                    } else {
                      statusText = `Due in ${diffDays} days`;
                      statusColor = 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30';
                    }
                  }

                  const dateStr = dueDateObj ? dueDateObj.toLocaleDateString() : 'N/A';

                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-dark-surface-hover transition-colors">
                      <td className="px-4 py-4 font-medium text-gray-900 dark:text-dark-text-primary">{inv.order_number}</td>
                      <td className="px-4 py-4 dark:text-dark-text-secondary">{inv.manufacturer_name}</td>
                      <td className="px-4 py-4 font-bold dark:text-dark-text-primary">₹{parseFloat(inv.total_amount).toLocaleString()}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusColor}`}>
                          {isOverdue && <AlertCircle size={12} />}
                          {dateStr} {statusText && <span className="opacity-75 font-medium ml-1">({statusText})</span>}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => handleRazorpayPayment(inv.id, parseFloat(inv.total_amount))}
                          disabled={isProcessing === inv.id}
                          className="inline-flex items-center gap-1 bg-black hover:bg-gray-800 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors active:scale-95"
                        >
                          {isProcessing === inv.id ? (
                            <span>Wait...</span>
                          ) : (
                            <>
                              <IndianRupee size={12} /> Pay Now
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditLineWidget;
