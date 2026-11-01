import React, { useState, useEffect } from 'react';
import listingService from '../../services/listingService';

// Helper to tokenize title for deduplication comparison
function normalizeTokens(title) {
  if (!title) return [];
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);
}

// Determines if two products represent the exact same physical FMCG item
function isSameProduct(masterItem, b2bItem) {
  if (!masterItem || !b2bItem) return false;
  // 1. Direct barcode match
  if (masterItem.barcode && b2bItem.sku && masterItem.barcode === b2bItem.sku) {
    return true;
  }
  // 2. Token overlap match (e.g. "Amul Pasteurised Butter 500g" vs "Amul Butter Pasteurised 500g")
  const masterTokens = normalizeTokens(masterItem.product_name);
  const b2bTokens = normalizeTokens(b2bItem.product_name);
  if (masterTokens.length === 0 || b2bTokens.length === 0) return false;

  const sharedTokens = b2bTokens.filter(t => masterTokens.includes(t));
  const overlapRatio = sharedTokens.length / Math.min(masterTokens.length, b2bTokens.length);
  return overlapRatio >= 0.75;
}

export default function PackedItemSelector({ onSelect, selectedItem, onClear }) {
  const [catalogItems, setCatalogItems] = useState([]);
  const [b2bItems, setB2BItems] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Load all catalog products once on mount so they are instantly ready
  useEffect(() => {
    let isMounted = true;
    setInitialLoading(true);

    Promise.all([
      listingService.searchMasterCatalog(''),
      listingService.getB2BProducts('')
    ])
      .then(([masterRes, b2bRes]) => {
        if (isMounted) {
          setCatalogItems(masterRes?.data || []);
          setB2BItems(b2bRes?.data || []);
        }
      })
      .catch(err => {
        console.error('Error loading initial catalog:', err);
      })
      .finally(() => {
        if (isMounted) setInitialLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  // Background deep search when typing barcodes or terms not in the initial set
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query || query.length < 3) return;

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const [masterRes, b2bRes] = await Promise.all([
          listingService.searchMasterCatalog(query),
          listingService.getB2BProducts(query)
        ]);

        if (masterRes?.data?.length > 0) {
          setCatalogItems(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newItems = masterRes.data.filter(p => !existingIds.has(p.id));
            return newItems.length > 0 ? [...prev, ...newItems] : prev;
          });
        }
        if (b2bRes?.data?.length > 0) {
          setB2BItems(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newItems = b2bRes.data.filter(p => !existingIds.has(p.id));
            return newItems.length > 0 ? [...prev, ...newItems] : prev;
          });
        }
      } catch (err) {
        console.error('Error during deep catalog search:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleItemClick = (displayItem) => {
    let catId = null;
    let titleStr = '';

    if (displayItem.source === 'MASTER') {
      const master = displayItem.rawMaster;
      const b2b = displayItem.rawB2B;
      catId = b2b?.category_id || master?.category_id || null;
      titleStr = master.product_name || '';

      const titleLower = titleStr.toLowerCase();
      const savedFssai = typeof window !== 'undefined' ? localStorage.getItem('seller_fssai_license') : null;
      const defaultAttributes = {
        dietary_type: 'Veg',
        country_of_origin: 'India',
        shelf_life_days: titleLower.includes('butter') ? '180' : titleLower.includes('oil') ? '270' : titleLower.includes('salt') ? '720' : titleLower.includes('atta') ? '90' : '180',
        storage_instructions: titleLower.includes('butter') ? 'Keep refrigerated at 4°C' : 'Store in a cool, dry place'
      };
      if (savedFssai) defaultAttributes.fssai_license_number = savedFssai;

      onSelect({
        master_catalog_id: master.id,
        manufacturer_product_id: b2b ? b2b.id : null,
        title: master.product_name,
        brand_tag: master.brand_name || '',
        mrp: parseFloat(master.printed_mrp || 0),
        sell_price: parseFloat(master.printed_mrp || 0),
        unit: master.standard_unit || 'pack',
        barcode: master.barcode || '',
        image_url: master.default_image_url || '',
        category_id: catId,
        attributes: defaultAttributes,
        product_type: 'PACKED_ITEM',
        sourceName: 'Verified Catalog'
      });
    } else {
      const b2b = displayItem.rawB2B;
      catId = b2b.category_id || null;
      titleStr = b2b.product_name || '';

      const titleLower = titleStr.toLowerCase();
      const savedFssai = typeof window !== 'undefined' ? localStorage.getItem('seller_fssai_license') : null;
      const defaultAttributes = {
        dietary_type: 'Veg',
        country_of_origin: 'India',
        shelf_life_days: titleLower.includes('butter') ? '180' : titleLower.includes('oil') ? '270' : titleLower.includes('salt') ? '720' : titleLower.includes('atta') ? '90' : '180',
        storage_instructions: titleLower.includes('butter') ? 'Keep refrigerated at 4°C' : 'Store in a cool, dry place'
      };
      if (savedFssai) defaultAttributes.fssai_license_number = savedFssai;

      onSelect({
        master_catalog_id: null,
        manufacturer_product_id: b2b.id,
        title: b2b.product_name,
        brand_tag: b2b.category || 'B2B Partner',
        mrp: parseFloat(b2b.mrp || 0),
        sell_price: parseFloat(b2b.mrp || 0),
        unit: b2b.unit || 'pack',
        barcode: b2b.sku || '',
        image_url: b2b.image_url || '',
        category_id: catId,
        attributes: defaultAttributes,
        product_type: 'PACKED_ITEM',
        sourceName: 'Verified Catalog'
      });
    }
    setIsOpen(false);
  };

  // Build single deduplicated catalog list
  const displayItems = [];
  const matchedB2BIds = new Set();

  // 1. Add Master Catalog items (official FMCG templates)
  catalogItems.forEach(master => {
    let matchedB2B = null;
    for (const b2b of b2bItems) {
      if (isSameProduct(master, b2b)) {
        matchedB2B = b2b;
        matchedB2BIds.add(b2b.id);
        break;
      }
    }

    displayItems.push({
      id: `master-${master.id}`,
      title: master.product_name,
      brand: master.brand_name,
      mrp: master.printed_mrp,
      unit: master.standard_unit,
      barcode: master.barcode,
      image: master.default_image_url,
      source: 'MASTER',
      rawMaster: master,
      rawB2B: matchedB2B
    });
  });

  // 2. Append any unique B2B items not already covered by Master Catalog
  b2bItems.forEach(b2b => {
    if (!matchedB2BIds.has(b2b.id)) {
      displayItems.push({
        id: `b2b-${b2b.id}`,
        title: b2b.product_name,
        brand: b2b.sku,
        mrp: b2b.mrp,
        unit: b2b.unit,
        barcode: b2b.sku,
        image: b2b.image_url,
        source: 'B2B',
        rawMaster: null,
        rawB2B: b2b
      });
    }
  });

  // Client-side instant filter for immediate 0ms keystroke feedback
  const filteredItems = displayItems.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.brand && item.brand.toLowerCase().includes(q)) ||
      (item.barcode && item.barcode.toLowerCase().includes(q))
    );
  });

  if (selectedItem?.master_catalog_id || selectedItem?.manufacturer_product_id) {
    return (
      <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {selectedItem.image_url ? (
            <img src={selectedItem.image_url} alt="" className="w-12 h-12 rounded-xl object-cover bg-white border border-blue-100 shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-lg shrink-0">
              <i className="fa-solid fa-box-open"></i>
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-200 text-blue-900">
                ✓ Auto-Filled Catalog Product
              </span>
              {selectedItem.brand_tag && (
                <span className="text-xs font-bold text-blue-800">{selectedItem.brand_tag}</span>
              )}
            </div>
            <div className="text-xs font-bold text-gray-900 truncate mt-0.5">{selectedItem.title}</div>
            <div className="text-[11px] text-gray-500">
              MRP: ₹{selectedItem.mrp} • Barcode: {selectedItem.barcode || 'N/A'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-white px-3 py-1.5 rounded-xl border border-blue-200 shadow-sm transition shrink-0"
        >
          Change Product
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-blue-900">
          Source from Verified Catalogs (Auto-Fill)
        </label>
        <span className="text-[11px] text-blue-600">
          Optional — or type manually below
        </span>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2.5 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 text-blue-900 text-xs font-bold flex items-center justify-between transition"
        >
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-magnifying-glass text-blue-600"></i>
            {initialLoading ? (
              <span>Loading catalog products...</span>
            ) : (
              <span>Browse Products to Auto-Fill ({displayItems.length} products available)...</span>
            )}
          </div>
          <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} text-blue-600 text-xs`}></i>
        </button>

        {isOpen && (
          <div className="mt-2 bg-white rounded-2xl shadow-2xl border border-blue-200 p-3 space-y-3 z-50">
            {/* Live Search Input */}
            <div className="relative flex items-center">
              <i className="fa-solid fa-magnifying-glass absolute left-3 text-gray-400 text-xs pointer-events-none"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                placeholder="Type to search (e.g. Amul, Tata, Salt, 89012...)"
                className="w-full pl-8 pr-8 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                autoFocus
              />
              {isSearching && (
                <i className="fa-solid fa-spinner fa-spin absolute right-8 text-blue-600 text-xs"></i>
              )}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-gray-400 hover:text-gray-600 text-xs p-1"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>

            {/* Results List */}
            <div className="max-h-56 overflow-y-auto space-y-1 divide-y divide-gray-50">
              {initialLoading ? (
                <div className="py-6 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                  <i className="fa-solid fa-spinner fa-spin text-blue-600"></i>
                  <span>Loading products...</span>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-500">
                  {searchQuery ? `No products matching "${searchQuery}". You can enter details manually below.` : 'No products available.'}
                </div>
              ) : (
                filteredItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="pt-1.5 pb-1.5 px-2 rounded-xl hover:bg-blue-50/70 cursor-pointer flex items-center justify-between gap-3 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.image ? (
                        <img src={item.image} alt="" className="w-8 h-8 rounded-lg object-cover bg-gray-50 shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center text-xs shrink-0">
                          <i className="fa-solid fa-box"></i>
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-800 truncate">{item.title}</div>
                        <div className="text-[11px] text-gray-500">
                          {item.brand && <span className="font-semibold text-gray-700 mr-2">{item.brand}</span>}
                          <span>MRP: ₹{item.mrp}</span>
                          {item.barcode && <span className="ml-2 font-mono">[{item.barcode}]</span>}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded shrink-0 bg-blue-100 text-blue-800">
                      Auto-Fill
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-[11px] text-gray-500">
              <span>Can't find your product? Close this and type details manually.</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold text-gray-700 hover:text-gray-900"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
