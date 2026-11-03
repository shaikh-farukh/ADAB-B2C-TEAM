import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import OrderListCard from './OrderListCard';

describe('OrderListCard Component', () => {
  const mockOrders = [
    {
      id: 'ORD-105',
      actionId: '105',
      customer: 'Priya Sharma',
      amount: 450,
      items: 'Basmati Rice 5kg',
      status: 'DELIVERED',
      createdAt: '2026-11-01T10:00:00Z',
      fullOrder: { id: 'ORD-105', status: 'delivered' }
    },
    {
      id: 'ORD-108',
      actionId: '108',
      customer: 'Rahul Verma',
      amount: 320,
      items: 'Sunflower Oil 1L, Sugar 1kg',
      status: 'ACCEPTED',
      createdAt: '2026-11-03T11:00:00Z',
      fullOrder: { id: 'ORD-108', status: 'accepted' }
    },
    {
      id: 'ORD-106',
      actionId: '106',
      customer: 'Amit Patel',
      amount: 210,
      items: 'Tata Salt 1kg, Atta 5kg',
      status: 'PACKED',
      createdAt: '2026-11-02T09:00:00Z',
      fullOrder: { id: 'ORD-106', status: 'packed' }
    },
    {
      id: 'ORD-104',
      actionId: '104',
      customer: 'Neha Gupta',
      amount: 150,
      items: 'Milk 1L',
      status: 'CANCELLED',
      createdAt: '2026-10-30T08:00:00Z',
      fullOrder: { id: 'ORD-104', status: 'cancelled' }
    }
  ];

  it('renders nothing when widget has no orders', () => {
    const { container } = render(
      <OrderListCard widget={{ orders: [] }} messageId="msg-1" actionLoading={{}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders all orders and sorts pending orders first', () => {
    render(
      <OrderListCard
        widget={{ orders: mockOrders }}
        messageId="msg-1"
        actionLoading={{}}
        onPackOrder={vi.fn()}
        onPackAll={vi.fn()}
        onSelectOrder={vi.fn()}
      />
    );

    // Header count
    expect(screen.getByText(/Store Orders \(4\)/i)).toBeInTheDocument();

    // Filter tabs
    expect(screen.getByRole('button', { name: /All \(4\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pending \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delivered \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancelled \(1\)/i })).toBeInTheDocument();

    // Badges & Buttons
    expect(screen.getByText('Delivered')).toBeInTheDocument();
    expect(screen.getByText('Packed')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pack$/i })).toBeInTheDocument();

    // Batch pack button for the 1 pending order
    expect(
      screen.getByRole('button', { name: /Pack All Pending Orders \(1\)/i })
    ).toBeInTheDocument();
  });

  it('filters list when filter tab is clicked', () => {
    render(
      <OrderListCard
        widget={{ orders: mockOrders }}
        messageId="msg-1"
        actionLoading={{}}
        onPackOrder={vi.fn()}
        onPackAll={vi.fn()}
        onSelectOrder={vi.fn()}
      />
    );

    // Click Delivered tab
    fireEvent.click(screen.getByRole('button', { name: /Delivered \(1\)/i }));

    expect(screen.getByText(/Priya Sharma/i)).toBeInTheDocument();
    expect(screen.queryByText(/Rahul Verma/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Amit Patel/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Neha Gupta/i)).not.toBeInTheDocument();

    // Click Pending tab
    fireEvent.click(screen.getByRole('button', { name: /Pending \(1\)/i }));

    expect(screen.getByText(/Rahul Verma/i)).toBeInTheDocument();
    expect(screen.queryByText(/Priya Sharma/i)).not.toBeInTheDocument();
  });

  it('triggers onSelectOrder when order row is clicked', () => {
    const handleSelectOrder = vi.fn();
    render(
      <OrderListCard
        widget={{ orders: mockOrders }}
        messageId="msg-1"
        actionLoading={{}}
        onPackOrder={vi.fn()}
        onPackAll={vi.fn()}
        onSelectOrder={handleSelectOrder}
      />
    );

    fireEvent.click(screen.getByText(/Rahul Verma/i));
    expect(handleSelectOrder).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ORD-108', customer: 'Rahul Verma' })
    );
  });

  it('triggers onPackOrder when Pack button is clicked', () => {
    const handlePackOrder = vi.fn();
    render(
      <OrderListCard
        widget={{ orders: mockOrders }}
        messageId="msg-1"
        actionLoading={{}}
        onPackOrder={handlePackOrder}
        onPackAll={vi.fn()}
        onSelectOrder={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Pack$/i }));
    expect(handlePackOrder).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ORD-108' }),
      'msg-1'
    );
  });

  it('triggers onPackAll when Batch Pack button is clicked', () => {
    const handlePackAll = vi.fn();
    render(
      <OrderListCard
        widget={{ orders: mockOrders }}
        messageId="msg-1"
        actionLoading={{}}
        onPackOrder={vi.fn()}
        onPackAll={handlePackAll}
        onSelectOrder={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Pack All Pending Orders \(1\)/i }));
    expect(handlePackAll).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 'ORD-108' })],
      'msg-1'
    );
  });

  it('only displays 10 orders at a time and expands when Show Next button is clicked', () => {
    // Generate 15 mock orders
    const fifteenOrders = Array.from({ length: 15 }, (_, i) => ({
      id: `ORD-${200 + i}`,
      actionId: `${200 + i}`,
      customer: `Customer ${i + 1}`,
      amount: 100 + i * 10,
      items: 'Assorted Grocery',
      status: 'DELIVERED',
      createdAt: `2026-11-01T10:${i < 10 ? '0' + i : i}:00Z`,
      fullOrder: { id: `ORD-${200 + i}`, status: 'delivered' }
    }));

    render(
      <OrderListCard
        widget={{ orders: fifteenOrders }}
        messageId="msg-paged"
        actionLoading={{}}
        onPackOrder={vi.fn()}
        onPackAll={vi.fn()}
        onSelectOrder={vi.fn()}
      />
    );

    // Header indicates 10 of 15
    expect(screen.getByText(/Store Orders \(10 of 15\)/i)).toBeInTheDocument();

    // Exactly 10 order cards visible initially (ORD-214 down to ORD-205 by newest date)
    expect(screen.getByText(/ORD-214/i)).toBeInTheDocument();
    expect(screen.getByText(/ORD-205/i)).toBeInTheDocument();
    expect(screen.queryByText(/ORD-204/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ORD-200/i)).not.toBeInTheDocument();

    // Show Next button is present
    const showNextBtn = screen.getByRole('button', { name: /Show Next 5 Orders \(5 remaining\)/i });
    expect(showNextBtn).toBeInTheDocument();

    // Click Show Next button
    fireEvent.click(showNextBtn);

    // Now all 15 orders are visible including ORD-204 down to ORD-200
    expect(screen.getByText(/ORD-204/i)).toBeInTheDocument();
    expect(screen.getByText(/ORD-200/i)).toBeInTheDocument();
    expect(screen.getByText(/Store Orders \(15\)/i)).toBeInTheDocument();

    // Show Next button disappears when all orders are displayed
    expect(screen.queryByRole('button', { name: /Show Next/i })).not.toBeInTheDocument();
  });
});
