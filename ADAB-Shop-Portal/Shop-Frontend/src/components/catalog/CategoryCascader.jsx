import React, { useState, useEffect, useMemo } from 'react';

export default function CategoryCascader({ value, onChange, categoryTree = [] }) {
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedSubId, setSelectedSubId] = useState('');
  const [selectedLeafId, setSelectedLeafId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Flatten leaves for quick search and breadcrumb resolution
  const flatCategories = useMemo(() => {
    const list = [];
    function traverse(nodes, path = []) {
      nodes.forEach(node => {
        const currentPath = [...path, node.name];
        if (node.is_leaf || !node.children || node.children.length === 0) {
          list.push({
            id: node.id,
            name: node.name,
            breadcrumb: currentPath.join(' › '),
            node
          });
        }
        if (node.children && node.children.length > 0) {
          traverse(node.children, currentPath);
        }
      });
    }
    traverse(categoryTree);
    return list;
  }, [categoryTree]);

  // Compute active breadcrumb for currently selected value
  const activeBreadcrumb = useMemo(() => {
    if (!value) return '';
    const match = flatCategories.find(c => String(c.id) === String(value));
    return match?.breadcrumb || '';
  }, [value, flatCategories]);

  // Sync internal dropdown states when external value changes
  useEffect(() => {
    if (!value || !categoryTree || categoryTree.length === 0) {
      setSelectedDeptId('');
      setSelectedSubId('');
      setSelectedLeafId('');
      return;
    }

    const targetId = String(value);

    // Find category node in tree and expand its path
    for (const dept of categoryTree) {
      if (String(dept.id) === targetId) {
        setSelectedDeptId(String(dept.id));
        setSelectedSubId('');
        setSelectedLeafId('');
        return;
      }
      if (dept.children) {
        for (const sub of dept.children) {
          if (String(sub.id) === targetId) {
            setSelectedDeptId(String(dept.id));
            setSelectedSubId(String(sub.id));
            setSelectedLeafId('');
            return;
          }
          if (sub.children) {
            for (const leaf of sub.children) {
              if (String(leaf.id) === targetId) {
                setSelectedDeptId(String(dept.id));
                setSelectedSubId(String(sub.id));
                setSelectedLeafId(String(leaf.id));
                return;
              }
            }
          }
        }
      }
    }
  }, [value, categoryTree]);

  // Active subcategories under selected department
  const currentDept = categoryTree.find(d => String(d.id) === String(selectedDeptId));
  const subCategories = currentDept?.children || [];

  // Active leaf categories under selected subcategory
  const currentSub = subCategories.find(s => String(s.id) === String(selectedSubId));
  const leafCategories = currentSub?.children || [];

  const handleDeptChange = (e) => {
    const id = e.target.value;
    setSelectedDeptId(id);
    setSelectedSubId('');
    setSelectedLeafId('');
    
    const dept = categoryTree.find(d => String(d.id) === String(id));
    if (dept && (dept.is_leaf || !dept.children || dept.children.length === 0)) {
      onChange(dept.id);
    } else {
      onChange(null);
    }
  };

  const handleSubChange = (e) => {
    const id = e.target.value;
    setSelectedSubId(id);
    setSelectedLeafId('');

    const sub = subCategories.find(s => String(s.id) === String(id));
    if (sub && (sub.is_leaf || !sub.children || sub.children.length === 0)) {
      onChange(sub.id);
    } else {
      onChange(null);
    }
  };

  const handleLeafChange = (e) => {
    const id = e.target.value;
    setSelectedLeafId(id);
    if (id) {
      onChange(parseInt(id, 10));
    } else {
      onChange(null);
    }
  };

  const handleReset = () => {
    setSelectedDeptId('');
    setSelectedSubId('');
    setSelectedLeafId('');
    setSearchQuery('');
    onChange(null);
  };

  // Filtered search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return flatCategories.filter(c => c.breadcrumb.toLowerCase().includes(q)).slice(0, 10);
  }, [searchQuery, flatCategories]);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-gray-800">
          Product Category Hierarchy <span className="text-red-500">*</span>
        </label>
        {activeBreadcrumb ? (
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
            Leaf Category Selected
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
            Select 3 Levels Required
          </span>
        )}
      </div>

      {/* Selected Breadcrumb Pill */}
      {activeBreadcrumb && (
        <div className="flex items-center justify-between p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl transition shadow-xs">
          <div className="flex items-center gap-2 text-xs truncate mr-2">
            <i className="fa-solid fa-folder-tree text-emerald-700 text-sm"></i>
            <span className="text-gray-500 font-semibold shrink-0">Selected:</span>
            <span className="font-extrabold text-emerald-950 truncate" title={activeBreadcrumb}>
              {activeBreadcrumb}
            </span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-white hover:bg-emerald-100/60 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-xs shrink-0 transition"
          >
            Change
          </button>
        </div>
      )}

      {/* Quick Search Bar */}
      <div className="relative">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Instant search category (e.g. Atta, Basmati Rice, Butter, Maggi, Shampoo)..."
            className="w-full px-3 py-2 pl-8 rounded-xl border border-gray-200 bg-gray-50/60 text-xs outline-none focus:border-brand-dark focus:bg-white transition"
          />
          <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-gray-400 text-xs"></i>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-xs"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-52 overflow-y-auto divide-y divide-gray-100">
            {searchResults.map(res => (
              <button
                key={res.id}
                type="button"
                onClick={() => {
                  onChange(res.id);
                  setSearchQuery('');
                }}
                className="w-full text-left px-3 py-2.5 text-xs hover:bg-emerald-50 hover:text-emerald-900 transition flex items-center justify-between"
              >
                <span className="font-semibold text-gray-800">{res.breadcrumb}</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 font-mono px-1.5 py-0.5 rounded">
                  ID: {res.id}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3-Level Cascader Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* Level 1: Department */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 mb-1">1. Department</label>
          <select
            value={selectedDeptId}
            onChange={handleDeptChange}
            className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none transition ${
              selectedDeptId ? 'border-emerald-300 bg-emerald-50/30 text-emerald-950' : 'border-gray-200 bg-white text-gray-800 focus:border-brand-dark'
            }`}
          >
            <option value="">-- Choose Department --</option>
            {categoryTree.map(dept => (
              <option key={dept.id} value={String(dept.id)}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* Level 2: Subcategory */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 mb-1">2. Sub-Category</label>
          <select
            value={selectedSubId}
            onChange={handleSubChange}
            disabled={subCategories.length === 0}
            className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none transition disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 ${
              selectedSubId ? 'border-emerald-300 bg-emerald-50/30 text-emerald-950' : 'border-gray-200 bg-white text-gray-800 focus:border-brand-dark'
            }`}
          >
            <option value="">-- Choose Subcategory --</option>
            {subCategories.map(sub => (
              <option key={sub.id} value={String(sub.id)}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>

        {/* Level 3: Leaf Category */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 mb-1">3. Leaf Product Category *</label>
          <select
            value={selectedLeafId}
            onChange={handleLeafChange}
            disabled={leafCategories.length === 0}
            className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none transition disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 ${
              selectedLeafId ? 'border-emerald-500 bg-emerald-100/40 text-emerald-950 font-bold' : 'border-gray-200 bg-white text-gray-800 focus:border-brand-dark'
            }`}
          >
            <option value="">-- Choose Leaf Category --</option>
            {leafCategories.map(leaf => (
              <option key={leaf.id} value={String(leaf.id)}>
                {leaf.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
