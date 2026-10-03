import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import { useAuthStore } from '../../store/useAuthStore';

const ShopsNearMePage = () => {
    const { role } = useAuthStore();
    const [shops, setShops] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [pincode, setPincode] = useState('');
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const defaultTargetType = role === 'manufacturer' ? 'Distributor' : role === 'retailer' ? 'Distributor' : 'Retailer';
    const [targetType, setTargetType] = useState(defaultTargetType);

    const pageHeader = `${targetType}s Near Me`;
    const emptyStateText = hasSearched 
        ? `No ${targetType.toLowerCase()}s found nearby. Try expanding your search.`
        : `Search by location or pincode to find ${targetType.toLowerCase()}s near you.`;

    const fetchNearMe = async (latitude?: number, longitude?: number, pin?: string) => {
        setLoading(true);
        try {
            const params: any = { targetType };
            if (latitude && longitude) {
                params.latitude = latitude;
                params.longitude = longitude;
            } else if (pin) {
                params.pincode = pin;
            } else {
                setLoading(false);
                return;
            }
            const res = await apiClient.get('/discovery/shops-near-me', { params });
            if (res.data.success) {
                setShops(res.data.data);
                setHasSearched(true);
            }
        } catch (error) {
            console.error("Failed to fetch shops near me", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (hasSearched) {
            fetchNearMe(lat || undefined, lng || undefined, pincode || undefined);
        }
    }, [targetType]);

    const handleUseLocation = () => {
        if (navigator.geolocation) {
            setLoading(true); // Show loading immediately while waiting for browser GPS
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const newLat = position.coords.latitude;
                    const newLng = position.coords.longitude;
                    setLat(newLat);
                    setLng(newLng);
                    setPincode(''); // Clear pincode if using GPS
                    fetchNearMe(newLat, newLng, undefined);
                },
                (err) => {
                    setLoading(false);
                    alert("Could not get location. Try entering pincode.");
                }
            );
        } else {
            alert("Geolocation is not supported by your browser");
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold dark:text-white">{pageHeader}</h1>
                {role === 'distributor' && (
                    <div className="flex items-center space-x-2">
                        <label className="text-gray-700 dark:text-gray-300 font-medium">Search for:</label>
                        <select 
                            value={targetType}
                            onChange={(e) => {
                                setTargetType(e.target.value);
                            }}
                            className="border p-2 rounded dark:bg-gray-700 dark:text-white"
                        >
                            <option value="Retailer">Retailers</option>
                            <option value="Manufacturer">Manufacturers</option>
                        </select>
                    </div>
                )}
            </div>

            <div className="flex gap-4 mb-8 bg-white dark:bg-gray-800 p-4 rounded shadow">
                <button
                    onClick={handleUseLocation}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                    📍 Use My Location
                </button>
                <div className="flex items-center gap-2 border-l pl-4 dark:border-gray-600">
                    <span className="text-gray-500 dark:text-gray-400">OR</span>
                    <input
                        type="text"
                        value={pincode}
                        onChange={(e) => {
                            setPincode(e.target.value);
                            if (e.target.value.trim() === '') {
                                setShops([]);
                                setHasSearched(false);
                            }
                        }}
                        placeholder="Enter Pincode"
                        className="border p-2 rounded dark:bg-gray-700 dark:text-white"
                    />
                    <button
                        onClick={() => {
                            setLat(null);
                            setLng(null);
                            fetchNearMe(undefined, undefined, pincode);
                        }}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                    >
                        Search
                    </button>
                    {hasSearched && (
                        <button
                            onClick={() => {
                                setShops([]);
                                setPincode('');
                                setLat(null);
                                setLng(null);
                                setHasSearched(false);
                            }}
                            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition ml-2"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10 dark:text-white">Searching for nearest {targetType.toLowerCase()}s...</div>
            ) : shops.length === 0 ? (
                <div className="text-center py-10 text-gray-500">{emptyStateText}</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {shops.map(shop => (
                        <div key={shop.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                            <div className="p-5">
                                <h3 className="text-xl font-semibold mb-2 dark:text-white">{shop.shop_name}</h3>
                                <p className="text-gray-600 dark:text-gray-300 mb-1">{shop.business_category} - <span className="text-indigo-500 font-medium">{shop.role}</span></p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    📍 {shop.city}, {shop.state} - {shop.pincode}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ShopsNearMePage;
