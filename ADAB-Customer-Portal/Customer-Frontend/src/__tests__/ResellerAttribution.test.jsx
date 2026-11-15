import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';

describe('Cross-Seller Resale & Attribution Visibility', () => {
  it('1. Renders seller name and original seller attribution badge when product is sourced/purchased from another seller', () => {
    const resellerProduct = {
      id: '4951de9b-2439-4e16-b512-e6e34f010684',
      name: 'karan cutlets',
      price: 120,
      mrp: 150,
      stock_qty: 10,
      store_id: 'd7294824-ca28-4f60-b865-2357981f1f59',
      sellerName: 'Shabbir Kirana Store',
      isResellerProduct: true,
      originalSellerName: 'mayank enterprise',
      originalStoreId: '626fd4e1-ef8b-480a-bc70-d61534da1800'
    };

    const html = renderToString(
      <MemoryRouter>
        <ProductCard product={resellerProduct} />
      </MemoryRouter>
    );

    // Current seller is displayed
    expect(html).toContain('Shabbir Kirana Store');
    // Original seller attribution is displayed
    expect(html).toContain('Source:');
    expect(html).toContain('mayank enterprise');
    expect(html).toContain('karan cutlets');
  });

  it('2. Does not render source attribution badge when product is directly owned/manufactured by the seller', () => {
    const directProduct = {
      id: 'cfe6e20e-2c0d-405d-86f6-449e4bcfa0de',
      name: 'Balaji Kurkure',
      price: 20,
      mrp: 20,
      stock_qty: 50,
      store_id: 'd7294824-ca28-4f60-b865-2357981f1f59',
      sellerName: 'Shabbir Kirana Store',
      isResellerProduct: false,
      originalSellerName: null
    };

    const html = renderToString(
      <MemoryRouter>
        <ProductCard product={directProduct} />
      </MemoryRouter>
    );

    expect(html).toContain('Shabbir Kirana Store');
    expect(html).not.toContain('Source:');
  });
});
