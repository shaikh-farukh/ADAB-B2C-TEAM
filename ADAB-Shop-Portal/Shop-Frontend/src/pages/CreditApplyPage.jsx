import React, { useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import { useSeller } from '../context/SellerContext';

export default function CreditApplyPage() {
  const { submitCreditApplication, isProcessing } = useFinance();
  const { profile } = useSeller();
  
  const [formData, setFormData] = useState({
    bank: 'HDFC Bank (SME Loans)',
    limit: 500000,
    reason: 'Festival season stock-up',
    sales: 450000,
    purchases: 180000,
    agree: true
  });

  const [message, setMessage] = useState(null);

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
      alert("You must agree to the repayment terms.");
      return;
    }
    try {
      await submitCreditApplication(formData);
      setMessage({ type: 'success', text: 'Credit application submitted successfully!' });
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to submit application. Please try again.' });
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold">Apply for Credit</h1>
        <p className="text-sm text-gray-500">ADAB platform credit line • track applications • eligibility checker</p>
      </div>
      
      {message && (
        <div className={`p-4 rounded-xl font-bold ${message.type === 'success' ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}`}>
          {message.text}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleSubmit} className="card p-5 border-2 border-purple-200">
            <h2 className="font-extrabold text-lg mb-1">ADAB Buying Credit Line</h2>
            <p className="text-sm text-gray-500 mb-4">Buy stock now from any store — ADAB pays seller instantly, you pay ADAB in 14 days</p>
            
            <div className="grid sm:grid-cols-3 gap-3 mb-4 text-center text-sm">
              <div className="p-3 rounded-xl bg-purple-50">
                <div className="text-xs text-gray-500">Current limit</div>
                <div className="text-xl font-extrabold text-purple-900">₹2,50,000</div>
              </div>
              <div className="p-3 rounded-xl bg-green-50">
                <div className="text-xs text-gray-500">Available</div>
                <div className="text-xl font-extrabold text-green-800">₹2,50,000</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <div className="text-xs text-gray-500">Repay in</div>
                <div className="text-xl font-extrabold">14 days</div>
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              <div>
                <label className="font-bold block mb-1">Select Lending Bank / NBFC Partner *</label>
                <select name="bank" value={formData.bank} onChange={handleChange} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 font-semibold text-gray-800 bg-white">
                  <option value="HDFC Bank (SME Loans)">HDFC Bank (SME Loans)</option>
                  <option value="Bajaj Finserv">Bajaj Finserv</option>
                  <option value="SBI MSME">SBI MSME</option>
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Requested limit (₹)</label>
                <input type="number" name="limit" value={formData.limit} onChange={handleChange} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 font-bold text-purple-900" />
              </div>
              <div>
                <label className="font-bold block mb-1">Reason / Working Capital Purpose</label>
                <select name="reason" value={formData.reason} onChange={handleChange} className="w-full px-3 py-2.5 rounded-xl border border-gray-200">
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
                  <input type="number" name="sales" value={formData.sales} onChange={handleChange} className="w-full px-3 py-2.5 rounded-xl border border-gray-200" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Avg monthly purchases (₹)</label>
                  <input type="number" name="purchases" value={formData.purchases} onChange={handleChange} className="w-full px-3 py-2.5 rounded-xl border border-gray-200" />
                </div>
              </div>
              <div>
                <label className="font-bold block mb-1">GSTIN</label>
                <input type="text" value={profile?.gstin || '24AAAAA0000A1Z5'} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 font-mono text-green-800 bg-green-50" readOnly />
              </div>
              <label className="flex items-start gap-2 text-xs text-gray-600">
                <input type="checkbox" name="agree" checked={formData.agree} onChange={handleChange} className="mt-0.5" /> 
                I agree to repay within agreed days. Late payment may reduce my limit and affect store health score.
              </label>
              <button type="submit" disabled={isProcessing} className="btn-primary w-full py-3 font-bold text-sm disabled:opacity-50">
                {isProcessing ? 'Submitting Application...' : 'Submit Application to Bank'}
              </button>
            </div>
          </form>
          
          <div className="card p-5">
            <h3 className="font-bold mb-3">Application History</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 border border-green-200">
                <div>
                  <div className="font-bold">₹2,50,000 — Approved</div>
                  <div className="text-xs text-gray-500">Applied 15 Aug 2026 • Approved 17 Aug</div>
                </div>
                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-200 text-green-900">Active</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5 bg-green-50 border-green-200">
            <h3 className="font-bold text-green-900 mb-2">Eligibility Check</h3>
            <ul className="text-sm space-y-2">
              <li className="flex gap-2"><i className="fa-solid fa-check text-green-600"></i> GSTIN verified</li>
              <li className="flex gap-2"><i className="fa-solid fa-check text-green-600"></i> Bank account linked</li>
              <li className="flex gap-2"><i className="fa-solid fa-check text-green-600"></i> 90+ days on ADAB</li>
              <li className="flex gap-2"><i className="fa-solid fa-check text-green-600"></i> No overdue shop credit</li>
              <li className="flex gap-2"><i className="fa-solid fa-check text-green-600"></i> Store health: Grade A</li>
            </ul>
            <p className="text-xs text-green-800 mt-3 font-bold">You qualify for up to ₹5,00,000</p>
          </div>
          <div className="card p-5">
            <h3 className="font-bold mb-2">Shop Credit vs ADAB Credit</h3>
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b"><td className="py-2 font-bold">Shop credit</td><td className="py-2 text-gray-600">Seller gives days • you owe that store</td></tr>
                <tr className="border-b"><td className="py-2 font-bold">ADAB credit</td><td className="py-2 text-gray-600">You owe ADAB • seller paid instantly</td></tr>
                <tr><td className="py-2 font-bold">Limits</td><td className="py-2 text-gray-600">Max 5 shops • ₹25k each + ADAB line</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
