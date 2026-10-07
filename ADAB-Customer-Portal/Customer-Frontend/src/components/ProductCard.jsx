import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
  return (
    <Link to={`/product/${product.id}`} className="prod-card group block">
      <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-green-50/50 flex items-center justify-center overflow-hidden p-4">
        <img 
          src={product.image || 'https://via.placeholder.com/300'} 
          alt={product.name} 
          className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500"
        />
        {product.discount > 0 && (
          <div className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow-sm">
            {product.discount}% OFF
          </div>
        )}
      </div>
      <div className="p-3">
        <span className="store-chip">{product.sellerName || 'Store'}</span>
        <div className="font-bold text-[13px] leading-snug mt-1.5 line-clamp-2 min-h-[2.4rem] text-gray-900">
          {product.name}
        </div>
        <div className="text-[11px] text-gray-400 mt-0.5">
          {product.unit || '1 unit'}
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <span className="font-extrabold text-base text-brand-dark">₹{product.price}</span>
          <button onClick={(e) => e.preventDefault()} className="add-btn hover:bg-brand-green hover:text-white transition-colors">ADD</button>
        </div>
      </div>
    </Link>
  );
}
