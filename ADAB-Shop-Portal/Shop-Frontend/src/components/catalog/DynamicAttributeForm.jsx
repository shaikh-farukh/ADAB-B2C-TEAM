import React, { useState, useEffect } from 'react';
import listingService from '../../services/listingService';

export default function DynamicAttributeForm({ categoryId, values = {}, onChange }) {
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!categoryId) {
      setAttributes([]);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    listingService.getCategoryAttributes(categoryId)
      .then(res => {
        if (isMounted) {
          // Filter out variant-defining keys (size/color) as they are configured in the Variant Matrix
          const rawAttrs = res?.attributes || res?.data?.attributes || (Array.isArray(res?.data) ? res.data : []);
          const nonVariantAttrs = rawAttrs.filter(a => !a.is_variant_key);
          setAttributes(nonVariantAttrs);

          // Smart auto-fill defaults for food & compliance specifications
          if (typeof onChange === 'function') {
            const currentValues = (values && typeof values === 'object' && !Array.isArray(values)) ? { ...values } : {};
            let hasNewDefaults = false;

            nonVariantAttrs.forEach(a => {
              if (currentValues[a.code] === undefined || currentValues[a.code] === '' || currentValues[a.code] === null) {
                if (a.code === 'dietary_type') {
                  currentValues['dietary_type'] = 'Veg';
                  hasNewDefaults = true;
                } else if (a.code === 'country_of_origin') {
                  currentValues['country_of_origin'] = 'India';
                  hasNewDefaults = true;
                } else if (a.code === 'fssai_license_number') {
                  const savedFssai = typeof window !== 'undefined' ? localStorage.getItem('seller_fssai_license') : null;
                  if (savedFssai) {
                    currentValues['fssai_license_number'] = savedFssai;
                    hasNewDefaults = true;
                  }
                }
              }
            });

            if (hasNewDefaults) {
              onChange(currentValues);
            }
          }
        }
      })
      .catch(err => {
        if (isMounted) {
          console.error('Error fetching dynamic attributes:', err);
          setError('Could not load category attributes');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [categoryId]);

  const handleFieldChange = (code, val) => {
    if (code === 'fssai_license_number' && String(val).length === 14) {
      try {
        localStorage.setItem('seller_fssai_license', String(val));
      } catch (e) {}
    }
    const currentValues = (values && typeof values === 'object' && !Array.isArray(values)) ? { ...values } : {};
    const updated = { ...currentValues, [code]: val };
    if (typeof onChange === 'function') {
      onChange(updated);
    }
  };

  if (!categoryId) {
    return (
      <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-center text-xs text-gray-400">
        Select a category above to view dynamic product specifications.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
        <i className="fa-solid fa-spinner fa-spin text-brand-dark"></i>
        <span>Loading specifications for this category...</span>
      </div>
    );
  }

  if (attributes.length === 0) {
    return null;
  }

  // Group attributes by section_group
  const grouped = {};
  attributes.forEach(attr => {
    const group = attr.section_group || 'General Specifications';
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(attr);
  });

  return (
    <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200/80 space-y-4">
      <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-sliders text-brand-dark text-xs"></i>
          <span className="font-extrabold text-xs text-gray-900">
            Category Specifications
          </span>
        </div>
        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
          Dynamic Attributes
        </span>
      </div>

      {Object.entries(grouped).map(([groupName, groupAttrs]) => (
        <div key={groupName} className="space-y-2.5">
          <div className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider">
            {groupName}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {groupAttrs.map(attr => {
              const val = values[attr.code] !== undefined ? values[attr.code] : '';
              const allowed = Array.isArray(attr.allowed_values) ? attr.allowed_values : [];

              return (
                <div key={attr.code} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-800">
                      {attr.label}
                      {attr.is_required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {attr.is_filter_facet && (
                      <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.2 rounded" title="Used for customer filter search">
                        Filter
                      </span>
                    )}
                  </div>

                  {/* UI Render: Select */}
                  {attr.ui_type === 'select' && (
                    <select
                      value={val}
                      onChange={(e) => handleFieldChange(attr.code, e.target.value)}
                      required={attr.is_required}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 outline-none focus:border-brand-dark transition"
                    >
                      <option value="">-- Choose {attr.label} --</option>
                      {allowed.map(opt => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* UI Render: Radio buttons (e.g. Veg / Non-Veg) */}
                  {attr.ui_type === 'radio' && (
                    <div className="flex gap-2 pt-1">
                      {allowed.map(opt => (
                        <label
                          key={opt}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                            val === opt 
                              ? 'border-brand-dark bg-emerald-50 text-brand-dark' 
                              : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`attr-${attr.code}`}
                            value={opt}
                            checked={val === opt}
                            onChange={() => handleFieldChange(attr.code, opt)}
                            className="hidden"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* UI Render: Checkbox */}
                  {attr.ui_type === 'checkbox' && (
                    <label className="flex items-center gap-2 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(val)}
                        onChange={(e) => handleFieldChange(attr.code, e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-semibold text-gray-700">{attr.description || attr.label}</span>
                    </label>
                  )}

                  {/* UI Render: Number */}
                  {attr.ui_type === 'number' && (
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        value={val}
                        onChange={(e) => handleFieldChange(attr.code, e.target.value)}
                        placeholder={`e.g. 180`}
                        required={attr.is_required}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 outline-none focus:border-brand-dark transition"
                      />
                      {attr.unit_options?.length > 0 && (
                        <span className="px-2.5 py-2 bg-gray-100 rounded-xl text-xs font-bold text-gray-500 shrink-0">
                          {attr.unit_options[0]}
                        </span>
                      )}
                    </div>
                  )}

                  {/* UI Render: Date */}
                  {attr.ui_type === 'date' && (
                    <input
                      type="date"
                      value={val}
                      onChange={(e) => handleFieldChange(attr.code, e.target.value)}
                      required={attr.is_required}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 outline-none focus:border-brand-dark transition"
                    />
                  )}

                  {/* UI Render: Textarea */}
                  {attr.ui_type === 'textarea' && (
                    <textarea
                      rows="2"
                      value={val}
                      onChange={(e) => handleFieldChange(attr.code, e.target.value)}
                      placeholder={`Enter ${attr.label}`}
                      required={attr.is_required}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 outline-none focus:border-brand-dark transition"
                    />
                  )}

                  {/* UI Render: Text / Fallback for any generic attribute */}
                  {(attr.ui_type === 'text' || !['select', 'radio', 'checkbox', 'number', 'date', 'textarea'].includes(attr.ui_type)) && (
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => handleFieldChange(attr.code, e.target.value)}
                      placeholder={attr.validation_regex ? '14-digit FSSAI Number' : `Enter ${attr.label}`}
                      pattern={attr.validation_regex || undefined}
                      required={attr.is_required}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 outline-none focus:border-brand-dark transition"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

