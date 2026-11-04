import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LowStockCard from './LowStockCard';

describe('LowStockCard Component', () => {
  it('renders nothing when widget is null', () => {
    const { container } = render(<LowStockCard widget={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders well-stocked message when no items are low on stock', () => {
    render(<LowStockCard widget={{ type: 'LOW_STOCK_CARD', count: 0, items: [] }} />);

    expect(screen.getByText('Low Stock Items')).toBeInTheDocument();
    expect(screen.getByText(/All store items are well-stocked/i)).toBeInTheDocument();
  });

  it('renders low stock items with remaining count, threshold, and triggers supplier search', () => {
    const handleFindSuppliers = vi.fn();
    const mockWidget = {
      type: 'LOW_STOCK_CARD',
      count: 2,
      threshold: 5,
      items: [
        {
          id: 'item-1',
          title: 'Tata Salt 1kg',
          remaining: 2,
          unit: 'pcs',
          sellPrice: 28,
          category: 'Groceries'
        },
        {
          id: 'item-2',
          title: 'Fortune Oil 1L',
          remaining: 1,
          unit: 'ltr',
          sellPrice: 145,
          category: 'Cooking Essentials'
        }
      ]
    };

    render(<LowStockCard widget={mockWidget} onFindSuppliers={handleFindSuppliers} />);

    // Header checks
    expect(screen.getByText('Low Stock Items')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/Threshold ≤ 5 units/i)).toBeInTheDocument();

    // Item details
    expect(screen.getByText('Tata Salt 1kg')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('₹28')).toBeInTheDocument();
    expect(screen.getByText('2 pcs')).toBeInTheDocument();

    expect(screen.getByText('Fortune Oil 1L')).toBeInTheDocument();
    expect(screen.getByText('Cooking Essentials')).toBeInTheDocument();
    expect(screen.getByText('₹145')).toBeInTheDocument();
    expect(screen.getByText('1 ltr')).toBeInTheDocument();

    // Click Suppliers button
    const supplierButtons = screen.getAllByRole('button', { name: /Suppliers/i });
    expect(supplierButtons.length).toBe(2);

    fireEvent.click(supplierButtons[0]);
    expect(handleFindSuppliers).toHaveBeenCalledWith('Tata Salt 1kg');

    fireEvent.click(supplierButtons[1]);
    expect(handleFindSuppliers).toHaveBeenCalledWith('Fortune Oil 1L');
  });
});
