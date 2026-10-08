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
    
    // Check if store name is rendered in the header and sidebar
    expect(screen.getAllByText('My Store').length).toBeGreaterThanOrEqual(1);
    
    // Check if the Dashboard overview cards exist
    expect(screen.getByText("Quick Bill Counter")).toBeDefined();
  });
});
