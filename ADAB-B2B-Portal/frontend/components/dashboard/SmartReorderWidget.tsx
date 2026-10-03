import React from 'react';
import { ShoppingCart, Clock, ArrowRight, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import distributorService from '../../services/distributorService';
import { useNotification } from '../../context/NotificationContext';

interface SmartReorderItem {
  product_id: number;
  product_name: string;
  product_sku: string;
  price?: number;
  stock?: number;
  product_image?: string;
  order_frequency: number;
  last_ordered_date: string;
  suggested_quantity: number;
}

interface SmartReorderWidgetProps {
  data: SmartReorderItem[];
}

const SmartReorderWidget: React.FC<SmartReorderWidgetProps> = ({ data }) => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [addingId, setAddingId] = React.useState<number | null>(null);

  const handleAddToCart = async (product_id: number, quantity: number) => {
    try {
      setAddingId(product_id);
      await distributorService.addToCart({ product_id, quantity });
      showSuccess('Added to cart successfully');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to add to cart');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-dark-app-secondary rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border-primary overflow-hidden flex flex-col h-full transition-all hover:shadow-md">
      <div className="p-5 border-b border-gray-100 dark:border-dark-border-primary flex justify-between items-center bg-gradient-to-r from-orange-50/50 to-white dark:from-orange-900/10 dark:to-dark-app-secondary">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-adab-orange" />
          <h2 className="text-base font-bold text-gray-900 dark:text-dark-text-secondary tracking-tight">Smart Reorder Suggestions</h2>
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-orange-100 text-orange-800 px-3 py-1 rounded-full">
          AI Powered
        </span>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-400">
            <Package className="w-12 h-12 mb-3 text-orange-200" />
            <p className="text-sm font-bold text-gray-900">No suggestions yet</p>
            <p className="text-xs mt-1 text-gray-500">Place a few orders so we can learn your patterns and suggest reorders.</p>
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-6 pb-4 snap-x hide-scrollbar scroll-smooth">
            {data.map((item, index) => (
              <div
                key={index}
                className="snap-start shrink-0 w-[280px] sm:w-[320px] group relative border border-gray-100 dark:border-dark-border-primary rounded-2xl p-0 hover:border-orange-200 dark:hover:border-orange-500/50 hover:shadow-xl transition-all duration-300 bg-white dark:bg-dark-app-primary flex flex-col h-full overflow-hidden"
              >
                {/* Background decorative blob */}
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-gradient-to-br from-orange-50 to-orange-100 rounded-full opacity-50 blur-2xl group-hover:opacity-100 transition-opacity"></div>

                {/* Product Image Section */}
                <div className="h-40 w-full bg-gray-50 dark:bg-dark-surface-card relative overflow-hidden border-b border-gray-100 dark:border-dark-border-primary">
                  {item.product_image ? (
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 bg-green-50 text-adab-green text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-md border border-green-100 shadow-sm inline-flex items-center gap-1 backdrop-blur-sm bg-opacity-90">
                    <Clock className="w-3 h-3" />
                    Suggest: {item.suggested_quantity}
                  </div>
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-[10px] font-bold text-gray-600 uppercase tracking-wider px-2 py-1 rounded shadow-sm flex items-center gap-1">
                    <ShoppingCart className="w-3 h-3" />
                    {item.order_frequency}x
                  </div>
                </div>

                <div className="relative z-10 flex flex-col flex-1 p-5">

                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 mb-1 tracking-widest">{item.product_sku}</p>
                    <h4 className="font-extrabold text-gray-900 dark:text-dark-text-secondary text-base leading-snug group-hover:text-adab-orange transition-colors line-clamp-2">
                      {item.product_name}
                    </h4>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-50 dark:border-dark-border-secondary">
                    <div className="flex items-end justify-between mb-4">
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Unit Price</p>
                        <p className="text-xl font-black text-gray-900 dark:text-dark-text-secondary tracking-tight">₹{Number(item.price || 0).toLocaleString()}</p>
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium">Last: {new Date(item.last_ordered_date).toLocaleDateString()}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <button
                        onClick={() => navigate('/distributor/catalog?search=' + item.product_sku)}
                        className="flex items-center justify-center gap-1 text-gray-600 dark:text-dark-text-secondary bg-gray-50 dark:bg-dark-surface-hover font-bold hover:bg-gray-100 dark:hover:bg-dark-surface-active transition-colors uppercase text-[10px] tracking-wider py-2 rounded-xl"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleAddToCart(item.product_id, item.suggested_quantity)}
                        disabled={addingId === item.product_id}
                        className="flex items-center justify-center gap-1 bg-adab-orange text-white font-bold hover:bg-orange-600 transition-colors uppercase text-[10px] tracking-wider py-2 rounded-xl shadow-md disabled:opacity-50"
                      >
                        {addingId === item.product_id ? 'Wait...' : 'Add'}
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartReorderWidget;
