import React, { useEffect, useState } from 'react';
import { discoveryService, Shop } from '../../services/discoveryService';
import { MapPin, Store, Filter } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

const ShopsByAreaPage: React.FC = () => {
    const { role } = useAuthStore();
    const [shops, setShops] = useState<Shop[]>([]);
    const [city, setCity] = useState('');
    const [area, setArea] = useState('');
    const [category, setCategory] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [hasSearched, setHasSearched] = useState(false);
    const [activeTab, setActiveTab] = useState<'All' | 'Retailer' | 'Manufacturer'>('All');

    const fetchShops = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await discoveryService.searchShopsByArea({ city, area, category, page, limit: 10, requesterRole: role } as any);
            if (res.success) {
                setShops(res.data);
                setTotalPages(res.pagination.totalPages);
            } else {
                setError(res.message || 'Failed to fetch shops');
            }
        } catch (err: any) {
            setError(err.message || 'Error connecting to server');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (hasSearched) {
            fetchShops();
        }
    }, [page]);

    useEffect(() => {
        if (city.trim() === '' && area.trim() === '' && category.trim() === '') {
            setHasSearched(false);
            setShops([]);
            setPage(1);
        }
    }, [city, area, category]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!hasSearched) {
            setHasSearched(true);
            if (page === 1) fetchShops();
            else setPage(1);
        } else {
            if (page === 1) fetchShops();
            else setPage(1);
        }
    };

    const filteredShops = shops.filter(shop => {
        if (role !== 'distributor') return true;
        if (activeTab === 'All') return true;
        return (shop as any).role === activeTab;
    });

    return (
        <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
            <div className="mb-10 text-center">
                <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center justify-center gap-3">
                    <Store className="w-10 h-10 text-adab-orange" />
                    Hyperlocal Shop Finder
                </h1>
                <p className="mt-4 text-gray-500 max-w-2xl mx-auto">Discover top-rated wholesale suppliers and manufacturers in your city and locality.</p>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">City</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                                type="text" 
                                placeholder="E.g. Mumbai, Surat" 
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-adab-orange focus:border-adab-orange outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Locality / Area</label>
                        <input 
                            type="text" 
                            placeholder="E.g. Navrangpura" 
                            value={area}
                            onChange={(e) => setArea(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-adab-orange focus:border-adab-orange outline-none"
                        />
                    </div>
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Category</label>
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                                type="text" 
                                placeholder="E.g. Electronics, Groceries" 
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-adab-orange focus:border-adab-orange outline-none"
                            />
                        </div>
                    </div>
                    <button type="submit" className="w-full md:w-auto px-8 py-3 bg-adab-orange text-white font-bold rounded-xl hover:bg-orange-600 transition-colors">
                        Search
                    </button>
                </form>
            </div>

            {/* Results */}
            {!hasSearched ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-500">
                    Enter a city and locality to find verified B2B partners in that area.
                </div>
            ) : loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-adab-orange"></div>
                </div>
            ) : error ? (
                <div className="text-center text-red-500 py-10 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100">{error}</div>
            ) : (
                <>
                    {role === 'distributor' && (
                        <div className="flex justify-center gap-4 mb-6">
                            {(['All', 'Retailer', 'Manufacturer'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-2 rounded-full font-medium transition-colors ${activeTab === tab ? 'bg-adab-orange text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
                                >
                                    {tab === 'All' ? 'All' : tab === 'Retailer' ? 'Retail Shops' : 'Manufacturers'}
                                </button>
                            ))}
                        </div>
                    )}
                    {filteredShops.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-500">
                            No shops found matching your criteria. Try adjusting your filters.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredShops.map(shop => (
                            <div key={shop.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer group">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900 dark:text-white group-hover:text-adab-orange transition-colors">{shop.shop_name}</h3>
                                        <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-[10px] font-bold text-gray-500 rounded-md mt-2">{shop.business_category || 'General'}</span>
                                    </div>
                                    <div className={`w-3 h-3 rounded-full ${shop.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-300'}`} title={shop.status}></div>
                                </div>
                                <div className="flex items-center text-gray-500 text-sm mt-4 gap-2">
                                    <MapPin className="w-4 h-4 text-adab-orange" />
                                    <span>{shop.city}{shop.state ? `, ${shop.state}` : ''} {shop.pincode}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    )}
                </>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-10">
                    <button 
                        disabled={page === 1} 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:hover:bg-gray-800 dark:text-white"
                    >
                        Prev
                    </button>
                    <span className="flex items-center px-4 text-sm font-bold text-gray-500">Page {page} of {totalPages}</span>
                    <button 
                        disabled={page === totalPages} 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:hover:bg-gray-800 dark:text-white"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default ShopsByAreaPage;
