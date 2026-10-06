import React, { useEffect, useState } from 'react';
import apiClient from '../../services/apiClient';
import { useNotification } from '../../context/NotificationContext';
import { Eye, CheckCircle, XCircle, FileText, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';

interface KybRequest {
  id: number;
  user_id: number;
  email: string;
  mobile: string;
  company_name: string;
  gst_certificate_url: string;
  pan_card_url: string;
  business_license_url: string;
  submitted_at: string;
  status: string;
}

const KycApprovalsPage: React.FC = () => {
  const [requests, setRequests] = useState<KybRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { showSuccess, showError } = useNotification();
  
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<number | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<string | null>(null);

  const fetchRequests = async (currentPage = 1) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/admin/kyc-requests?page=${currentPage}&limit=10`);
      if (response.data.success) {
        setRequests(response.data.data);
        setTotalPages(response.data.pagination?.totalPages || 1);
        setPage(currentPage);
      }
    } catch (error) {
      showError('Failed to load KYC requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id: number) => {
    try {
      await apiClient.put(`/admin/kyc-requests/${id}/approve`, {});
      showSuccess('KYC Approved successfully');
      fetchRequests(page);
    } catch (error) {
      showError('Approval failed');
    }
  };

  const handleReject = async () => {
    if (!showRejectModal || !rejectionReason.trim()) {
      showError('Reason is required');
      return;
    }
    
    try {
      await apiClient.put(`/admin/kyc-requests/${showRejectModal}/reject`, { reason: rejectionReason });
      showSuccess('KYC Rejected');
      setShowRejectModal(null);
      setRejectionReason('');
      fetchRequests(page);
    } catch (error) {
      showError('Rejection failed');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-in fade-in duration-500 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-white/5 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-gray-200 tracking-tight">KYC Approval Center</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Review and manage vendor compliance documents.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-adab-orange" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-200">Pending Approvals</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-white/5">
            <thead className="bg-gray-50/30 dark:bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Vendor Details</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Submitted</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Documents</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-sm font-medium text-gray-500 animate-pulse">Loading queue...</td></tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-medium">All caught up! No pending KYC requests.</p>
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-200">{req.company_name || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{req.email}</div>
                      <div className="text-xs font-medium text-gray-400 mt-1">{req.mobile}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">
                      {new Date(req.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        {req.gst_certificate_url && (
                          <button onClick={() => setShowPreviewModal(req.gst_certificate_url)} className="text-blue-600 hover:text-blue-800 flex items-center text-[10px] font-bold uppercase tracking-wider bg-blue-50/50 hover:bg-blue-100 px-2 py-1.5 rounded-lg transition-colors border border-blue-100">
                            <FileText className="w-3.5 h-3.5 mr-1.5" /> GST
                          </button>
                        )}
                        {req.pan_card_url && (
                          <button onClick={() => setShowPreviewModal(req.pan_card_url)} className="text-blue-600 hover:text-blue-800 flex items-center text-[10px] font-bold uppercase tracking-wider bg-blue-50/50 hover:bg-blue-100 px-2 py-1.5 rounded-lg transition-colors border border-blue-100">
                            <FileText className="w-3.5 h-3.5 mr-1.5" /> PAN
                          </button>
                        )}
                        {req.business_license_url && (
                          <button onClick={() => setShowPreviewModal(req.business_license_url)} className="text-blue-600 hover:text-blue-800 flex items-center text-[10px] font-bold uppercase tracking-wider bg-blue-50/50 hover:bg-blue-100 px-2 py-1.5 rounded-lg transition-colors border border-blue-100">
                            <FileText className="w-3.5 h-3.5 mr-1.5" /> License
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3">
                        <button onClick={() => handleApprove(req.id)} className="text-adab-green hover:bg-adab-green/10 p-2 rounded-xl transition-all" title="Approve">
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button onClick={() => setShowRejectModal(req.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all" title="Reject">
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="bg-gray-50/30 dark:bg-white/5 px-6 py-4 flex items-center justify-between border-t border-gray-100 dark:border-white/5">
          <button 
            disabled={page === 1} 
            onClick={() => fetchRequests(page - 1)}
            className="flex items-center text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </button>
          <span className="text-xs font-medium text-gray-400">Page {page} of {totalPages}</span>
          <button 
            disabled={page === totalPages} 
            onClick={() => fetchRequests(page + 1)}
            className="flex items-center text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-colors"
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl w-full max-w-md shadow-2xl scale-in-center">
            <div className="flex items-center gap-3 mb-6">
               <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                 <XCircle className="w-5 h-5 text-red-600" />
               </div>
               <h3 className="text-xl font-black text-gray-900 dark:text-gray-200">Reject KYC Request</h3>
            </div>
            
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
               Reason for Rejection
            </label>
            <textarea
              className="w-full border border-gray-200 dark:border-white/10 rounded-xl p-4 mb-6 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none text-sm"
              rows={4}
              placeholder="e.g. GST certificate is blurry..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowRejectModal(null)} className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleReject} className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-900/10 transition-all">Confirm Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-in fade-in">
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl scale-in-center overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-white/5">
              <h3 className="font-black text-gray-900 dark:text-gray-200 tracking-tight">Document Preview</h3>
              <button onClick={() => setShowPreviewModal(null)} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-xl transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 p-6 overflow-auto flex justify-center items-center">
               <img src={showPreviewModal} alt="Document Preview" className="max-w-full max-h-full object-contain rounded-lg shadow-sm border border-gray-200" onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<div class="text-center"><p class="text-gray-500 font-medium mb-4">Document URL is broken or not an image.</p><a href="'+showPreviewModal+'" target="_blank" class="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-blue-700">Open Directly</a></div>';
               }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KycApprovalsPage;
