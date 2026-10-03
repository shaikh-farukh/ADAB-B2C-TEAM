import apiClient from './apiClient';

export interface Shop {
    id: number;
    shop_name: string;
    business_category: string;
    city: string;
    state: string;
    pincode: string;
    status: string;
}

export interface ProductAvailability {
    product_id: number;
    product_name: string;
    price: number;
    currency?: string;
    warehouse_stock: number;
    unit: string;
    shop_id: number;
    shop_name: string;
    city: string;
    images?: string[];
}

export interface PaginationData {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface DiscoveryResponse<T> {
    success: boolean;
    data: T[];
    pagination: PaginationData;
    message?: string;
}

export const discoveryService = {
    searchShopsByArea: async (params: { city?: string; area?: string; category?: string; page?: number; limit?: number }): Promise<DiscoveryResponse<Shop>> => {
        const response = await apiClient.get('/discovery/area', { params });
        return response.data;
    },
    searchProductAvailability: async (params: { search?: string; page?: number; limit?: number }): Promise<DiscoveryResponse<ProductAvailability>> => {
        const response = await apiClient.get('/discovery/product', { params });
        return response.data;
    }
};
