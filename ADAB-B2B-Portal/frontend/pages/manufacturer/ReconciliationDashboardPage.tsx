import React, { useState, useEffect } from 'react';
import { PieChart, Activity, DollarSign, FileText } from 'lucide-react';
import paymentService from '../../services/paymentService';

const ReconciliationDashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await paymentService.getReconciliationDashboard();
      if (res.success) {
        setData(res.data);
      } else {
        setErrorMsg('Failed to fetch data: ' + JSON.stringify(res));
      }
    } catch (e: any) {
      setErrorMsg('Error: ' + e.message);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-8 text-red-500 font-bold bg-red-50 rounded">
        <h3>DEBUG ERROR</h3>
        <p>{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Reconciliation & Adjustments</h1>
          <p className="text-sm text-gray-500 font-bold mt-2">Finance summary dashboard</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Invoices</p>
            <p className="text-2xl font-black text-gray-900">{data?.totalInvoices || 0}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Paid Invoices</p>
            <p className="text-2xl font-black text-gray-900">{data?.paidInvoices || 0}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Partially Paid</p>
            <p className="text-2xl font-black text-gray-900">{data?.partialInvoices || 0}</p>
          </div>
        </div>
        <div className="bg-red-50 p-6 rounded-2xl shadow-sm border border-red-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Total Outstanding</p>
            <p className="text-2xl font-black text-red-700">₹{parseFloat(data?.outstandingAmount || 0).toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center">
            <PieChart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Settlements Pending</p>
            <p className="text-2xl font-black text-gray-900">{data?.settlementsPending || 0}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Credit Notes</p>
            <p className="text-2xl font-black text-gray-900">{data?.creditNotes || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReconciliationDashboardPage;
