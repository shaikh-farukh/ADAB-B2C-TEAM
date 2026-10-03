import React from 'react';
import ProductCard from './ProductCard';

interface ProductGridProps {
  products: any[];
  isLoading: boolean;
  onProductClick: (id: string) => void;
  onProductDelete: (id: string, e: React.MouseEvent) => void;
  onManageWarehouse?: (product: any, e: React.MouseEvent) => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  isLoading,
  onProductClick,
  onProductDelete,
  onManageWarehouse
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm animate-pulse h-[400px]">
            <div className="aspect-[4/3] bg-gray-100" />
            <div className="p-5 space-y-4">
              <div className="h-3 bg-gray-100 w-1/3 rounded" />
              <div className="h-5 bg-gray-200 w-3/4 rounded" />
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="h-10 bg-gray-50 rounded-xl" />
                <div className="h-10 bg-gray-50 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onClick={onProductClick}
          onDelete={onProductDelete}
          onManageWarehouse={onManageWarehouse}
        />
      ))}
    </div>
  );
};

export default ProductGrid;