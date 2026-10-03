import apiClient from './apiClient';

export interface DeliveryChargeRequest {
    mode: 'IN_HOUSE' | 'THIRD_PARTY' | 'DISTRIBUTOR';
    subtotal: number;
    shop_id?: number;
    distance_km?: number;
}

export interface DeliveryChargeResponse {
    success: boolean;
    delivery_charge: number;
    mode: string;
    message?: string;
}

export const deliveryService = {
    calculateCharge: async (data: DeliveryChargeRequest): Promise<DeliveryChargeResponse> => {
        const response = await apiClient.post('/delivery/calculate-charge', data);
        return response.data;
    }
};
