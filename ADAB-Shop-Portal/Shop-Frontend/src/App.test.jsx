/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import App from './App';

vi.mock('./services/sellerService', () => ({
  default: {
    getProfile: vi.fn().mockResolvedValue({ data: { full_name: 'Test Seller' } }),
    getStore: vi.fn().mockResolvedValue({ data: { store_name: 'My Store' } }),
    getDashboardMetrics: vi.fn().mockResolvedValue({ success: true, data: { total_orders: 10, total_gross_revenue: 5000, fulfilled_orders: 5, cancelled_orders: 1, avg_fulfillment_time_minutes: 20, customer_rating_avg: 4.5 } }),
    getUnreadNotificationsCount: vi.fn().mockResolvedValue({ data: { unread_count: 0 } }),
    getNotifications: vi.fn().mockResolvedValue({ data: [] })
  }
}));

describe('Seller Portal App Shell', () => {
  it('should render the sidebar navigation links', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getAllByText('My Store').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText('App Orders')).toBeDefined();
  });
});
