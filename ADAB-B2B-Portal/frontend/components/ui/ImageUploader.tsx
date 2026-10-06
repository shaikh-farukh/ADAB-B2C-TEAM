import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { UploadCloud, Image as ImageIcon, X, Loader2, CheckCircle2 } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

interface ImageUploaderProps {
  onUploadSuccess: (url: string) => void;
  cloudName?: string;
  uploadPreset?: string;
  className?: string;
  label?: string;
  defaultImage?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUploadSuccess,
  cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'demo',
  uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'demo_preset',
  className = '',
  label = 'Upload Image',
  defaultImage
}) => {
  const { showError, showSuccess } = useNotification();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(defaultImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const uploadToCloudinary = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showError('Please upload an image file (JPEG, PNG, WebP)');
      return;
    }

    // Set preview immediately for better UX
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    setIsUploading(true);
    setProgress(0);

    // Simulate upload if using demo credentials
    if (cloudName === 'demo' || uploadPreset === 'demo_preset') {
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 10;
        setProgress(currentProgress);
        if (currentProgress >= 100) {
          clearInterval(interval);
          setPreviewUrl(objectUrl); // Use local object URL as the 'uploaded' URL
          onUploadSuccess(objectUrl);
          showSuccess('Image uploaded successfully (Simulated)');
          setIsUploading(false);
        }
      }, 200);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            setProgress(percentCompleted);
          }
        }
      );

      const secureUrl = response.data.secure_url;
      setPreviewUrl(secureUrl);
      onUploadSuccess(secureUrl);
      showSuccess('Image uploaded successfully');
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      showError('Failed to upload image to Cloudinary');
      // Revert preview on failure if it wasn't the default
      if (defaultImage) setPreviewUrl(defaultImage);
      else setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadToCloudinary(e.dataTransfer.files[0]);
    }
  }, [cloudName, uploadPreset, onUploadSuccess]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadToCloudinary(e.target.files[0]);
    }
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onUploadSuccess(''); // Pass empty string to clear
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">
          {label}
        </label>
      )}

      <div
        className={`relative w-full rounded-3xl border-2 border-dashed transition-all duration-300 overflow-hidden group
          ${isDragging 
            ? 'border-adab-orange bg-orange-50/10 dark:bg-orange-900/10 scale-[1.02]' 
            : previewUrl 
              ? 'border-transparent bg-gray-50 dark:bg-dark-surface-card hover:border-gray-300 dark:hover:border-white/20' 
              : 'border-gray-200 dark:border-dark-border-secondary bg-gray-50 dark:bg-dark-surface-card hover:border-adab-green/50 dark:hover:border-adab-green/30'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={isUploading}
        />

        <div className="min-h-[160px] flex flex-col items-center justify-center p-6 text-center cursor-pointer relative z-10 h-full">
          {isUploading ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <Loader2 className="w-10 h-10 text-adab-orange animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-gray-900 dark:text-dark-text-primary">
                  {progress}%
                </div>
              </div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Uploading to Cloudinary...
              </p>
            </div>
          ) : previewUrl ? (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-[200px] object-contain rounded-xl shadow-sm"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center backdrop-blur-sm">
                <button
                  type="button"
                  onClick={removeImage}
                  className="w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                  title="Remove image"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="absolute bottom-2 right-2 bg-green-500/90 text-white p-1.5 rounded-full shadow-sm backdrop-blur-md">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3 group-hover:scale-105 transition-transform duration-300">
              <div className="w-14 h-14 bg-white dark:bg-dark-app-secondary rounded-2xl flex items-center justify-center text-gray-400 dark:text-dark-text-disabled shadow-sm border border-gray-100 dark:border-dark-border-primary group-hover:text-adab-green transition-colors">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-black text-gray-700 dark:text-dark-text-secondary mb-1">
                  Click or drag image here
                </p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <ImageIcon className="w-3 h-3" /> JPG, PNG, WebP
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Upload progress bar overlay */}
        {isUploading && (
          <div className="absolute bottom-0 left-0 h-1.5 bg-gray-200 dark:bg-gray-700 w-full z-20">
            <div
              className="h-full bg-adab-orange transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};