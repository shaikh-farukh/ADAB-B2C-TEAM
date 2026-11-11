import React, { useState, useEffect } from 'react';

const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'];
const COMMON_COLORS = ['Black', 'White', 'Navy Blue', 'Maroon', 'Red', 'Green', 'Yellow', 'Grey', 'Beige', 'Blue', 'Pink'];

export default function VariantMatrixBuilder({
  hasVariants = false,
  onToggleVariants,
  variants = [],
  onChangeVariants,
  basePrice = 0,
  baseMrp = 0,
  baseSku = 'SKU'
}) {
  const [selectedSizes, setSelectedSizes] = useState(['M', 'L', 'XL']);
  const [selectedColors, setSelectedColors] = useState(['Navy Blue', 'Maroon']);
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkStock, setBulkStock] = useState('');

  // Auto-sync: If basePrice is entered in the main form and existing variants have 0 price, auto-populate them
  useEffect(() => {
    if (basePrice > 0 && variants.some(v => !v.sell_price || v.sell_price === 0)) {
      const updated = variants.map(v => ({
        ...v,
        sell_price: (!v.sell_price || v.sell_price === 0) ? basePrice : v.sell_price,
        mrp: (!v.mrp || v.mrp === 0) ? (baseMrp || basePrice) : v.mrp
      }));
      onChangeVariants(updated);
    }
  }, [basePrice, baseMrp]);

  const toggleSize = (size) => {
    if (selectedSizes.includes(size)) {
      setSelectedSizes(selectedSizes.filter(s => s !== size));
    } else {
      setSelectedSizes([...selectedSizes, size]);
    }
  };

  const toggleColor = (color) => {
    if (selectedColors.includes(color)) {
      setSelectedColors(selectedColors.filter(c => c !== color));
    } else {
      setSelectedColors([...selectedColors, color]);
    }
  };

  const generateMatrix = () => {
    if (selectedSizes.length === 0 || selectedColors.length === 0) return;

    const defaultPrice = basePrice > 0 ? basePrice : 0;
    const defaultMrp = baseMrp > 0 ? baseMrp : defaultPrice;

    const newVariants = [];
    selectedColors.forEach(color => {
      selectedSizes.forEach(size => {
        const cleanColor = color.replace(/\s+/g, '').toUpperCase().slice(0, 4);
        const sku = `${baseSku || 'PROD'}-${cleanColor}-${size}`;

        // Check if already exists to preserve custom stock/price
        const existing = variants.find(v => 
          v.variant_attributes?.size === size && v.variant_attributes?.color === color
        );

        if (existing) {
          newVariants.push({
            ...existing,
            sell_price: existing.sell_price > 0 ? existing.sell_price : defaultPrice,
            mrp: existing.mrp > 0 ? existing.mrp : defaultMrp
          });
        } else {
          newVariants.push({
            sku,
            barcode: '',
            mrp: defaultMrp,
            sell_price: defaultPrice,
            stock_qty: 10,
            variant_attributes: { size, color },
            image_url: '',
            is_active: true
          });
        }
      });
    });

    onChangeVariants(newVariants);
  };

  // Mass apply functions
  const applyPriceToAll = (priceToApply) => {
    const p = parseFloat(priceToApply !== undefined && priceToApply !== '' ? priceToApply : basePrice);
    if (isNaN(p) || p < 0) return;
    const updated = variants.map(v => ({
      ...v,
      sell_price: p,
      mrp: baseMrp > 0 ? baseMrp : (v.mrp || p)
    }));
    onChangeVariants(updated);
  };

  const applyStockToAll = (stockToApply) => {
    const s = parseFloat(stockToApply);
    if (isNaN(s) || s < 0) return;
    const updated = variants.map(v => ({
      ...v,
      stock_qty: s
    }));
    onChangeVariants(updated);
  };

  const handleRowChange = (index, field, value) => {
    const updated = [...variants];
    updated[index] = {
      ...updated[index],
      [field]: field === 'stock_qty' || field === 'sell_price' || field === 'mrp' 
        ? (value === '' ? '' : parseFloat(value)) 
        : value
    };
    onChangeVariants(updated);
  };

  const removeRow = (index) => {
    const updated = variants.filter((_, i) => i !== index);
    onChangeVariants(updated);
  };

  const totalVariantStock = variants.reduce((sum, v) => sum + (parseFloat(v.stock_qty) || 0), 0);

  return (
    <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-200/80 space-y-3.5">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hasVariants}
            onChange={(e) => onToggleVariants(e.target.checked)}
            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
          />
          <span className="font-extrabold text-xs text-purple-950">
            This product has variations (Size, Color, etc.)
          </span>
        </label>
        {hasVariants && (
          <span className="text-[11px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
            Multi-SKU Matrix
          </span>
        )}
      </div>

      {hasVariants && (
        <div className="space-y-3 pt-1">
          {/* Size Selector Chips */}
          <div>
            <div className="text-[11px] font-bold text-gray-700 mb-1.5 flex items-center justify-between">
              <span>Select Available Sizes:</span>
              <span className="text-[10px] text-gray-400">({selectedSizes.length} selected)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_SIZES.map(size => {
                const isSelected = selectedSizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      isSelected 
                        ? 'bg-purple-600 text-white shadow-sm' 
                        : 'bg-white text-gray-700 border border-purple-200 hover:border-purple-300'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selector Chips */}
          <div>
            <div className="text-[11px] font-bold text-gray-700 mb-1.5 flex items-center justify-between">
              <span>Select Available Colors:</span>
              <span className="text-[10px] text-gray-400">({selectedColors.length} selected)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_COLORS.map(color => {
                const isSelected = selectedColors.includes(color);
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => toggleColor(color)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      isSelected 
                        ? 'bg-purple-600 text-white shadow-sm' 
                        : 'bg-white text-gray-700 border border-purple-200 hover:border-purple-300'
                    }`}
                  >
                    {color}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generate Matrix Button */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={generateMatrix}
              disabled={selectedSizes.length === 0 || selectedColors.length === 0}
              className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              <i className="fa-solid fa-table-cells"></i>
              <span>Generate Matrix ({selectedSizes.length * selectedColors.length} combinations)</span>
            </button>

            {variants.length > 0 && (
              <span className="text-xs font-extrabold text-purple-900 bg-purple-100/70 px-2.5 py-1 rounded-lg">
                Total Stock: <strong className="text-emerald-700">{totalVariantStock}</strong> units
              </span>
            )}
          </div>

          {/* Quick Mass-Apply Toolbar */}
          {variants.length > 0 && (
            <div className="p-2.5 bg-white rounded-xl border border-purple-200 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-purple-900 text-[11px] flex items-center gap-1">
                  <i className="fa-solid fa-bolt text-amber-500"></i> Quick Fill:
                </span>
                {basePrice > 0 && (
                  <button
                    type="button"
                    onClick={() => applyPriceToAll(basePrice)}
                    className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg font-bold text-[11px] transition"
                  >
                    Set all to Sell Price (₹{basePrice})
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Custom Price ₹"
                    value={bulkPrice}
                    onChange={(e) => setBulkPrice(e.target.value)}
                    className="w-24 px-2 py-0.5 border border-gray-200 rounded text-[11px] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => { applyPriceToAll(bulkPrice); setBulkPrice(''); }}
                    disabled={!bulkPrice}
                    className="px-2 py-0.5 bg-gray-100 hover:bg-purple-600 hover:text-white disabled:opacity-40 rounded text-[11px] font-bold transition"
                  >
                    Apply Price
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="Stock"
                    value={bulkStock}
                    onChange={(e) => setBulkStock(e.target.value)}
                    className="w-16 px-2 py-0.5 border border-gray-200 rounded text-[11px] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => { applyStockToAll(bulkStock); setBulkStock(''); }}
                    disabled={!bulkStock}
                    className="px-2 py-0.5 bg-gray-100 hover:bg-purple-600 hover:text-white disabled:opacity-40 rounded text-[11px] font-bold transition"
                  >
                    Apply Qty
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Generated Matrix Table */}
          {variants.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-purple-200 bg-white">
              <table className="w-full text-left text-xs divide-y divide-gray-100">
                <thead className="bg-purple-50 text-[10px] uppercase font-black text-purple-900">
                  <tr>
                    <th className="px-2.5 py-2">Variant</th>
                    <th className="px-2.5 py-2">SKU</th>
                    <th className="px-2.5 py-2">Sell Price (₹)</th>
                    <th className="px-2.5 py-2">Stock Qty</th>
                    <th className="px-2 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {variants.map((v, idx) => (
                    <tr key={idx} className="hover:bg-purple-50/40">
                      <td className="px-2.5 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-purple-950 bg-purple-100 px-1.5 py-0.5 rounded text-[10px]">
                            {v.variant_attributes?.size || 'N/A'}
                          </span>
                          <span className="font-semibold text-gray-700">
                            {v.variant_attributes?.color || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-2.5 py-1.5">
                        <input
                          type="text"
                          value={v.sku}
                          onChange={(e) => handleRowChange(idx, 'sku', e.target.value)}
                          className="w-36 px-1.5 py-1 rounded border border-gray-200 font-mono text-[11px]"
                        />
                      </td>
                      <td className="px-2.5 py-1.5">
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={baseMrp > 0 ? baseMrp : undefined}
                            value={v.sell_price !== undefined ? v.sell_price : ''}
                            onChange={(e) => handleRowChange(idx, 'sell_price', e.target.value)}
                            placeholder={basePrice ? String(basePrice) : "0"}
                            className={`w-24 px-1.5 py-1 rounded border font-bold text-[11px] outline-none transition ${
                              baseMrp > 0 && Number(v.sell_price) > baseMrp 
                                ? 'border-red-500 bg-red-50 text-red-900 focus:border-red-600' 
                                : Number(v.sell_price) > basePrice && basePrice > 0
                                ? 'border-amber-400 bg-amber-50/50 text-amber-900 focus:border-amber-600'
                                : 'border-purple-300 font-bold text-gray-900 bg-purple-50/30 focus:bg-white focus:border-purple-600'
                            }`}
                          />
                          {baseMrp > 0 && Number(v.sell_price) > baseMrp && (
                            <span className="block text-[9px] font-black text-red-600 mt-0.5">
                              Exceeds MRP (₹{baseMrp})!
                            </span>
                          )}
                          {Number(v.sell_price) > basePrice && basePrice > 0 && Number(v.sell_price) <= baseMrp && (
                            <span className="block text-[9px] font-bold text-amber-700 mt-0.5">
                              +₹{Number(v.sell_price) - basePrice} premium
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2.5 py-1.5">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={v.stock_qty !== undefined ? v.stock_qty : ''}
                          onChange={(e) => handleRowChange(idx, 'stock_qty', e.target.value)}
                          className="w-16 px-1.5 py-1 rounded border border-gray-200 font-bold text-emerald-800 text-[11px]"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          className="text-gray-400 hover:text-red-500 text-xs transition"
                          title="Remove variant"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
