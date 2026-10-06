import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import { useNotification } from '../../context/NotificationContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TableSkeleton } from '../../components/ui/TableSkeleton';
import { Input } from '../../components/ui/Input';

interface KYBRequest {
  id: number;
  user_id: number;
  company_name: string;
  registration_number: string;
  tax_id: string;
  document_url: string;
  status: string;
  rejection_reason: string | null;
  submitted_at: string;
  email: string;
  mobile: string;
}

export const AdminKYBReview: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<KYBRequest[]>([]);
  
  const [selectedRequest, setSelectedRequest] = useState<KYBRequest | null>(null);
  
  // Modals state
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/kyb-requests');
      if (res.data.success) {
        setRequests(res.data.data || []);
      }
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to fetch KYB requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApprove = async (id: number) => {
    if (!window.confirm('Are you sure you want to approve this KYB request?')) return;
    
    try {
      setIsProcessing(true);
      const res = await apiClient.put(`/admin/kyb-requests/${id}/approve`);
      if (res.data.success) {
        showSuccess('KYB request approved successfully');
        setIsDetailsModalOpen(false);
        fetchRequests();
      }
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to approve request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    
    if (!rejectionReason.trim()) {
      showError('Rejection reason is required');
      return;
    }

    try {
      setIsProcessing(true);
      const res = await apiClient.put(`/admin/kyb-requests/${selectedRequest.id}/reject`, {
        reason: rejectionReason
      });
      if (res.data.success) {
        showSuccess('KYB request rejected');
        setIsRejectModalOpen(false);
        setIsDetailsModalOpen(false);
        setRejectionReason('');
        fetchRequests();
      }
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to reject request');
    } finally {
      setIsProcessing(false);
    }
  };

  const openDetails = (req: KYBRequest) => {
    setSelectedRequest(req);
    setIsDetailsModalOpen(true);
  };

  const openReject = () => {
    setRejectionReason('');
    setIsRejectModalOpen(true);
  };

  // Helper to parse document_url which could be JSON string of docs, or direct URL
  const getParsedDocuments = (urlStr: string) => {
    try {
      if (urlStr.trim().startsWith('{')) {
        return JSON.parse(urlStr);
      }
    } catch(e) {}
    return { 'Main Document': urlStr };
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-dark-text-primary tracking-tight">KYB Review</h1>
          <p className="text-sm text-gray-500 mt-1">Review pending Know Your Business applications</p>
        </div>
        <Button onClick={fetchRequests} variant="outline" disabled={loading}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : requests.length === 0 ? (
        <div className="card-glass p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-dark-surface-card rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary mb-2">No Pending Requests</h3>
          <p className="text-gray-500 max-w-sm">There are currently no KYB applications waiting for review.</p>
        </div>
      ) : (
        <div className="card-glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500 dark:text-dark-text-muted">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-dark-surface-card dark:text-dark-text-secondary">
                <tr>
                  <th scope="col" className="px-6 py-4">Company Name</th>
                  <th scope="col" className="px-6 py-4">Contact</th>
                  <th scope="col" className="px-6 py-4">Tax ID / GSTIN</th>
                  <th scope="col" className="px-6 py-4">Submitted At</th>
                  <th scope="col" className="px-6 py-4">Status</th>
                  <th scope="col" className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} className="border-b dark:border-dark-border-secondary hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-dark-text-primary">
                      {req.company_name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span>{req.email}</span>
                        <span className="text-xs text-gray-400">{req.mobile}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{req.tax_id}</td>
                    <td className="px-6 py-4">{new Date(req.submitted_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <Badge variant="warning">{req.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="secondary" size="sm" onClick={() => openDetails(req)}>
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedRequest && (
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          title="KYB Application Details"
          maxWidth="2xl"
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsDetailsModalOpen(false)} disabled={isProcessing}>
                Close
              </Button>
              <Button variant="danger" onClick={openReject} disabled={isProcessing}>
                Reject
              </Button>
              <Button variant="primary" onClick={() => handleApprove(selectedRequest.id)} disabled={isProcessing} isLoading={isProcessing}>
                Approve
              </Button>
            </>
          }
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-500 mb-1">Company Name</h4>
                <p className="text-gray-900 dark:text-dark-text-primary font-medium">{selectedRequest.company_name}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-500 mb-1">Tax ID / GSTIN</h4>
                <p className="text-gray-900 dark:text-dark-text-primary font-medium">{selectedRequest.tax_id}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-500 mb-1">Registration Number</h4>
                <p className="text-gray-900 dark:text-dark-text-primary font-medium">{selectedRequest.registration_number || 'N/A'}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-500 mb-1">Contact Details</h4>
                <p className="text-gray-900 dark:text-dark-text-primary font-medium">{selectedRequest.email}</p>
                <p className="text-sm text-gray-500">{selectedRequest.mobile}</p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-dark-border-secondary pt-4">
              <h4 className="text-sm font-semibold text-gray-500 mb-4">Documents</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(getParsedDocuments(selectedRequest.document_url)).map(([label, url]) => (
                  url ? (
                    <div key={label} className="border border-gray-200 dark:border-dark-border-secondary rounded-lg p-2 flex flex-col items-center">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{label}</p>
                      {String(url).toLowerCase().endsWith('.pdf') ? (
                        <a 
                          href={String(url)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-center p-4 bg-gray-50 dark:bg-dark-surface-card rounded-lg text-adab-orange hover:underline w-full"
                        >
                          View PDF Document
                        </a>
                      ) : (
                        <a href={String(url)} target="_blank" rel="noopener noreferrer" className="block w-full">
                          <img 
                            src={String(url)} 
                            alt={label} 
                            className="w-full h-32 object-contain bg-gray-50 dark:bg-dark-surface-card rounded-lg hover:opacity-90 transition-opacity" 
                          />
                        </a>
                      )}
                    </div>
                  ) : null
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject KYB Request"
        maxWidth="md"
      >
        <form onSubmit={handleReject} className="space-y-4">
          <Input
            label="Rejection Reason"
            placeholder="Please specify why this application is rejected"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" isLoading={isProcessing}>
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
