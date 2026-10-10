import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import BrowsePage from '../pages/BrowsePage.jsx';
import ProductCard from '../components/ProductCard.jsx';
import HomePage from '../pages/HomePage.jsx';

describe('Store and Approval Filter Tests', () => {
  it('1. BrowsePage renders Shop Hero Banner when a store is selected', () => {
    const selectedStore = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Shabbir Grocery Shop',
      area: 'Vesu Main Road',
      rating: 4.8,
      distance: '1.2 km'
    };

    const html = renderToString(
      <MemoryRouter initialEntries={['/stores?store_id=00000000-0000-0000-0000-000000000001']}>
        <BrowsePage selectedStore={selectedStore} selectedStoreId={selectedStore.id} />
      </MemoryRouter>
    );

    expect(html).toContain('Shabbir Grocery Shop');
    expect(html).toContain('OPEN NOW');
    expect(html).toContain('View All Shops');
    expect(html).toContain('Showing approved items from Shabbir Grocery Shop');
  });

  it('2. BrowsePage sidebar includes Shops filter section to toggle between stores and all shops', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/stores']}>
        <BrowsePage />
      </MemoryRouter>
    );

    expect(html).toContain('Shops');
    expect(html).toContain('All Local Shops');
  });

  it('3. ProductCard displays seller name and links to that shop', () => {
    const product = {
      id: 'prod-123',
      name: 'Balaji Chips',
      price: 10,
      mrp: 15,
      rating: 4.5,
      sellerName: 'Shabbir Grocery Shop',
      store_id: '00000000-0000-0000-0000-000000000001'
    };

    const html = renderToString(
      <MemoryRouter initialEntries={['/']}>
        <ProductCard product={product} />
      </MemoryRouter>
    );

    const cleanHtml = html.replace(/<!--.*?-->/g, '');
    expect(cleanHtml).toContain('Shabbir Grocery Shop');
    expect(cleanHtml).toContain('Balaji Chips');
    expect(cleanHtml).toContain('₹10');
  });

  it('4. HomePage renders shops and stores section with shop avatars', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/']}>
        <HomePage />
      </MemoryRouter>
    );

    expect(html).toContain('Live in your zone');
    expect(html).toContain('OPEN NOW');
  });
});
