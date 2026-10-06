/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import App from './App';

describe('Seller Portal App Shell', () => {
  it('should render the sidebar navigation links', () => {
    render(<App />);
    
    // Check if store name is rendered in the header
    expect(screen.getByText('Shri Balaji Store')).toBeDefined();
    
    // Check if the Dashboard overview exists
    expect(screen.getByText("Today's Sales")).toBeDefined();
  });
});
