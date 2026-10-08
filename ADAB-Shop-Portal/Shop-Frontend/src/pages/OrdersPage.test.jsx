/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import OrdersPage from './OrdersPage';
import { sellerApi } from '../api/sellerApi';

vi.mock('../api/sellerApi', () => ({
  sellerApi: {
    getOrders: vi.fn(),
    updateOrderStatus: vi.fn()
  }
}));

describe('OrdersPage Component', () => {
  it('renders orders fetched from the backend API', async () => {
    sellerApi.getOrders.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'ORD-6840',
          customer: 'Pooja Sharma',
          distance: '4.8',
          delivery_mode: 'express_30m',
          items: 'Rice, Oil, Salt',
          amount: 1015,
          status: 'new'
        },
        {
          id: 'ORD-7532',
          customer: 'Anita Desai',
          distance: '2.0',
          delivery_mode: 'same_day',
          items: 'Ghee, Paneer',
          amount: 44,
          status: 'new'
        }
      ]
    });

    render(
      <BrowserRouter>
        <OrdersPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Loading orders from server/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('#ORD-6840')).toBeDefined();
      expect(screen.getByText('Pooja Sharma')).toBeDefined();
      expect(screen.getByText('₹1015')).toBeDefined();
      expect(screen.getByText('#ORD-7532')).toBeDefined();
      expect(screen.getByText('Anita Desai')).toBeDefined();
    });
  });
});
