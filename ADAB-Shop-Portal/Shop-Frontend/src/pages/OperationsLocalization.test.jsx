/**
 * @vitest-environment jsdom
 */
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider, useTranslation } from '../context/LanguageContext';
import FreightPage from './FreightPage';
import PointsPage from './PointsPage';
import PartnerPage from './PartnerPage';
import ReportsPage from './ReportsPage';
import MessagesPage from './MessagesPage';

vi.mock('../api/sellerApi', () => ({
  sellerApi: {
    getB2BOrders: vi.fn().mockResolvedValue({ data: [] }),
    getPoints: vi.fn().mockResolvedValue({ data: { balance: 250, total_earned: 500, total_redeemed: 250 } }),
    getAnalytics: vi.fn().mockResolvedValue({ data: { total_orders: 15, total_revenue: 45000, avg_order_value: 3000 } }),
    getThreads: vi.fn().mockResolvedValue({ data: [] }),
    getThreadMessages: vi.fn().mockResolvedValue({ data: [] })
  }
}));

vi.mock('../hooks/useB2B', () => ({
  useB2B: () => ({
    orders: [],
    loading: false,
    error: null
  })
}));

vi.mock('../context/SellerContext', () => ({
  useSeller: () => ({
    profile: { id: 1, full_name: 'Mayank Merchant', legal_name: 'Mayank Store' },
    store: { id: 1, store_name: 'Mayank Kirana' }
  })
}));

vi.mock('../context/SocketProvider', () => ({
  useSocket: () => ({
    socket: null,
    isConnected: true,
    subscribe: vi.fn(() => vi.fn())
  })
}));

const LanguageSwitcher = ({ targetLang }) => {
  const { setLanguage } = useTranslation();
  React.useEffect(() => {
    setLanguage(targetLang);
  }, [targetLang, setLanguage]);
  return null;
};

const renderWithLanguage = (ui, lang = 'en') => {
  return render(
    <LanguageProvider>
      <LanguageSwitcher targetLang={lang} />
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </LanguageProvider>
  );
};

describe('Operations Pages Localization (Freight, Points, Partner, Reports, Messages)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('FreightPage Localization', () => {
    it('renders in English', async () => {
      renderWithLanguage(<FreightPage />, 'en');
      await waitFor(() => {
        expect(screen.getByText('Freight & Logistics Tracking')).toBeInTheDocument();
        expect(screen.getByText('View All Store Orders')).toBeInTheDocument();
      });
    });

    it('renders in Hindi', async () => {
      renderWithLanguage(<FreightPage />, 'hi');
      await waitFor(() => {
        expect(screen.getByText('माल ढुलाई और रसद ट्रैकिंग')).toBeInTheDocument();
        expect(screen.getByText('सभी स्टोर ऑर्डर देखें')).toBeInTheDocument();
      });
    });

    it('renders in Gujarati', async () => {
      renderWithLanguage(<FreightPage />, 'gu');
      await waitFor(() => {
        expect(screen.getByText('માલવાહક અને લોજિસ્ટિક્સ ટ્રેકિંગ')).toBeInTheDocument();
        expect(screen.getByText('બધા સ્ટોર ઓર્ડર જુઓ')).toBeInTheDocument();
      });
    });
  });

  describe('PointsPage Localization', () => {
    it('renders in English', async () => {
      renderWithLanguage(<PointsPage />, 'en');
      await waitFor(() => {
        expect(screen.getByText('Reward Points')).toBeInTheDocument();
        expect(screen.getByText('Your balance')).toBeInTheDocument();
        expect(screen.getByText('Total Earned')).toBeInTheDocument();
        expect(screen.getByText('How you use points')).toBeInTheDocument();
      });
    });

    it('renders in Hindi', async () => {
      renderWithLanguage(<PointsPage />, 'hi');
      await waitFor(() => {
        expect(screen.getByText('रिवॉर्ड पॉइंट्स')).toBeInTheDocument();
        expect(screen.getByText('आपका बैलेंस')).toBeInTheDocument();
        expect(screen.getByText('कुल अर्जित')).toBeInTheDocument();
        expect(screen.getByText('आप पॉइंट्स का उपयोग कैसे करते हैं')).toBeInTheDocument();
      });
    });

    it('renders in Gujarati', async () => {
      renderWithLanguage(<PointsPage />, 'gu');
      await waitFor(() => {
        expect(screen.getByText('રિવોર્ડ પોઇન્ટ્સ')).toBeInTheDocument();
        expect(screen.getByText('તમારું બેલેન્સ')).toBeInTheDocument();
        expect(screen.getByText('કુલ કમાયેલ')).toBeInTheDocument();
        expect(screen.getByText('તમે પોઇન્ટ્સનો ઉપયોગ કેવી રીતે કરો છો')).toBeInTheDocument();
      });
    });
  });

  describe('PartnerPage Localization', () => {
    it('renders in English', async () => {
      renderWithLanguage(<PartnerPage />, 'en');
      await waitFor(() => {
        expect(screen.getByText('Store-to-Store Orders')).toBeInTheDocument();
        expect(screen.getByText('Track Shipments')).toBeInTheDocument();
      });
    });

    it('renders in Hindi', async () => {
      renderWithLanguage(<PartnerPage />, 'hi');
      await waitFor(() => {
        expect(screen.getByText('स्टोर-टू-स्टोर ऑर्डर')).toBeInTheDocument();
        expect(screen.getByText('शिपमेंट ट्रैक करें')).toBeInTheDocument();
      });
    });

    it('renders in Gujarati', async () => {
      renderWithLanguage(<PartnerPage />, 'gu');
      await waitFor(() => {
        expect(screen.getByText('સ્ટોર-ટુ-સ્ટોર ઓર્ડર્સ')).toBeInTheDocument();
        expect(screen.getByText('શિપમેન્ટ ટ્રેક કરો')).toBeInTheDocument();
      });
    });
  });

  describe('ReportsPage Localization', () => {
    it('renders in English', async () => {
      renderWithLanguage(<ReportsPage />, 'en');
      await waitFor(() => {
        expect(screen.getByText('Reports & Analytics')).toBeInTheDocument();
        expect(screen.getByText('Total Revenue')).toBeInTheDocument();
        expect(screen.getByText('Total Orders')).toBeInTheDocument();
        expect(screen.getByText('Avg Order Value')).toBeInTheDocument();
        expect(screen.getByText('Platform Health')).toBeInTheDocument();
      });
    });

    it('renders in Hindi', async () => {
      renderWithLanguage(<ReportsPage />, 'hi');
      await waitFor(() => {
        expect(screen.getByText('रिपोर्ट और विश्लेषण')).toBeInTheDocument();
        expect(screen.getByText('कुल आय')).toBeInTheDocument();
        expect(screen.getByText('कुल ऑर्डर')).toBeInTheDocument();
        expect(screen.getByText('औसत ऑर्डर मूल्य')).toBeInTheDocument();
        expect(screen.getByText('प्लेटफॉर्म स्वास्थ्य')).toBeInTheDocument();
      });
    });

    it('renders in Gujarati', async () => {
      renderWithLanguage(<ReportsPage />, 'gu');
      await waitFor(() => {
        expect(screen.getByText('અહેવાલો અને એનાલિટિક્સ')).toBeInTheDocument();
        expect(screen.getByText('કુલ આવક')).toBeInTheDocument();
        expect(screen.getByText('કુલ ઓર્ડર્સ')).toBeInTheDocument();
        expect(screen.getByText('સરેરાશ ઓર્ડર મૂલ્ય')).toBeInTheDocument();
        expect(screen.getByText('પ્લેટફોર્મ સ્વાસ્થ્ય')).toBeInTheDocument();
      });
    });
  });

  describe('MessagesPage Localization', () => {
    it('renders in English', async () => {
      renderWithLanguage(<MessagesPage />, 'en');
      await waitFor(() => {
        expect(screen.getByText('Store Messages')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Search conversations...')).toBeInTheDocument();
        expect(screen.getByText('No conversations yet.')).toBeInTheDocument();
      });
    });

    it('renders in Hindi', async () => {
      renderWithLanguage(<MessagesPage />, 'hi');
      await waitFor(() => {
        expect(screen.getByText('स्टोर संदेश')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('बातचीत खोजें...')).toBeInTheDocument();
        expect(screen.getByText('अभी कोई बातचीत नहीं है।')).toBeInTheDocument();
      });
    });

    it('renders in Gujarati', async () => {
      renderWithLanguage(<MessagesPage />, 'gu');
      await waitFor(() => {
        expect(screen.getByText('સ્ટોર સંદેશાઓ')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('વાતચીત શોધો...')).toBeInTheDocument();
        expect(screen.getByText('હજુ કોઈ વાતચીત નથી.')).toBeInTheDocument();
      });
    });
  });
});
