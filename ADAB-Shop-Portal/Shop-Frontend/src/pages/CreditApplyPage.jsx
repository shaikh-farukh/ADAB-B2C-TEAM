import React, { useState, useEffect } from 'react';
import { sellerApi } from '../api/sellerApi';
import { useSeller } from '../context/SellerContext';
import { useTranslation } from '../context/LanguageContext';

export default function CreditApplyPage() {
  const { t } = useTranslation();
  const { profile } = useSeller();

  const [banks, setBanks] = useState([]);
  const [creditBalance, setCreditBalance] = useState({ total_limit: 0, available_amount: 0 });
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const [formData, setFormData] = useState({
    bank_id: '',
    limit: 500000,
    reason: 'Festival season stock-up',
    sales: 450000,
    purchases: 180000,
    agree: true
  });

  const loadPageData = async () => {
    try {
      setLoading(true);
      const [banksRes, balanceRes, appsRes] = await Promise.allSettled([
        sellerApi.getBankPartners(),
        sellerApi.getBuyerCreditBalance(),
        sellerApi.getCreditApplications()
      ]);

      if (banksRes.status === 'fulfilled' && banksRes.value?.data) {
        const bankList = Array.isArray(banksRes.value.data) ? banksRes.value.data : (banksRes.value.data?.data || []);
        setBanks(bankList);
        if (bankList.length > 0 && !formData.bank_id) {
          setFormData(prev => ({ ...prev, bank_id: bankList[0].id }));
        }
      }

      if (balanceRes.status === 'fulfilled' && balanceRes.value?.data) {
        const balData = balanceRes.value.data?.data || balanceRes.value.data || {};
        setCreditBalance({
          total_limit: Number(balData.total_limit || 0),
          available_amount: Number(balData.available_amount || 0)
        });
      }

      if (appsRes.status === 'fulfilled' && appsRes.value?.data) {
        const appList = Array.isArray(appsRes.value.data) ? appsRes.value.data : (appsRes.value.data?.data || []);
        setApplications(appList);
      }
    } catch (err) {
      console.error('Error loading credit apply data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.agree) {
      alert('You must agree to the repayment terms.');
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await sellerApi.submitCreditApply(formData);
      if (res?.success) {
        setMessage({ type: 'success', text: `Credit application ${res.data?.application?.application_no || ''} submitted successfully!` });
        await loadPageData();
      } else {
        setMessage({ type: 'error', text: res?.error || 'Failed to submit application.' });
      }
      setTimeout(() => setMessage(null), 6000);
    } catch (err) {
      console.error('Credit apply error:', err);
      setMessage({ type: 'error', text: err?.response?.data?.error || err.message || 'Failed to submit application.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold">{t('creditApplyTitle', 'Apply for Credit')}</h1>
        <p className="text-sm text-gray-500">ADAB platform credit line • track applications • eligibility checker</p>
      </div>
      
      {message && (
        <div className={`p-4 rounded-xl font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' : 'bg-rose-100 text-rose-900 border border-rose-200'}`}>
          <i className={`fa-solid ${message.type === 'success' ? 'fa-circle-check text-emerald-600' : 'fa-circle-exclamation text-rose-600'}`}></i>
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleSubmit} className="card p-5 border-2 border-purple-200">
            <h2 className="font-extrabold text-lg mb-1">ADAB Buying Credit Line</h2>
            <p className="text-sm text-gray-500 mb-4">Buy stock now from any store — ADAB pays seller instantly, you pay in scheduled days</p>
            
            <div className="grid sm:grid-cols-3 gap-3 mb-4 text-center text-sm">
              <div className="p-3 rounded-xl bg-purple-50">
                <div className="text-xs text-gray-500">Current limit</div>
                <div className="text-xl font-extrabold text-purple-900">
                  ₹{creditBalance.total_limit.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-green-50">
                <div className="text-xs text-gray-500">Available</div>
                <div className="text-xl font-extrabold text-green-800">
                  ₹{creditBalance.available_amount.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <div className="text-xs text-gray-500">Repay in</div>
                <div className="text-xl font-extrabold">14–90 days</div>
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              <div>
                <label className="font-bold block mb-1">Select Lending Bank / NBFC Partner *</label>
                <select 
                  name="bank_id" 
                  value={formData.bank_id} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 font-semibold text-gray-800 bg-white"
                  required
                >
                  {banks.length === 0 ? (
                    <option value="">Loading live bank partners...</option>
                  ) : (
                    banks.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} (Max limit: ₹{Number(b.max_credit_limit).toLocaleString('en-IN')} • {b.interest_rate_pct}% p.m.)
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1">Requested limit (₹)</label>
                <input 
                  type="number" 
                  name="limit" 
                  value={formData.limit} 
                  onChange={handleChange} 
                  min="50000"
                  step="10000"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 font-bold text-purple-900 bg-white" 
                  required
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Reason / Working Capital Purpose</label>
                <select name="reason" value={formData.reason} onChange={handleChange} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white">
                  <option value="Festival season stock-up">Festival season stock-up</option>
                  <option value="New product category expansion">New product category expansion</option>
                  <option value="Regular wholesale purchase">Regular wholesale purchase</option>
                  <option value="Store renovation & cold storage">Store renovation & cold storage</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Avg monthly sales (₹)</label>
                  <input type="number" name="sales" value={formData.sales} onChange={handleChange} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Avg monthly purchases (₹)</label>
                  <input type="number" name="purchases" value={formData.purchases} onChange={handleChange} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white" />
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1">GSTIN</label>
                <input type="text" value={profile?.gstin || 'GST Verified Store'} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 font-mono text-green-800 bg-green-50" readOnly />
              </div>

              <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" name="agree" checked={formData.agree} onChange={handleChange} className="mt-0.5" /> 
                <span>I agree to repay within agreed days. Late payment may reduce my limit and affect store health score.</span>
              </label>

              <button type="submit" disabled={isSubmitting || loading} className="btn-primary w-full py-3 font-bold text-sm disabled:opacity-50 cursor-pointer">
                {isSubmitting ? 'Submitting Application...' : 'Submit Application to Bank'}
              </button>
            </div>
          </form>
          
          <div className="card p-5">
            <h3 className="font-bold mb-3 flex items-center justify-between">
              <span>Application History</span>
              <span className="text-xs text-gray-400 font-normal">Real-time status</span>
            </h3>

            {loading ? (
              <div className="text-center py-4 text-xs text-gray-400">
                <i className="fa-solid fa-spinner fa-spin mr-1.5"></i> Loading applications...
              </div>
            ) : applications.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400 bg-gray-50 rounded-xl">
                <i className="fa-solid fa-file-invoice text-xl mb-1 text-gray-300 block"></i>
                No credit line applications submitted yet. Submit the form above to apply.
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                {applications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <div>
                      <div className="font-bold text-gray-900">
                        ₹{Number(app.requested_amount || 0).toLocaleString('en-IN')} — {app.bank_name || 'Bank Partner'}
                      </div>
                      <div className="text-xs text-gray-500">
                        App No: <span className="font-mono">{app.application_no}</span> • Applied {formatDate(app.created_at)}
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                      app.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5 bg-green-50 border-green-200">
            <h3 className="font-bold text-green-900 mb-2">Eligibility Check</h3>
            <ul className="text-sm space-y-2">
              <li className="flex gap-2"><i className="fa-solid fa-check text-green-600"></i> GSTIN verified</li>
              <li className="flex gap-2"><i className="fa-solid fa-check text-green-600"></i> Bank account linked</li>
              <li className="flex gap-2"><i className="fa-solid fa-check text-green-600"></i> Active merchant on ADAB</li>
              <li className="flex gap-2"><i className="fa-solid fa-check text-green-600"></i> No overdue defaults</li>
              <li className="flex gap-2"><i className="fa-solid fa-check text-green-600"></i> Verified store compliance</li>
            </ul>
            <p className="text-xs text-green-800 mt-3 font-bold">Fast-track approval within 24–48 hours</p>
          </div>

          <div className="card p-5">
            <h3 className="font-bold mb-2">Shop Credit vs ADAB Credit</h3>
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b"><td className="py-2 font-bold">Shop credit</td><td className="py-2 text-gray-600">Seller gives days • you owe that store</td></tr>
                <tr className="border-b"><td className="py-2 font-bold">ADAB credit</td><td className="py-2 text-gray-600">Bank funds line • supplier paid instantly</td></tr>
                <tr><td className="py-2 font-bold">Limits</td><td className="py-2 text-gray-600">Up to ₹15,00,000 based on turnover</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
