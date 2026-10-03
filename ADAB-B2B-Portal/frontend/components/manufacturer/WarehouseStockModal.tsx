import React, { useState, useEffect } from 'react';
import {
  Building2,
  X,
  Save,
  Layers,
  MapPin,
  Boxes,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Database
} from 'lucide-react';
import productService from '../../services/productService';
import { useNotification } from '../../context/NotificationContext';

interface WarehouseStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    product_name: string;
    stock_quantity: number;
    north_hub?: number;
    south_hub?: number;
    central_hub?: number;
    warehouse_stock?: {
      north_hub?: number;
      south_hub?: number;
      central_hub?: number;
    };
  } | null;
  onStockUpdated: () => void;
}

export const WarehouseStockModal: React.FC<WarehouseStockModalProps> = ({
  isOpen,
  onClose,
  product,
  onStockUpdated
}) => {
  const { showSuccess, showError } = useNotification();

  const [northHub, setNorthHub] = useState<number>(0);
  const [southHub, setSouthHub] = useState<number>(0);
  const [centralHub, setCentralHub] = useState<number>(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      const initialNorth = product.north_hub ?? product.warehouse_stock?.north_hub ?? 0;
      const initialSouth = product.south_hub ?? product.warehouse_stock?.south_hub ?? 0;
      const initialCentral = product.central_hub ?? product.warehouse_stock?.central_hub ?? (product.stock_quantity || 0);

      setNorthHub(initialNorth);
      setSouthHub(initialSouth);
      setCentralHub(initialCentral);

      // Fetch fresh warehouse stock allocation from backend
      fetchFreshStock(product.id);
    }
  }, [isOpen, product]);

  const fetchFreshStock = async (productId: string) => {
    setIsLoading(true);
    try {
      const res = await productService.getWarehouseStock(productId);
      if (res.success && res.data) {
        setNorthHub(res.data.north_hub || 0);
        setSouthHub(res.data.south_hub || 0);
        setCentralHub(res.data.central_hub || 0);
      }
    } catch (err) {
      // Fallback to local values if endpoint is uninitialized
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  const totalCalculatedStock = (Number(northHub) || 0) + (Number(southHub) || 0) + (Number(centralHub) || 0);

  const handleSaveAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        north_hub: Math.max(0, Number(northHub) || 0),
        south_hub: Math.max(0, Number(southHub) || 0),
        central_hub: Math.max(0, Number(centralHub) || 0)
      };

      const response = await productService.updateWarehouseStock(product.id, payload);

      if (response.success) {
        showSuccess(`Stock successfully allocated across hubs! Total inventory: ${response.data?.stock_quantity || totalCalculatedStock} units.`);
        onStockUpdated();
        onClose();
      } else {
        showError(response.message || 'Failed to update warehouse stock allocation.');
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Server error while allocating warehouse inventory.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatePercentage = (hubStock: number) => {
    if (totalCalculatedStock === 0) return 0;
    return Math.round((hubStock / totalCalculatedStock) * 100);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-xl w-full overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 rounded-full transition-all active:scale-95"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/40">
                Multi-Warehouse Allocation
              </span>
              <h2 className="text-xl font-bold mt-1 text-white truncate max-w-md">
                {product.product_name}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Product ID: {product.id}</p>
            </div>
          </div>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSaveAllocation} className="p-6 space-y-6">

          {/* Total Stock Summary Banner */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Aggregated Inventory</p>
                <p className="text-xl font-black text-slate-900 tracking-tight">
                  {totalCalculatedStock.toLocaleString()} <span className="text-xs font-normal text-slate-500">units</span>
                </p>
              </div>
            </div>

            {isLoading && (
              <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Syncing...
              </span>
            )}
          </div>

          {/* Allocation Inputs Grid */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Regional Fulfillment Hubs
            </h3>

            {/* North Hub */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-emerald-500/50 transition-all shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <label htmlFor="north_hub" className="text-sm font-bold text-slate-900 cursor-pointer">
                    North Hub <span className="text-xs font-normal text-slate-400">(Delhi NCR)</span>
                  </label>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {calculatePercentage(northHub)}% allocated
                </span>
              </div>
              <div className="relative">
                <input
                  id="north_hub"
                  type="number"
                  min="0"
                  value={northHub}
                  onChange={(e) => setNorthHub(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  placeholder="0"
                />
              </div>
            </div>

            {/* South Hub */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-emerald-500/50 transition-all shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <label htmlFor="south_hub" className="text-sm font-bold text-slate-900 cursor-pointer">
                    South Hub <span className="text-xs font-normal text-slate-400">(Bangalore)</span>
                  </label>
                </div>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  {calculatePercentage(southHub)}% allocated
                </span>
              </div>
              <div className="relative">
                <input
                  id="south_hub"
                  type="number"
                  min="0"
                  value={southHub}
                  onChange={(e) => setSouthHub(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Central Hub */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-emerald-500/50 transition-all shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <label htmlFor="central_hub" className="text-sm font-bold text-slate-900 cursor-pointer">
                    Central Hub <span className="text-xs font-normal text-slate-400">(Mumbai Master Depot)</span>
                  </label>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {calculatePercentage(centralHub)}% allocated
                </span>
              </div>
              <div className="relative">
                <input
                  id="central_hub"
                  type="number"
                  min="0"
                  value={centralHub}
                  onChange={(e) => setCentralHub(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Visual Distribution Progress Bar */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs text-slate-500 font-medium">
              <span>Stock Distribution</span>
              <span>100% Total</span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${calculatePercentage(northHub)}%` }}
                className="bg-blue-500 h-full transition-all duration-300"
                title={`North: ${northHub} units`}
              />
              <div
                style={{ width: `${calculatePercentage(southHub)}%` }}
                className="bg-amber-500 h-full transition-all duration-300"
                title={`South: ${southHub} units`}
              />
              <div
                style={{ width: `${calculatePercentage(centralHub)}%` }}
                className="bg-emerald-500 h-full transition-all duration-300"
                title={`Central: ${centralHub} units`}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Allocation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WarehouseStockModal;
