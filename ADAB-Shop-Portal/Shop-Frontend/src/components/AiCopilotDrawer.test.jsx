import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AiCopilotDrawer from './AiCopilotDrawer';

// Mock context providers
vi.mock('../context/SellerContext', () => ({
  useSeller: () => ({
    store: { store_name: 'Test Kirana Store' },
    profile: { full_name: 'Mayank Merchant' }
  })
}));

vi.mock('../context/LanguageContext', () => ({
  useTranslation: () => ({
    t: (key) => key,
    language: 'en'
  })
}));

vi.mock('../services/api', () => ({
  default: {
    post: vi.fn()
  }
}));

vi.mock('../utils/audioAlert', () => ({
  playNotificationChime: vi.fn()
}));

describe('AiCopilotDrawer Component (Phase 3 UI Polish)', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <BrowserRouter>
        <AiCopilotDrawer isOpen={false} onClose={vi.fn()} />
      </BrowserRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders header, quick pills, and input bar when isOpen is true', () => {
    render(
      <BrowserRouter>
        <AiCopilotDrawer isOpen={true} onClose={vi.fn()} />
      </BrowserRouter>
    );

    // Header & Badge
    expect(screen.getByText('ADAB Copilot')).toBeInTheDocument();
    expect(screen.getByText('Gemini 3.5')).toBeInTheDocument();
    expect(screen.getByText(/Test Kirana Store/i)).toBeInTheDocument();

    // Quick suggestion pills
    expect(screen.getByRole('button', { name: /Pack Orders/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sales Report/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Low Stock/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /GSTR Tax/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Store Status/i })).toBeInTheDocument();

    // Welcome Message
    expect(screen.getByText(/Namaste Mayank/i)).toBeInTheDocument();

    // Input Bar
    expect(screen.getByPlaceholderText(/Ask anything/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <BrowserRouter>
        <AiCopilotDrawer isOpen={true} onClose={handleClose} />
      </BrowserRouter>
    );

    const closeBtn = screen.getByLabelText('Close Assistant');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
