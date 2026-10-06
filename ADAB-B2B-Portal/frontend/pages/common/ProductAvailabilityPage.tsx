import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { discoveryService, ProductAvailability } from '../../services/discoveryService';
import { Search, Package, MapPin, Building2, Eye } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

const ProductAvailabilityPage: React.FC = () => {
    const navigate = useNavigate();
    const { role } = useAuthStore();
    const [products, setProducts] = useState<ProductAvailability[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const handleViewProduct = (productId: number) => {
        if (role === 'manufacturer') {
            navigate(`/manufacturer/products/view/${productId}`);
        } else {
            navigate(`/distributor/catalog/view/${productId}`);
        }
    };

    const fetchProducts = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await discoveryService.searchProductAvailability({ search: searchQuery, page, limit: 12 });
            if (res.success) {
                setProducts(res.data);
                setTotalPages(res.pagination.totalPages);
            } else {
                setError(res.message || 'Failed to fetch product availability');
            }
        } catch (err: any) {
            setError(err.message || 'Error connecting to server');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [page]);

    // Automatically search when the user types or clears the input
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (page === 1) {
                fetchProducts();
            } else {
                setPage(1);
            }
        }, 500); // 500ms debounce
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (page === 1) {
            fetchProducts();
        } else {
            setPage(1);
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
            <div className="mb-10 text-center">
                <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center justify-center gap-3">
                    <Search className="w-10 h-10 text-adab-green" />
                    Product Stock Locator
                </h1>
                <p className="mt-4 text-gray-500 max-w-2xl mx-auto">Find out where to buy exactly what you need. Real-time availability from nearby suppliers.</p>
            </div>

            {/* Search Bar */}
            <div className="max-w-3xl mx-auto mb-12">
                <form onSubmit={handleSearch} className="relative flex items-center">
                    <Search className="absolute left-6 text-gray-400 w-6 h-6" />
                    <input
                        type="text"
                        placeholder="Search for a product name, SKU, or category..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-16 pr-32 py-5 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-full focus:ring-4 focus:ring-adab-green/20 focus:border-adab-green outline-none text-lg font-medium shadow-sm transition-all"
                    />
                    <button type="submit" className="absolute right-3 px-6 py-3 bg-adab-green text-white font-bold rounded-full hover:bg-green-600 transition-colors uppercase tracking-widest text-xs">
                        Find Stock
                    </button>
                </form>
            </div>

            {/* Results */}
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-adab-green"></div>
                </div>
            ) : error ? (
                <div className="text-center text-red-500 py-10 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100">{error}</div>
            ) : products.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-500">
                    No products found in stock for your search. Try different keywords.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map(product => (
                        <div 
                            key={`${product.product_id}-${product.shop_id}`} 
                            onClick={() => handleViewProduct(product.product_id)}
                            className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full cursor-pointer border-b-4 hover:border-b-adab-green"
                        >
                            {/* Image container */}
                            <div className="h-52 bg-gradient-to-b from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center relative overflow-hidden p-4">
                                {product.images && product.images.length > 0 ? (
                                    <img src={product.images[0]} alt={product.product_name} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <Package className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                                )}
                                <div className="absolute top-3 right-3 bg-adab-green/90 text-white backdrop-blur-sm px-3 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase shadow-2xs">
                                    IN STOCK
                                </div>
                            </div>
                            <div className="p-6 flex-1 flex flex-col">
                                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-adab-green transition-colors min-h-[2.5rem]">
                                    {product.product_name}
                                </h3>
                                <p className="text-adab-darkGreen dark:text-adab-green font-black text-xl mb-4">
                                    {product.currency || '₹'}{Number(product.price).toFixed(2)} <span className="text-xs text-gray-400 font-bold uppercase">/ {product.unit}</span>
                                </p>

                                <div className="mt-auto space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                                        <Building2 className="w-4 h-4 text-adab-orange shrink-0" />
                                        <span className="truncate">{product.shop_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                                        <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                                        <span>{product.city || 'Location unavailable'}</span>
                                    </div>
                                    <div className="bg-adab-green/10 text-adab-darkGreen dark:text-adab-green font-bold px-3 py-2 rounded-xl text-xs flex justify-between items-center mt-2 border border-adab-green/20">
                                        <span>Warehouse Stock</span>
                                        <span className="text-sm font-black">{product.warehouse_stock} {product.unit}s</span>
                                    </div>

                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleViewProduct(product.product_id);
                                        }}
                                        className="w-full mt-3 py-2.5 px-3 bg-gray-100 dark:bg-gray-700/60 hover:bg-adab-green hover:text-white dark:hover:bg-adab-green text-gray-700 dark:text-gray-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                                    >
                                        <Eye className="w-4 h-4" /> View Full Specs
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-12">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className="px-5 py-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-gray-600 dark:border-gray-700 dark:hover:bg-gray-800 dark:text-gray-300"
                    >
                        Previous
                    </button>
                    <div className="flex items-center px-4 font-bold text-gray-400">Page {page} of {totalPages}</div>
                    <button
                        disabled={page === totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        className="px-5 py-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-gray-600 dark:border-gray-700 dark:hover:bg-gray-800 dark:text-gray-300"
                    >
                        Next Page
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProductAvailabilityPage;
