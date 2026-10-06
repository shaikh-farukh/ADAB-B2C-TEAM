import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { useNotification } from '../../context/NotificationContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { ImageUploader } from '../../components/ui/ImageUploader';
import { Skeleton } from '../../components/ui/Skeleton';

type KYBStatus = 'unsubmitted' | 'pending' | 'approved' | 'rejected';

interface KYBData {
  status: KYBStatus;
  rejection_reason?: string;
  submitted_at?: string;
}

export const KYBOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [kybData, setKybData] = useState<KYBData | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [companyName, setCompanyName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [taxId, setTaxId] = useState('');
  
  // Document URLs
  const [gstUrl, setGstUrl] = useState('');
  const [panUrl, setPanUrl] = useState('');
  const [licenseUrl, setLicenseUrl] = useState('');

  const fetchStatus = async () => {
    try {
      setLoadingStatus(true);
      const res = await apiClient.get('/auth/kyb-status');
      if (res.data.success) {
        setKybData(res.data.data);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Handled by interceptor, but we can safely redirect just in case
      } else {
        showError(error.response?.data?.message || 'Failed to fetch KYB status');
      }
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      return showError('Company name is required');
    }
    if (!taxId.trim()) {
      return showError('Tax ID / GSTIN is required');
    }
    if (!licenseUrl && !gstUrl && !panUrl) {
      return showError('At least one document is required');
    }

    // Combine URLs since backend expects a single document_url string
    const docs = {
      gst: gstUrl,
      pan: panUrl,
      license: licenseUrl
    };
    const documentUrlString = JSON.stringify(docs);

    try {
      setIsSubmitting(true);
      const res = await apiClient.post('/auth/kyb-submit', {
        company_name: companyName,
        registration_number: registrationNumber,
        tax_id: taxId,
        document_url: documentUrlString
      });

      if (res.data.success) {
        showSuccess('KYB request submitted successfully');
        fetchStatus();
      }
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to submit KYB');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingStatus) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <Skeleton className="h-8 w-64" />
        <div className="card-glass p-8 space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const status = kybData?.status || 'unsubmitted';
  const isPending = status === 'pending';
  const isVerified = status === 'approved';
  const isRejected = status === 'rejected';
  
  const getStatusBadge = () => {
    if (isPending) return <Badge variant="warning">Pending Review</Badge>;
    if (isVerified) return <Badge variant="success">Verified</Badge>;
    if (isRejected) return <Badge variant="danger">Rejected</Badge>;
    return <Badge variant="default">Not Submitted</Badge>;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-dark-text-primary tracking-tight">
            KYB Verification
          </h1>
          <p className="text-sm text-gray-500 dark:text-dark-text-muted mt-1">
            Complete your business profile to unlock full platform features.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary">Status:</span>
          {getStatusBadge()}
        </div>
      </div>

      {isRejected && kybData?.rejection_reason && (
        <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-xl">
          <h3 className="text-sm font-bold text-red-800 dark:text-red-400">Rejection Reason:</h3>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">{kybData.rejection_reason}</p>
        </div>
      )}

      {isVerified || isPending ? (
        <div className="card-glass p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center bg-gray-100 dark:bg-dark-surface-card mb-4">
            {isVerified ? (
              <svg className="w-8 h-8 text-adab-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-adab-orange animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">
            {isVerified ? 'Your Business is Verified!' : 'Verification in Progress'}
          </h2>
          <p className="text-gray-500 dark:text-dark-text-muted max-w-md mx-auto">
            {isVerified 
              ? 'Thank you for completing your KYB. You now have full access to ADAB B2B.' 
              : 'Our team is currently reviewing your documents. This usually takes 1-2 business days.'}
          </p>
          <div className="pt-6">
            <Button onClick={() => navigate('/dashboard')} variant="primary">
              Go to Dashboard
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card-glass p-6 lg:p-8 space-y-8">
          
          {/* Business Information Section */}
          <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-dark-border-secondary pb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary uppercase tracking-wider">
                Business Information
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Input
                  label="Company Name"
                  placeholder="Enter registered business name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>
              <Input
                label="Registration Number"
                placeholder="e.g. CIN, UEN"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
              />
              <Input
                label="Tax ID / GSTIN"
                placeholder="Enter GSTIN"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Documents Section */}
          <div className="space-y-6 pt-6">
            <div className="border-b border-gray-200 dark:border-dark-border-secondary pb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary uppercase tracking-wider">
                Verification Documents
              </h2>
              <p className="text-sm text-gray-500 mt-1">Upload clear images or scans of your business documents.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ImageUploader 
                label="GST / Tax Document"
                onUploadSuccess={setGstUrl}
                defaultImage={gstUrl}
              />
              <ImageUploader 
                label="PAN Document"
                onUploadSuccess={setPanUrl}
                defaultImage={panUrl}
              />
              <ImageUploader 
                label="Business License"
                onUploadSuccess={setLicenseUrl}
                defaultImage={licenseUrl}
              />
            </div>
          </div>

          <div className="pt-8 border-t border-gray-200 dark:border-dark-border-secondary flex justify-end">
            <Button 
              type="submit" 
              variant="primary" 
              disabled={isSubmitting}
              className="w-full md:w-auto px-10 py-3"
            >
              {isSubmitting ? 'Submitting...' : 'Submit for Verification'}
            </Button>
          </div>

        </form>
      )}
    </div>
  );
};
