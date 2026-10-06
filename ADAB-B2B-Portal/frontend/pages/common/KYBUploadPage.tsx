import React, { useState, useEffect } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { ShieldCheck, UploadCloud, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import authService from '../../services/authService';

const KYBUploadPage: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [file, setFile] = useState<File | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [taxId, setTaxId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [kybStatus, setKybStatus] = useState<string>('unsubmitted');
  const [rejectionReason, setRejectionReason] = useState<string>('');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await authService.getKybStatus();
        if (response.success && response.data) {
          setKybStatus(response.data.status || 'unsubmitted');
          if (response.data.rejection_reason) {
            setRejectionReason(response.data.rejection_reason);
          }
        }
      } catch (error) {
        console.error("Failed to fetch KYB status", error);
      } finally {
        setIsPageLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      showError('Please select a document to upload');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Upload to MinIO via authService
      const formData = new FormData();
      formData.append('file', file);

      const uploadData = await authService.uploadDocument(formData);
      if (!uploadData.success) {
        throw new Error(uploadData.message || 'Upload failed');
      }

      const documentUrl = uploadData.data?.url || uploadData.url;

      // 2. Submit KYB Data via authService
      const kybData = await authService.submitKyb({
        document_url: documentUrl,
        document_type: 'business_registration',
        company_name: companyName,
        registration_number: registrationNumber,
        tax_id: taxId
      });
      
      if (kybData.success) {
        showSuccess('KYB details submitted successfully for review!');
        setKybStatus('pending');
      } else {
        throw new Error(kybData.message || 'KYB submission failed');
      }

    } catch (err: any) {
      const serverMessage = err.response?.data?.message;
      showError(serverMessage || err.message || 'An error occurred during submission');
    } finally {
      setIsLoading(false);
    }
  };

  if (isPageLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] animate-in fade-in">
        <Loader2 className="w-10 h-10 text-adab-green animate-spin mb-4" />
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Loading Verification Status...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
        <div className="bg-adab-green py-6 px-8 flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-xl">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Business Verification (KYB)</h1>
            <p className="text-green-100 mt-1">Submit your corporate documents to unlock full portal access</p>
          </div>
        </div>

        {kybStatus === 'approved' ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-20 h-20 text-adab-green mx-auto mb-6" />
            <h2 className="text-2xl font-black text-gray-900 mb-2">Verification Approved</h2>
            <p className="text-gray-500">Your business has been successfully verified. You have full access to the platform.</p>
          </div>
        ) : kybStatus === 'pending' ? (
          <div className="p-12 text-center">
            <Loader2 className="w-20 h-20 text-adab-orange animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-black text-gray-900 mb-2">Verification Pending</h2>
            <p className="text-gray-500">Your KYB documents are currently under review by our admin team. This usually takes 1-2 business days.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {kybStatus === 'rejected' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
                <div>
                  <h4 className="font-bold text-red-800">Previous Submission Rejected</h4>
                  <p className="text-sm text-red-600 mt-1">{rejectionReason || 'Your previous submission did not meet our requirements. Please try again with valid documents.'}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Company Name</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-adab-green/20 focus:border-adab-green outline-none"
                  placeholder="Enter registered name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Registration Number</label>
                <input
                  type="text"
                  required
                  value={registrationNumber}
                  onChange={e => setRegistrationNumber(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-adab-green/20 focus:border-adab-green outline-none"
                  placeholder="e.g. CIN / CRN"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tax ID / GST Number</label>
              <input
                type="text"
                required
                value={taxId}
                onChange={e => setTaxId(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-adab-green/20 focus:border-adab-green outline-none"
                placeholder="Enter Tax ID"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Registration Document</label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-adab-green transition-colors cursor-pointer relative">
                <input 
                  type="file" 
                  accept=".pdf,image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-adab-green font-medium">
                    <FileText className="w-5 h-5" />
                    {file.name}
                  </div>
                ) : (
                  <>
                    <p className="text-gray-600 font-medium">Click or drag file to upload</p>
                    <p className="text-sm text-gray-400 mt-1">PDF, JPG, PNG up to 10MB (Powered by MinIO)</p>
                  </>
                )}
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading || !file}
                className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all ${isLoading || !file ? 'bg-gray-400 cursor-not-allowed' : 'bg-adab-green hover:bg-green-800 hover:shadow-xl active:scale-[0.98]'}`}
              >
                {isLoading ? 'Uploading & Verifying...' : 'Submit Verification Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default KYBUploadPage;
