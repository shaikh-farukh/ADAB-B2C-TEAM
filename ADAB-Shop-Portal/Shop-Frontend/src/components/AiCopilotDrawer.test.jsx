import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AiCopilotDrawer, { MarkdownMessage } from './AiCopilotDrawer';

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

  it('renders markdown bold effect and bullets correctly without raw asterisks', () => {
    const sample = `Namaste! 🙏\n\nNo, **Mayank Enterprise** is currently **CLOSED**.\n\n* **Operating Hours:** 8:00 AM – 10:00 PM\n* **Status Code:** \`outside_hours\`\n\n---\n### Summary`;
    const { container } = render(<MarkdownMessage content={sample} isUser={false} />);

    // Bold elements
    const bolds = container.querySelectorAll('strong');
    expect(bolds.length).toBe(4); // "Mayank Enterprise", "CLOSED", "Operating Hours:", "Status Code:"
    expect(bolds[0].textContent).toBe('Mayank Enterprise');
    expect(bolds[1].textContent).toBe('CLOSED');
    expect(bolds[2].textContent).toBe('Operating Hours:');
    expect(bolds[3].textContent).toBe('Status Code:');

    // Code chip
    const code = container.querySelector('code');
    expect(code).not.toBeNull();
    expect(code.textContent).toBe('outside_hours');

    // Divider
    expect(container.querySelector('hr')).not.toBeNull();

    // No raw asterisks rendered around bold text
    expect(container.textContent).not.toContain('**Mayank Enterprise**');
    expect(container.textContent).not.toContain('**CLOSED**');
  });
});
