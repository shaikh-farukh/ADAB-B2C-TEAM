import React from 'react';
import {
  Trash2,
  Package,
  Layers,
  Database,
  Image as ImageIcon,
  Building2
} from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ProductCardProps {
  product: {
    id: string;
    product_name: string;
    category: string;
    sub_category?: string;
    price?: number;
    manufacturer_price?: number;
    distributor_price?: number;
    retail_price?: number;
    unit?: string;
    currency?: string;
    moq: number;
    stock_quantity: number;
    status: string;
    image?: string;
    product_image?: string;
    north_hub?: number;
    south_hub?: number;
    central_hub?: number;
  };
  onClick: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onManageWarehouse?: (product: any, e: React.MouseEvent) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, onDelete, onManageWarehouse }) => {
  const isInactive = product.status !== 'active';
  const symbol = product.currency || '₹';
  const unitStr = product.unit || 'Piece';

  const mPrice = product.manufacturer_price ? Number(product.manufacturer_price) : null;
  const dPrice = product.distributor_price ? Number(product.distributor_price) : null;
  const rPrice = product.retail_price ? Number(product.retail_price) : Number(product.price || 0);

  return (
    <div
      onClick={() => onClick(product.id)}
      className={cn(
        "group relative bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-primary rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full",
        isInactive && "opacity-80 grayscale-[0.3]"
      )}
    >
      {/* Top Action Buttons */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        {onManageWarehouse && (
          <button
            onClick={(e) => onManageWarehouse(product, e)}
            className="p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-100 dark:border-dark-border-secondary rounded-xl text-slate-600 dark:text-dark-text-secondary hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 shadow-sm transition-all active:scale-90 opacity-90 group-hover:opacity-100"
            title="Manage Warehouse Hubs"
          >
            <Building2 className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={(e) => onDelete(product.id, e)}
          className="p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-100 dark:border-dark-border-secondary rounded-xl text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-100 shadow-sm transition-all active:scale-90 opacity-0 group-hover:opacity-100"
          title="Delete Product"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Image Container */}
      <div className="aspect-[4/3] bg-gray-50 dark:bg-dark-surface-elevated flex items-center justify-center border-b border-gray-100 dark:border-dark-border-primary overflow-hidden relative">
        {product.image || product.product_image ? (
          <img
            src={product.image || product.product_image}
            alt={product.product_name}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-300 dark:text-gray-600">
            <ImageIcon className="w-10 h-10" />
            <span className="text-[10px] font-black uppercase tracking-widest">No Visual</span>
          </div>
        )}

        {/* Status Badge Over Image */}
        <div className="absolute bottom-3 left-3 flex gap-2 items-center">
          <StatusBadge status={product.status} className="shadow-lg backdrop-blur-sm" />
          <span className="text-[10px] font-extrabold bg-black/60 text-white px-2 py-0.5 rounded-md backdrop-blur-sm">
            {unitStr}
          </span>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="mb-4">
          <div className="flex items-center gap-1.5 text-gray-400 dark:text-dark-text-disabled mb-1">
            <Layers className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest truncate">
              {product.category} {product.sub_category ? `• ${product.sub_category}` : ''}
            </span>
          </div>
          <h3 className="text-sm font-black text-gray-900 dark:text-white group-hover:text-emerald-600 transition-colors line-clamp-2 leading-tight">
            {product.product_name}
          </h3>
          <p className="text-[10px] font-mono font-bold text-gray-400 dark:text-dark-text-disabled mt-1 uppercase tracking-tighter">
            ID: {product.id}
          </p>
        </div>

        {/* 3-Tier Prices */}
        <div className="space-y-1.5 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 mb-3 text-xs">
          {mPrice !== null && (
            <div className="flex justify-between items-center text-teal-700 dark:text-teal-400">
              <span className="font-semibold text-[10px] uppercase">Mfr Cost:</span>
              <span className="font-bold">{symbol}{mPrice.toFixed(2)}</span>
            </div>
          )}
          {dPrice !== null && (
            <div className="flex justify-between items-center text-amber-700 dark:text-amber-400">
              <span className="font-semibold text-[10px] uppercase">Distributor:</span>
              <span className="font-bold">{symbol}{dPrice.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-adab-darkGreen dark:text-adab-green font-extrabold border-t border-gray-200 dark:border-gray-700 pt-1">
            <span className="text-[10px] uppercase">Retail MRP:</span>
            <span>{symbol}{rPrice.toFixed(2)}</span>
          </div>
        </div>

        {/* MOQ & Inventory Footer */}
        <div className="mt-auto flex items-center justify-between py-2 px-3 bg-gray-100/70 dark:bg-gray-800 rounded-xl">
          <div className="flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">MOQ: {product.moq || 1} {unitStr}s</span>
          </div>
          <div className="flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-gray-400" />
            <span className={cn("text-xs font-bold", (product.stock_quantity || 0) === 0 ? "text-red-500" : "text-gray-900 dark:text-white")}>
              {product.stock_quantity?.toLocaleString() || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;