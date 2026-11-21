import React, { useRef, useState } from 'react';
import apiClient from '../../api/apiClient';

export default function ImageUploadWidget({
  label = 'Image / Icon',
  imageUrl = '',
  imagePublicId = '',
  onChange,
  onRemove,
  folder = 'adab/categories',
  disabled = false,
  description = 'Supports PNG, JPG, WebP, SVG. Recommended normal size max 2MB.'
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    // Show instant local preview while uploading
    const localPreviewUrl = URL.createObjectURL(file);
    if (onChange) {
      onChange({
        file,
        imageUrl: localPreviewUrl,
        imagePublicId: imagePublicId || ''
      });
    }

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', folder);

      const res = await apiClient.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success && res.data?.data) {
        // Successfully uploaded to Cloudinary
        const { imageUrl: cloudUrl, imagePublicId: cloudPublicId } = res.data.data;
        if (onChange) {
          onChange({
            file: null,
            imageUrl: cloudUrl,
            imagePublicId: cloudPublicId
          });
        }
      } else {
        setUploadError('Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err.response?.data?.message || 'Failed to upload to Cloudinary');
    } finally {
      setUploading(false);
    }
  };

  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    if (onChange) {
      onChange({
        imageUrl: newUrl,
        imagePublicId: imagePublicId || (newUrl ? `${folder}/asset_${Date.now()}` : '')
      });
    }
  };

  const handleClear = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploadError(null);
    if (onRemove) {
      onRemove();
    } else if (onChange) {
      onChange({ imageUrl: '', imagePublicId: '' });
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label className="block text-xs font-bold text-slate-700">{label}</label>
        {imageUrl && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled || uploading}
            className="text-[11px] text-rose-600 hover:text-rose-700 font-bold transition-colors"
          >
            Remove Image
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
        {/* Normal-sized Image Preview Box (w-14 h-14, 56px) */}
        <div className="relative w-14 h-14 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
          {uploading ? (
            <div className="flex flex-col items-center justify-center">
              <i className="fa-solid fa-spinner fa-spin text-indigo-600 text-base"></i>
              <span className="text-[9px] font-bold text-indigo-600 mt-1">Uploading</span>
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt="Asset Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://placehold.co/100x100?text=No+Img';
              }}
            />
          ) : (
            <i className="fa-regular fa-image text-slate-300 text-lg"></i>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              className="px-2.5 py-1 text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin text-indigo-600"></i>
                  <span>Uploading to Cloudinary...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-cloud-arrow-up text-indigo-600"></i>
                  <span>Browse File</span>
                </>
              )}
            </button>
            <span className="text-[11px] text-slate-400">or enter direct URL</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || uploading}
          />

          <input
            type="text"
            value={imageUrl || ''}
            onChange={handleUrlChange}
            placeholder="https://res.cloudinary.com/..."
            disabled={disabled || uploading}
            className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-600 font-mono text-slate-700 placeholder:text-slate-400 placeholder:font-sans"
          />
        </div>
      </div>

      {uploadError && (
        <p className="text-[11px] text-rose-600 font-semibold">{uploadError}</p>
      )}

      {description && <p className="text-[10px] text-slate-400 leading-tight">{description}</p>}
    </div>
  );
}
