import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from './Sidebar';
import { SellerProvider } from '../../context/SellerContext';
import { LanguageProvider } from '../../context/LanguageContext';
import { sellerApi } from '../../api/sellerApi';

vi.mock('../../api/sellerApi', () => ({
  sellerApi: {
    getOrders: vi.fn().mockResolvedValue({ success: true, data: [{ id: 1 }, { id: 2 }, { id: 3 }] }),
    getB2BOrders: vi.fn().mockResolvedValue({ success: true, data: [{ id: 10 }] }),
    getReturns: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getThreads: vi.fn().mockResolvedValue({ success: true, data: [{ thread_id: 1, unread_count: 2 }] })
  }
}));

vi.mock('../../services/sellerService', () => ({
  default: {
    getProfile: vi.fn().mockResolvedValue({ success: true, data: { id: 1 } }),
    getStore: vi.fn().mockResolvedValue({ success: true, data: { id: 1, store_name: 'Test Store' } }),
    getSettings: vi.fn().mockResolvedValue({ success: true, data: {} }),
    getDashboardMetrics: vi.fn().mockResolvedValue({ success: true, data: {} })
  }
}));

describe('Sidebar Component Dynamic Badges', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders dynamic counts and reacts to real-time events', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <LanguageProvider>
            <SellerProvider>
              <Sidebar />
            </SellerProvider>
          </LanguageProvider>
        </BrowserRouter>
      );
    });

    const ordersBadge = document.getElementById('navOrdersBadge');
    expect(ordersBadge).toBeDefined();

    // Trigger adab-orders-updated event with dynamic count
    act(() => {
      window.dispatchEvent(new CustomEvent('adab-orders-updated', { detail: { count: 25 } }));
    });
    expect(ordersBadge.textContent).toBe('25');

    // Trigger adab-b2b-updated event
    const b2bBadge = document.getElementById('navB2BBadge');
    expect(b2bBadge).toBeDefined();
    act(() => {
      window.dispatchEvent(new CustomEvent('adab-b2b-updated', { detail: { count: 11 } }));
    });
    expect(b2bBadge.textContent).toBe('11');

    // Trigger adab-returns-updated event
    const returnsBadge = document.getElementById('navReturnsBadge');
    expect(returnsBadge).toBeDefined();
    act(() => {
      window.dispatchEvent(new CustomEvent('adab-returns-updated', { detail: { count: 4 } }));
    });
    expect(returnsBadge.textContent).toBe('4');

    // Trigger adab-messages-updated event
    const messagesBadge = document.getElementById('navMessagesBadge');
    expect(messagesBadge).toBeDefined();
    act(() => {
      window.dispatchEvent(new CustomEvent('adab-messages-updated', { detail: { count: 8 } }));
    });
    expect(messagesBadge.textContent).toBe('8');
  });

  it('renders cached counts immediately on mount without showing 0 and updates once backend responds', async () => {
    localStorage.setItem('seller_sidebar_counts', JSON.stringify({
      orders: 14,
      b2b: 8,
      returns: 3,
      messages: 5
    }));

    let resolveOrders;
    sellerApi.getOrders.mockImplementationOnce(() => new Promise((res) => { resolveOrders = res; }));

    render(
      <BrowserRouter>
        <LanguageProvider>
          <SellerProvider>
            <Sidebar />
          </SellerProvider>
        </LanguageProvider>
      </BrowserRouter>
    );

    // Initial render from cache before backend finishes
    expect(document.getElementById('navOrdersBadge').textContent).toBe('14');
    expect(document.getElementById('navB2BBadge').textContent).toBe('8');
    expect(document.getElementById('navReturnsBadge').textContent).toBe('3');
    expect(document.getElementById('navMessagesBadge').textContent).toBe('5');

    // Once backend responds, updates to fresh backend count
    await act(async () => {
      resolveOrders({ success: true, data: [{ id: 1 }, { id: 2 }, { id: 3 }] });
    });
    expect(document.getElementById('navOrdersBadge').textContent).toBe('3');
  });
});
