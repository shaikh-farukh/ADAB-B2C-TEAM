import React, { useEffect, useState } from 'react';
import { deliveryService, DeliveryChargeResponse } from '../../services/deliveryService';

interface DeliveryOptionSelectorProps {
    subtotal: number;
    shopId?: number;
    distanceKm?: number;
    onDeliveryChargeUpdate: (charge: number, mode: string) => void;
}

const DeliveryOptionSelector: React.FC<DeliveryOptionSelectorProps> = ({ subtotal, shopId, distanceKm, onDeliveryChargeUpdate }) => {
    const [mode, setMode] = useState<'IN_HOUSE' | 'THIRD_PARTY' | 'DISTRIBUTOR'>('IN_HOUSE');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCharge = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await deliveryService.calculateCharge({
                    mode,
                    subtotal,
                    shop_id: shopId,
                    distance_km: distanceKm
                });
                if (res.success) {
                    onDeliveryChargeUpdate(res.delivery_charge, mode);
                } else {
                    setError(res.message || 'Failed to calculate charge');
                    onDeliveryChargeUpdate(0, mode);
                }
            } catch (err: any) {
                setError(err.message || 'Network error');
                onDeliveryChargeUpdate(0, mode);
            } finally {
                setLoading(false);
            }
        };

        fetchCharge();
    }, [mode, subtotal, shopId, distanceKm]); // Re-run if inputs change

    return (
        <div className="space-y-4">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Delivery Mode</label>
            <div className="flex flex-col gap-3">
                <label className={`flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
                    ${mode === 'IN_HOUSE' ? 'border-adab-orange bg-orange-50/50 dark:bg-orange-900/20' : 'border-gray-100 dark:border-white/5 bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-white/20'}`}>
                    <input type="radio" name="deliveryMode" className="sr-only" checked={mode === 'IN_HOUSE'} onChange={() => setMode('IN_HOUSE')} />
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-200">In-House Delivery</span>
                    <span className="text-[10px] text-gray-400 mt-1">Vendor's own fleet</span>
                </label>

                <label className={`flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
                    ${mode === 'THIRD_PARTY' ? 'border-adab-green bg-green-50/50 dark:bg-green-900/20' : 'border-gray-100 dark:border-white/5 bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-white/20'}`}>
                    <input type="radio" name="deliveryMode" className="sr-only" checked={mode === 'THIRD_PARTY'} onChange={() => setMode('THIRD_PARTY')} />
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-200">Third Party Logistics</span>
                    <span className="text-[10px] text-gray-400 mt-1">Delhivery, Porter, etc.</span>
                </label>

                <label className={`flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
                    ${mode === 'DISTRIBUTOR' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-gray-100 dark:border-white/5 bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-white/20'}`}>
                    <input type="radio" name="deliveryMode" className="sr-only" checked={mode === 'DISTRIBUTOR'} onChange={() => setMode('DISTRIBUTOR')} />
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-200">Distributor Bulk Transport</span>
                    <span className="text-[10px] text-gray-400 mt-1">Bulk truckload freight</span>
                </label>
            </div>
            {loading && <p className="text-xs text-gray-400">Calculating shipping...</p>}
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
};

export default DeliveryOptionSelector;
