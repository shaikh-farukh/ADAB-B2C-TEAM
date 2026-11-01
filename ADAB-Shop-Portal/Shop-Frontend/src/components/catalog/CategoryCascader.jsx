import React, { useState, useEffect, useMemo } from 'react';

export default function CategoryCascader({ value, onChange, categoryTree = [] }) {
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedSubId, setSelectedSubId] = useState('');
  const [selectedLeafId, setSelectedLeafId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Flatten leaves for quick search
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

  // Sync internal state when external value changes
  useEffect(() => {
    if (!value || !categoryTree || categoryTree.length === 0) {
      setSelectedDeptId('');
      setSelectedSubId('');
      setSelectedLeafId('');
      return;
    }

    const targetId = String(value);

    // Find category node in tree
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

  // Get active subcategories
  const currentDept = categoryTree.find(d => String(d.id) === String(selectedDeptId));
  const subCategories = currentDept?.children || [];

  // Get active leaf categories
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
      onChange(selectedSubId ? parseInt(selectedSubId, 10) : null);
    }
  };

  // Filtered search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return flatCategories.filter(c => c.breadcrumb.toLowerCase().includes(q)).slice(0, 8);
  }, [searchQuery, flatCategories]);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-gray-700">
          Category Hierarchy *
        </label>
        {value && (
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            ✓ Level Selected
          </span>
        )}
      </div>

      {/* Quick Search Bar */}
      <div className="relative">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search category (e.g. Kurta, Atta, Rice, Milk)..."
            className="w-full px-3 py-2 pl-8 rounded-xl border border-gray-200 bg-gray-50/50 text-xs outline-none focus:border-brand-dark focus:bg-white transition"
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
          <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-48 overflow-y-auto divide-y divide-gray-100">
            {searchResults.map(res => (
              <button
                key={res.id}
                type="button"
                onClick={() => {
                  onChange(res.id);
                  setSearchQuery('');
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 hover:text-emerald-900 transition flex items-center justify-between"
              >
                <span className="font-semibold text-gray-800">{res.breadcrumb}</span>
                <span className="text-[10px] text-gray-400 font-mono">ID: {res.id}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3-Level Cascader Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* Level 1: Department */}
        <div>
          <select
            value={selectedDeptId}
            onChange={handleDeptChange}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 outline-none focus:border-brand-dark"
          >
            <option value="">1. Department...</option>
            {categoryTree.map(dept => (
              <option key={dept.id} value={String(dept.id)}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* Level 2: Subcategory */}
        <div>
          <select
            value={selectedSubId}
            onChange={handleSubChange}
            disabled={subCategories.length === 0}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 outline-none focus:border-brand-dark disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">2. Sub-Category...</option>
            {subCategories.map(sub => (
              <option key={sub.id} value={String(sub.id)}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>

        {/* Level 3: Leaf Category */}
        <div>
          <select
            value={selectedLeafId}
            onChange={handleLeafChange}
            disabled={leafCategories.length === 0}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 outline-none focus:border-brand-dark disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">3. Leaf Category...</option>
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

