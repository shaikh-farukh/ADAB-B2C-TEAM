import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';

const FeaturedShopsPage = () => {
    const { role } = useAuthStore();
    const [shops, setShops] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [requestedIds, setRequestedIds] = useState<number[]>([]);

    const pageTitle = role === 'distributor' ? "Featured Retail Partners" 
                    : role === 'manufacturer' ? "Featured Distribution Networks" 
                    : "Featured Suppliers & Brands";

    useEffect(() => {
        const fetchFeatured = async () => {
            try {
                const res = await apiClient.get('/discovery/featured-shops', {
                    params: { requesterRole: role }
                });
                if (res.data.success) {
                    setShops(res.data.data);
                }
            } catch (error) {
                console.error("Failed to fetch featured shops", error);
            } finally {
                setLoading(false);
            }
        };
        fetchFeatured();
    }, []);

    const handleConnect = async (targetId: number) => {
        try {
            const res = await apiClient.post('/discovery/connect', { target_shop_id: targetId });
            if (res.data.success) {
                toast.success('Connection requested successfully!');
                setRequestedIds(prev => [...prev, targetId]);
            }
        } catch (error: any) {
            console.error("Connection request failed:", error);
            toast.error(error.response?.data?.message || 'Failed to request connection');
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <span className="text-3xl">⭐</span>
                <h1 className="text-3xl font-bold dark:text-white">{pageTitle}</h1>
            </div>

            {loading ? (
                <div className="text-center py-10 dark:text-white">Loading featured partners...</div>
            ) : shops.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">No Featured Profiles Found</h3>
                    <p className="text-gray-500">There are currently no featured partners in your region. Check back later or expand your search.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {shops.map(shop => (
                        <div key={shop.id} className="bg-gradient-to-br from-yellow-50 to-white dark:from-gray-800 dark:to-gray-900 border border-yellow-200 dark:border-yellow-700 rounded-lg shadow-sm hover:shadow-xl transition transform hover:-translate-y-1 overflow-hidden">
                            <div className="p-5">
                                <div className="text-xs font-bold text-yellow-600 uppercase tracking-wider mb-2">
                                    {shop.campaign_name || 'Promoted'}
                                </div>
                                <h3 className="text-xl font-bold mb-1 dark:text-white">{shop.shop_name}</h3>
                                <p className="text-gray-700 dark:text-gray-300 mb-4">{shop.business_category}</p>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    {shop.city}, {shop.state} - {shop.pincode}
                                </div>
                                <div className="mt-auto">
                                    <button 
                                        onClick={() => handleConnect(shop.id)}
                                        disabled={requestedIds.includes(shop.id)}
                                        className={`w-full py-2 font-bold rounded-lg transition-colors ${
                                            requestedIds.includes(shop.id) 
                                                ? 'bg-gray-300 text-gray-600 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400' 
                                                : 'bg-adab-orange text-white hover:bg-orange-600'
                                        }`}
                                    >
                                        {requestedIds.includes(shop.id) ? 'Requested' : (role === 'distributor' ? 'Pitch Catalog' : 'Request Connection')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FeaturedShopsPage;
