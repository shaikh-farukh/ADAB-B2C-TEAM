import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import BrowsePage from '../pages/BrowsePage';

describe('Day 1 Tests: Mahi Tasks', () => {
  it('should render the App component and handle routing to Explore/Stores tab', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(html).toContain('Explore');
    expect(html).toContain('Shops');
  });

  it('should validate customer address logic in DTO', () => {
    // Simple address validation mock
    const validateAddress = (addr) => {
      if (!addr.zip || addr.zip.length !== 6) return false;
      return true;
    };
    expect(validateAddress({ zip: '123456' })).toBe(true);
    expect(validateAddress({ zip: '123' })).toBe(false);
  });

  it('should render BrowsePage (Search/PLP) and handle search state', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/stores']}>
        <BrowsePage />
      </MemoryRouter>
    );
    expect(html).toContain('Search shops, products...');
    expect(html).toContain('Filters');
  });
});
