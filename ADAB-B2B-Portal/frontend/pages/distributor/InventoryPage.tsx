import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  Search, 
  Edit3, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  TrendingUp, 
  Save, 
  X,
  Boxes,
  HelpCircle,
  RefreshCw,
  Coins
} from 'lucide-react';
import distributorInventoryService from '../../services/distributorInventoryService';
import { useNotification } from '../../context/NotificationContext';

const InventoryPage: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [inventory, setInventory] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(['all']);

  // Modal State
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [editStock, setEditStock] = useState<number>(0);
  const [editPublished, setEditPublished] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await distributorInventoryService.getInventory();
      if (response.success) {
        const data = response.data || [];
        setInventory(data);
        
        // Extract unique categories
        const cats = ['all', ...Array.from(new Set(data.map((item: any) => item.category))) as string[]];
        setCategories(cats);
      } else {
        showError(response.message || "Failed to load inventory");
      }
    } catch (error: any) {
      showError(error.response?.data?.message || "Error fetching inventory");
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setEditPrice(Number(item.price || item.manufacturer_price || 0).toString());
    setEditStock(item.stock_quantity || 0);
    setEditPublished(item.is_published || false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const priceNum = parseFloat(editPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      showError("Please enter a valid price");
      return;
    }

    setIsSaving(true);
    try {
      const response = await distributorInventoryService.publishProduct({
        product_id: Number(editingItem.product_id),
        price: priceNum,
        stock_quantity: Number(editStock),
        is_published: editPublished
      });

      if (response.success) {
        showSuccess(response.message || "Inventory updated successfully");
        setEditingItem(null);
        fetchInventory(); // Reload data
      } else {
        showError(response.message || "Failed to update inventory details");
      }
    } catch (error: any) {
      showError(error.response?.data?.message || "Failed to save inventory updates");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch = item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.manufacturer_name && item.manufacturer_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 pb-20 md:pb-24">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          <div className="flex items-center gap-2 text-adab-green mb-1.5">
            <Boxes className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Distributor Panel</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-200 tracking-tight">Inventory Management</h1>
          <p className="mt-1 text-sm text-gray-500 font-medium">Manage stock levels, update pricing, and publish items to the Retailer Catalog.</p>
        </div>
        <button 
          onClick={fetchInventory}
          className="flex items-center justify-center gap-2 px-5 py-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh list
        </button>
      </div>

      {/* Overview Cards / Insights */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-adab-green">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">Published Items</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-gray-200">{inventory.filter(i => i.is_published).length}</h3>
              <p className="text-xs text-gray-500 mt-1">Visible to assigned retailers</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-adab-orange">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">Low Stock Warning</p>
              <h3 className="text-2xl font-black text-red-500">{inventory.filter(i => i.is_published && i.stock_quantity <= 10).length}</h3>
              <p className="text-xs text-gray-500 mt-1">Stock quantity is at 10 or below</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">Total SKU Pool</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-gray-200">{inventory.length}</h3>
              <p className="text-xs text-gray-500 mt-1">Products from connected manufacturers</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Section */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by product or manufacturer..." 
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-adab-green/20 focus:border-adab-green outline-none transition-all" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {categories.map((cat) => (
            <button 
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border whitespace-nowrap ${categoryFilter === cat ? 'bg-adab-green text-white border-adab-green shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 animate-pulse">
              <div className="flex items-center gap-5 w-full md:w-1/3">
                <div className="w-16 h-16 bg-gray-100 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
              <div className="h-8 bg-gray-100 rounded w-24" />
              <div className="h-8 bg-gray-100 rounded w-24" />
              <div className="h-10 bg-gray-200 rounded-xl w-32" />
            </div>
          ))}
        </div>
      ) : filteredInventory.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                  <th className="py-5 px-6">Product Details</th>
                  <th className="py-5 px-6">Manufacturer Details</th>
                  <th className="py-5 px-6">Retail Selling Price</th>
                  <th className="py-5 px-6">Available Stock</th>
                  <th className="py-5 px-6">Status</th>
                  <th className="py-5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInventory.map((item) => {
                  const isLowStock = item.is_published && item.stock_quantity <= 10;
                  const isOutOfStock = item.stock_quantity === 0;

                  return (
                    <tr key={item.product_id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Product details */}
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                            {item.product_image ? (
                              <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-6 h-6 text-gray-300" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-200 leading-tight mb-1">{item.product_name}</h4>
                            <span className="text-[9px] font-black uppercase tracking-wider bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{item.category}</span>
                          </div>
                        </div>
                      </td>

                      {/* Manufacturer Details */}
                      <td className="py-5 px-6">
                        <p className="text-sm font-semibold text-gray-800">{item.manufacturer_name}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">MOQ: {item.manufacturer_moq} units | Cost: ${Number(item.manufacturer_price).toFixed(2)}</p>
                      </td>

                      {/* Selling Price */}
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm font-extrabold text-gray-900 dark:text-gray-200">₹{Number(item.price).toFixed(2)}</span>
                          {parseFloat(item.price) > parseFloat(item.manufacturer_price) && (
                            <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1 rounded">
                              +${(parseFloat(item.price) - parseFloat(item.manufacturer_price)).toFixed(2)} markup
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Available Stock */}
                      <td className="py-5 px-6">
                        <div className="space-y-1">
                          <p className={`text-sm font-extrabold ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-orange-500' : 'text-gray-900 dark:text-gray-200'}`}>
                            {item.stock_quantity.toLocaleString()} units
                          </p>
                          {isOutOfStock ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                              <AlertCircle className="w-2.5 h-2.5" /> Out of stock
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">
                              <AlertCircle className="w-2.5 h-2.5" /> Low stock alert
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-5 px-6">
                        {item.is_published ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-adab-green bg-green-50 border border-green-100 px-3 py-1 rounded-xl">
                            <Eye className="w-3.5 h-3.5" /> Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1 rounded-xl">
                            <EyeOff className="w-3.5 h-3.5" /> Draft/Offline
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-5 px-6 text-right">
                        <button 
                          onClick={() => handleOpenEdit(item)}
                          className="px-4 py-2 border border-gray-200 bg-white hover:border-adab-green hover:text-adab-green text-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ml-auto shadow-sm"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Update
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="py-32 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 border-dashed rounded-3xl flex flex-col items-center justify-center">
          <Boxes className="w-16 h-16 text-gray-200 mb-6" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-200 tracking-tight">No products found</h3>
          <p className="text-gray-500 mt-2">Make sure you have approved access partnerships with manufacturers.</p>
        </div>
      )}

      {/* Update Stock/Price Dialog (Modal) */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Overlay */}
          <div className="absolute inset-0 bg-gray-950/40 backdrop-blur-sm" onClick={() => setEditingItem(null)} />
          
          {/* Modal Container */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 w-full max-w-lg rounded-3xl shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-adab-green uppercase tracking-widest mb-1">Update Stock & Selling Price</p>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-200">{editingItem.product_name}</h3>
              </div>
              <button 
                onClick={() => setEditingItem(null)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="p-6 space-y-6">
              {/* Manufacturer Cost Info */}
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 flex justify-between text-xs">
                <div>
                  <p className="text-gray-400 font-bold uppercase tracking-wider mb-1">Manufacturer cost</p>
                  <p className="font-extrabold text-gray-900 dark:text-gray-200 text-sm">₹{Number(editingItem.manufacturer_price).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-bold uppercase tracking-wider mb-1">Manufacturer MOQ</p>
                  <p className="font-extrabold text-gray-900 dark:text-gray-200 text-sm">{editingItem.manufacturer_moq} units</p>
                </div>
                <div>
                  <p className="text-gray-400 font-bold uppercase tracking-wider mb-1">Source Partner</p>
                  <p className="font-extrabold text-gray-900 dark:text-gray-200 text-sm truncate max-w-[120px]">{editingItem.manufacturer_name}</p>
                </div>
              </div>

              {/* Price Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest">Retailer selling price ($)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-extrabold text-gray-400">₹</span>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    placeholder="Enter selling price"
                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-adab-green/20 focus:border-adab-green outline-none transition-all" 
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    required
                  />
                </div>
                <p className="text-[10px] text-gray-500 font-medium">This is the unit price charged to retailers. Must cover cost price.</p>
              </div>

              {/* Stock Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest">Available stock quantity</label>
                <input 
                  type="number" 
                  min="0"
                  placeholder="Enter available stock"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-adab-green/20 focus:border-adab-green outline-none transition-all" 
                  value={editStock}
                  onChange={(e) => setEditStock(Number(e.target.value))}
                  required
                />
                <p className="text-[10px] text-gray-500 font-medium">Total unit inventory available at your distributor warehouse.</p>
              </div>

              {/* Published Toggle */}
              <div className="flex items-center justify-between p-4 border border-gray-200 bg-white dark:bg-gray-900 rounded-2xl hover:border-adab-green transition-all cursor-pointer" onClick={() => setEditPublished(!editPublished)}>
                <div className="flex gap-3 items-center">
                  {editPublished ? (
                    <div className="w-10 h-10 rounded-xl bg-green-50 text-adab-green flex items-center justify-center shrink-0">
                      <Eye className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center shrink-0">
                      <EyeOff className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Publish in Retailer Catalog</h4>
                    <p className="text-[10px] text-gray-500 font-medium">Toggle visibility for assigned retailer shops.</p>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full p-1 transition-all shrink-0 ${editPublished ? 'bg-adab-green' : 'bg-gray-200'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-all shadow ${editPublished ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-5 py-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-3 bg-adab-green hover:bg-green-800 text-white dark:bg-gray-900 rounded-3xl dark:border dark:border-white/10 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-green-900/10"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
