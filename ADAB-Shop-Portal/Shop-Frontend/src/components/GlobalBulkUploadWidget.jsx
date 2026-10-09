import React, { useState, useEffect } from 'react';
import { useSeller } from '../context/SellerContext';
import { listingApi } from '../api/listingApi';

const GlobalBulkUploadWidget = () => {
  const { uploadJobs, setUploadJobs } = useSeller();
  const [isWidgetMinimized, setIsWidgetMinimized] = useState(false);

  // Polling for active background jobs globally
  useEffect(() => {
    const activeJobs = uploadJobs.filter(j => j.state !== 'completed' && j.state !== 'failed');
    if (activeJobs.length === 0) return;

    const timer = setInterval(async () => {
      for (const job of activeJobs) {
        try {
          const res = await listingApi.checkUploadStatus(job.id);
          if (res.success) {
            setUploadJobs(prev => prev.map(p => p.id === job.id ? {
              ...p,
              state: res.data.state,
              progress: res.data.progress || 0,
              result: res.data.result
            } : p));
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [uploadJobs, setUploadJobs]);

  if (uploadJobs.length === 0) return null;

  return (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ease-out flex flex-col items-end ${isWidgetMinimized ? 'translate-y-0' : 'translate-y-0'}`}>
      <div className={`bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden transition-all duration-300 ease-in-out ${isWidgetMinimized ? 'w-[280px] h-[60px]' : 'w-[350px] max-h-[400px]'}`}>
        
        {/* Widget Header */}
        <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between cursor-pointer" onClick={() => setIsWidgetMinimized(!isWidgetMinimized)}>
          <div className="flex items-center gap-2 font-bold text-sm">
            <i className={`fa-solid fa-cloud-arrow-up ${uploadJobs.some(j => j.state === 'active') ? 'animate-bounce text-blue-400' : 'text-green-400'}`}></i>
            <span>Bulk Uploads ({uploadJobs.filter(j => j.state !== 'completed').length} active)</span>
          </div>
          <button className="text-gray-400 hover:text-white transition">
            <i className={`fa-solid ${isWidgetMinimized ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
          </button>
        </div>

        {/* Widget Body */}
        {!isWidgetMinimized && (
          <div className="bg-gray-50 p-2 overflow-y-auto max-h-[300px] flex flex-col gap-2">
            {uploadJobs.map(job => (
              <div key={job.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <i className="fa-solid fa-file-csv text-emerald-600 text-lg"></i>
                    <span className="text-xs font-bold text-gray-800 truncate" title={job.filename}>{job.filename}</span>
                  </div>
                  {job.state === 'completed' ? (
                    <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">DONE</span>
                  ) : job.state === 'failed' ? (
                    <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">FAILED</span>
                  ) : (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">{job.progress}%</span>
                  )}
                </div>
                
                {/* Progress Bar */}
                {job.state !== 'completed' && job.state !== 'failed' && (
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1 overflow-hidden">
                    <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${job.progress}%` }}></div>
                  </div>
                )}
                
                {/* Status Text */}
                {job.state === 'completed' && job.result && (
                  <div className="text-[10px] text-gray-500 font-medium">
                    <span className="text-green-600 font-bold">{job.result.successCount || job.result.total} saved</span> 
                    {job.result.failCount > 0 && <span className="text-red-500 ml-2">({job.result.failCount} failed)</span>}
                  </div>
                )}
                {job.state === 'active' && (
                  <div className="text-[10px] text-gray-500 font-medium animate-pulse">Processing rows...</div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Clear Button */}
        {!isWidgetMinimized && uploadJobs.every(j => j.state === 'completed' || j.state === 'failed') && (
          <div className="p-2 bg-white border-t border-gray-100">
            <button onClick={() => setUploadJobs([])} className="w-full py-2 text-sm font-extrabold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition shadow-md">
              OK (Close)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalBulkUploadWidget;
