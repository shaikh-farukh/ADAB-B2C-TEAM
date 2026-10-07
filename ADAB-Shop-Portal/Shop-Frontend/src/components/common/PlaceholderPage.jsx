import React from 'react';

export default function PlaceholderPage({ title, fileName, description }) {
  return (
    <div className="card p-8 sm:p-12 text-center max-w-2xl mx-auto my-8 border-2 border-dashed border-purple-200 bg-purple-50/40">
      <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-2xl mx-auto mb-4">
        <i className="fa-solid fa-boxes-stacked"></i>
      </div>
      
      <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-200/70 text-purple-900">
        Assigned to Shabbir
      </span>
      
      <h2 className="text-2xl font-extrabold text-gray-900 mt-3 mb-1">{title}</h2>
      <p className="text-sm text-gray-600 mb-6">{description}</p>
      
      <div className="p-4 rounded-xl bg-white border border-purple-100 text-left font-mono text-xs text-gray-700 space-y-1.5 shadow-sm">
        <div className="text-[10px] uppercase font-bold text-gray-400">Target Source File</div>
        <div className="text-purple-700 font-bold break-all flex items-center gap-1.5">
          <i className="fa-solid fa-file-code"></i>
          <span>src/pages/{fileName}</span>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-4">
        This page will be implemented by Shabbir as part of the Products &amp; Catalog Domain sprint.
      </p>
    </div>
  );
}
