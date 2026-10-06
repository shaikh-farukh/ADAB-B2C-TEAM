import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  BookOpenText,
  CircleDollarSign,
  CreditCard,
  Landmark,
  Plus,
  ReceiptText,
  RefreshCw,
  Wallet,
  Download,
  Calendar,
} from 'lucide-react';
import paymentService from '../../services/paymentService';
import apiClient from '../../services/apiClient';
import { useNotification } from '../../context/NotificationContext';

const formatCurrency = (value: number) =>
  `Rs. ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const PaymentsPage: React.FC = () => {
  const { showError, showSuccess } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMode: 'ONLINE',
    referenceId: '',
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await paymentService.getDistributorPaymentData();
      if (response.success) setData(response.data);
      else showError('Unable to load the payment workspace.');
    } catch {
      showError('Unable to load the payment workspace.');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const suggestedAllocations = useMemo(() => {
    const amount = Number(paymentForm.amount || 0);
    if (!data || amount <= 0) return [];

    let remaining = amount;
    return data.invoices
      .filter((invoice: any) => invoice.balanceAmount > 0)
      .map((invoice: any) => {
        const applied = Math.min(invoice.balanceAmount, remaining);
        remaining -= applied;
        return { invoiceNumber: invoice.invoiceNumber, applied };
      })
      .filter((item: any) => item.applied > 0);
  }, [data, paymentForm.amount]);

  const handleRecordPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      showError("Please enter a valid amount");
      return;
    }
    
    setIsSubmitting(true);

    try {
      if (paymentForm.paymentMode === 'ONLINE') {
        const { loadRazorpayScript } = await import('../../utils/loadRazorpay');
        const res = await loadRazorpayScript();
        if (!res) {
          showError("Razorpay SDK failed to load. Are you online?");
          setIsSubmitting(false);
          return;
        }

        const checkoutResponse = await paymentService.createLedgerCheckout(Number(paymentForm.amount));
        if (!checkoutResponse.success) {
          showError(checkoutResponse.message || "Failed to initiate payment");
          setIsSubmitting(false);
          return;
        }

        const { razorpay_order_id, amount_paise, checkout_id } = checkoutResponse.data;

        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID?.trim(), // trim to prevent CRLF issues
          amount: amount_paise,
          name: "ADAB B2B Portal",
          description: "Distributor Ledger Top-up",
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
                showSuccess("Payment verified and recorded successfully!");
                setPaymentForm({ amount: '', paymentMode: 'ONLINE', referenceId: '' });
                await loadData();
              } else {
                showError("Payment verification failed");
              }
            } catch (error) {
              showError("Network error verifying payment");
            }
          },
          theme: { color: "#3399cc" }
        };

        const paymentObject = new (window as any).Razorpay(options);
        paymentObject.on('payment.failed', function () {
          showError("Payment Failed");
        });
        paymentObject.open();
        setIsSubmitting(false);
        return;
      } else {
        // Manual recording
        const response = await paymentService.recordPayment({
          amount: Number(paymentForm.amount),
          paymentMode: paymentForm.paymentMode as any,
          referenceId: paymentForm.referenceId,
          autoAllocate: true,
        });

        if (response.success) {
          showSuccess(response.message || 'Payment recorded.');
          setPaymentForm({ amount: '', paymentMode: 'ONLINE', referenceId: '' });
          await loadData();
        } else {
          showError(response.message || 'Payment could not be recorded.');
        }
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Payment could not be processed.';
      showError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string, invoiceNumber: string) => {
    try {
      showSuccess('Generating Invoice PDF...');
      const response = await apiClient.get(`/invoices/${invoiceId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showSuccess('Download started.');
    } catch (err) {
      showError('Failed to download invoice PDF.');
    }
  };

  const summaryCards = data
    ? [
        { label: 'Open Balance', value: formatCurrency(data.summary.totalOutstanding), icon: ReceiptText, tone: 'text-red-500 bg-red-50' },
        { label: 'Wallet Balance', value: formatCurrency(data.distributor.walletBalance), icon: Wallet, tone: 'text-adab-green bg-green-50' },
        { label: 'Used Credit', value: formatCurrency(data.distributor.usedCredit), icon: Landmark, tone: 'text-adab-orange bg-orange-50' },
        { label: 'Total Paid', value: formatCurrency(data.summary.totalPaid), icon: CircleDollarSign, tone: 'text-blue-500 bg-blue-50' },
      ]
    : [];

  return (
    <div className="space-y-8 md:space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          <div className="flex items-center gap-2 text-adab-orange mb-1.5">
            <ArrowRightLeft className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Payment Control Room</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-dark-text-secondary tracking-tight">Distributor Payments</h1>
          <p className="mt-1 text-sm text-gray-500 font-medium">
            Full view of invoice tracking, payment capture, auto-allocation, wallet handling, and ledger activity.
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center justify-center px-5 py-2.5 bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-xl text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-adab-green transition-all shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {!isLoading && !data ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-dark-surface-card border border-red-100 dark:border-red-900/30 rounded-3xl shadow-sm">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
            <RefreshCw className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-dark-text-primary mb-2">Failed to load data</h2>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary font-medium">There was an issue fetching your payment and invoice records.</p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {(isLoading ? Array.from({ length: 4 }) : summaryCards).map((card: any, index) => (
          <div key={index} className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-2xl p-6 shadow-sm">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-100" />
                <div className="h-3 w-24 bg-gray-100 rounded" />
                <div className="h-8 w-28 bg-gray-200 rounded" />
              </div>
            ) : (
              <>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${card.tone}`}>
                  <card.icon className="w-6 h-6" />
                </div>
                <p className="mt-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">{card.label}</p>
                <p className="mt-2 text-3xl font-black text-gray-900 dark:text-dark-text-secondary tracking-tight">{card.value}</p>
              </>
            )}
          </div>
        ))}
      </section>

      {/* Outstanding Aging Report Section */}
      <section className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Aging Analysis</p>
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-dark-text-secondary">Outstanding Aging Report</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {['0-30', '31-60', '61-90', '90+'].map((bucket) => {
            const bucketData = data?.agingReport?.[bucket] || { outstanding_amount: 0, invoice_count: 0 };
            const isCritical = bucket === '90+' && bucketData.outstanding_amount > 0;
            const isWarning = bucket === '61-90' && bucketData.outstanding_amount > 0;

            return (
              <div
                key={bucket}
                className={`border rounded-2xl p-5 transition-all ${
                  isCritical
                    ? 'border-red-200 bg-red-50/20 hover:bg-red-50/30'
                    : isWarning
                    ? 'border-orange-200 bg-orange-50/20 hover:bg-orange-50/30'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-gray-400">{bucket} Days</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    isCritical
                      ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {bucketData.invoice_count} {bucketData.invoice_count === 1 ? 'Invoice' : 'Invoices'}
                  </span>
                </div>
                <p className={`mt-4 text-2xl font-black ${
                  isCritical ? 'text-red-600' : isWarning ? 'text-orange-600' : 'text-gray-900 dark:text-dark-text-secondary'
                }`}>
                  {formatCurrency(bucketData.outstanding_amount)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-2 bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-3xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Invoice Register</p>
              <h2 className="text-lg font-extrabold text-gray-900 dark:text-dark-text-secondary mt-1">Outstanding and settled invoices</h2>
            </div>
            {!isLoading && (
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Available Credit</p>
                <p className="text-sm font-extrabold text-adab-green">{formatCurrency(data.distributor.availableCredit)}</p>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoice</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Due Date</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Gross</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Paid</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Credit Note</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Balance</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <tr key={index} className="animate-pulse">
                        <td className="px-6 py-5"><div className="h-4 w-24 bg-gray-100 rounded" /></td>
                        <td className="px-6 py-5"><div className="h-4 w-20 bg-gray-100 rounded" /></td>
                        <td className="px-6 py-5"><div className="h-4 w-16 ml-auto bg-gray-100 rounded" /></td>
                        <td className="px-6 py-5"><div className="h-4 w-16 ml-auto bg-gray-100 rounded" /></td>
                        <td className="px-6 py-5"><div className="h-4 w-16 ml-auto bg-gray-100 rounded" /></td>
                        <td className="px-6 py-5"><div className="h-4 w-16 ml-auto bg-gray-200 rounded" /></td>
                        <td className="px-6 py-5"><div className="h-6 w-20 mx-auto bg-gray-100 rounded-full" /></td>
                        <td className="px-6 py-5"><div className="h-6 w-10 mx-auto bg-gray-100 rounded-lg" /></td>
                      </tr>
                    ))
                  : data.invoices.map((invoice: any) => (
                      <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-gray-900 dark:text-dark-text-secondary">{invoice.invoiceNumber}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{invoice.orderNumber}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-sm font-semibold text-gray-600">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                        <td className="px-6 py-5 text-right text-sm font-bold text-gray-700">{formatCurrency(invoice.totalAmount)}</td>
                        <td className="px-6 py-5 text-right text-sm font-bold text-adab-green">{formatCurrency(invoice.paidAmount)}</td>
                        <td className="px-6 py-5 text-right text-sm font-bold text-adab-orange">{formatCurrency(invoice.creditedAmount)}</td>
                        <td className="px-6 py-5 text-right text-sm font-black text-gray-900 dark:text-dark-text-secondary">{formatCurrency(invoice.balanceAmount)}</td>
                        <td className="px-6 py-5 text-center">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              invoice.status === 'paid'
                                ? 'bg-green-50 text-adab-green'
                                : invoice.status === 'partial'
                                ? 'bg-orange-50 text-adab-orange'
                                : 'bg-red-50 text-red-500'
                            }`}
                          >
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <button
                            onClick={() => handleDownloadInvoice(invoice.id, invoice.invoiceNumber)}
                            className="p-1.5 hover:text-adab-green text-gray-400 hover:bg-gray-100 rounded-lg transition-all"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-8">
          <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-orange-50 text-adab-orange flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Record Payment</p>
                <h2 className="text-lg font-extrabold text-gray-900 dark:text-dark-text-secondary">Record Payment</h2>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleRecordPayment}>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Amount</label>
                <input
                  type="number"
                  min="1"
                  value={paymentForm.amount}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))}
                  placeholder="Enter amount"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-adab-orange/20"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Payment Mode</label>
                <select
                  value={paymentForm.paymentMode}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, paymentMode: event.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-adab-orange/20"
                >
                  <option value="ONLINE">Online Payment (Razorpay)</option>
                  <option value="UPI">UPI</option>
                  <option value="NEFT">NEFT</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              {paymentForm.paymentMode !== 'ONLINE' && (
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Reference ID</label>
                <input
                  type="text"
                  value={paymentForm.referenceId}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, referenceId: event.target.value }))}
                  placeholder="UPI12345 / NEFT7781"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-card border border-gray-200 dark:border-dark-border-secondary text-gray-900 dark:text-dark-text-secondary rounded-2xl text-sm outline-none focus:ring-2 focus:ring-adab-orange/20"
                />
              </div>
              )}

              <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-2xl p-4">
                <div className="flex items-center gap-2 text-gray-900 dark:text-dark-text-secondary">
                  <CreditCard className="w-4 h-4 text-adab-green" />
                  <p className="text-xs font-black uppercase tracking-widest">Auto allocation preview</p>
                </div>
                <div className="mt-3 space-y-2">
                  {suggestedAllocations.length > 0 ? (
                    suggestedAllocations.map((item: any) => (
                      <div key={item.invoiceNumber} className="flex items-center justify-between text-sm text-gray-600 dark:text-dark-text-muted">
                        <span>{item.invoiceNumber}</span>
                        <span className="font-black text-gray-900 dark:text-dark-text-secondary">{formatCurrency(item.applied)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-dark-text-muted">Enter an amount to preview how the UI will allocate it against open invoices.</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center px-5 py-3 bg-adab-orange text-white rounded-2xl text-xs font-black uppercase tracking-[0.18em] hover:bg-orange-700 transition-all shadow-lg"
              >
                {isSubmitting ? 'Processing...' : paymentForm.paymentMode === 'ONLINE' ? 'Pay Now with Razorpay' : 'Record Payment'}
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
                <BookOpenText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Settlement Rules</p>
                <h2 className="text-lg font-extrabold text-gray-900 dark:text-dark-text-secondary">Document scenarios mirrored in UI</h2>
              </div>
            </div>
            <div className="space-y-3">
              {isLoading
                ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />)
                : data.scenarios.map((scenario: any) => (
                    <div key={scenario.title} className="rounded-2xl border border-gray-200 p-4">
                      <p className="text-sm font-black text-gray-900 dark:text-dark-text-secondary">{scenario.title}</p>
                      <p className="mt-1 text-sm text-gray-500 leading-relaxed">{scenario.detail}</p>
                    </div>
                  ))}
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <section className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-3xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-dark-border-primary">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Payment Log</p>
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-dark-text-secondary mt-1">Recent captured payments</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-dark-border-primary">
            {isLoading
              ? Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-24 bg-gray-50 animate-pulse" />)
              : data.payments.map((payment: any) => (
                  <div key={payment.id} className="px-6 py-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-black text-gray-900 dark:text-dark-text-secondary">{payment.referenceId}</p>
                      <p className="text-xs text-gray-500 font-medium">
                        {payment.paymentMode} | {new Date(payment.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-black text-gray-900 dark:text-dark-text-secondary">{formatCurrency(payment.amount)}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-adab-green">{payment.status}</p>
                    </div>
                  </div>
                ))}
          </div>
        </section>

        <section className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-3xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-dark-border-primary">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Distributor Ledger</p>
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-dark-text-secondary mt-1">Running balance trail</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-dark-border-primary">
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-20 bg-gray-50 animate-pulse" />)
              : data.ledgerEntries.slice(0, 6).map((entry: any) => (
                  <div key={entry.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-black text-gray-900 dark:text-dark-text-secondary">{entry.description}</p>
                      <p className="text-xs text-gray-500 font-medium">
                        {entry.referenceId} | {new Date(entry.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black ${entry.credit > 0 ? 'text-adab-green' : 'text-red-500'}`}>
                        {entry.credit > 0 ? '+' : '-'}
                        {formatCurrency(entry.credit > 0 ? entry.credit : entry.debit)}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                        Balance {formatCurrency(entry.balance)}
                      </p>
                    </div>
                  </div>
                ))}
          </div>
        </section>
      </div>
        </>
      )}
    </div>
  );
};

export default PaymentsPage;
