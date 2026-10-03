import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';


interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
      setSuccessMsg(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'}/manufacturer/products/bulk-import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      setSuccessMsg(data.message);
      if (data.errors && data.errors.length > 0) {
        setError(`Import completed with some errors: ${data.errors.join(', ')}`);
      } else {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-dark-surface-card rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-dark-border-primary">
          <h2 className="text-xl font-black text-gray-900 dark:text-dark-text-primary tracking-tight">Bulk Import Products</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-dark-text-muted hover:text-gray-600 dark:hover:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="mb-6">
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
              Upload a CSV file containing your products. The CSV must have the following header columns:
              <br/>
              <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 dark:text-dark-text-primary p-1 rounded">product_name, category, price, stock_quantity, moq</code>
            </p>
            <div 
              className="border-2 border-dashed border-gray-300 dark:border-dark-border-primary rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-surface-elevated transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 text-gray-400 dark:text-dark-text-muted mb-3" />
              <p className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary">Click to select CSV file</p>
              <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-1">.csv files only</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".csv" 
                className="hidden"
              />
            </div>
          </div>

          {file && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg mb-4">
              <FileText className="w-5 h-5" />
              <span className="text-sm font-medium truncate">{file.name}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg mb-4 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg mb-4 text-sm flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-dark-border-primary bg-gray-50 dark:bg-dark-surface-elevated flex justify-end gap-3 rounded-b-2xl">
          <button 
            type="button"
            className="px-4 py-2 border border-gray-300 dark:border-dark-border-primary text-gray-700 dark:text-dark-text-secondary rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            onClick={onClose}
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-adab-green text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            onClick={handleUpload}
            disabled={!file || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
};
