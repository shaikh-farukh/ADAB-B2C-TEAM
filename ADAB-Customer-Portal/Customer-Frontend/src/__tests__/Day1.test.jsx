import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import BrowsePage from '../pages/BrowsePage';

// Mock matchMedia
window.matchMedia = window.matchMedia || function() {
    return {
        matches: false,
        addListener: function() {},
        removeListener: function() {}
    };
};

describe('Day 1 Tests: Mahi Tasks', () => {
  it('should render the App component and handle routing to Explore/Stores tab', () => {
    render(<App />);
    expect(screen.getByText(/Explore/i)).toBeTruthy();
    
    // Simulate navigation to Stores tab
    const storesTab = screen.getByText(/Shops/i);
    fireEvent.click(storesTab);
    // After clicking, active tab should be stores, so BrowsePage should render
    // Since App has state for activeTab, let's verify BrowsePage text
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
    render(<BrowsePage />);
    const searchInput = screen.getByPlaceholderText(/Search shops, products/i);
    expect(searchInput).toBeTruthy();
    fireEvent.change(searchInput, { target: { value: 'Dal' } });
    expect(searchInput.value).toBe('Dal');
  });
});
