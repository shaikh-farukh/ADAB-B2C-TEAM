import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './app/routes/AppRoutes';
import { NotificationProvider } from './context/NotificationContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import NotificationPopup from './components/common/NotificationPopup';
import AiChatWidget from './components/AiChatWidget';
import ErrorBoundary from './components/common/ErrorBoundary';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

/**
 * Phase 1 Entry Point
 * Responsibility: Initializes routing, global notification provider, real-time socket provider, and mounts the application routes.
 */
const App: React.FC = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'mock-client-id.apps.googleusercontent.com';
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <NotificationProvider>
              <SocketProvider>
                <Toaster position="top-right" />
                <NotificationPopup />
                <ErrorBoundary fallbackMessage="A critical data sync error occurred. We are unable to render the portal correctly at this time.">
                  <AppRoutes />
                </ErrorBoundary>
                <AiChatWidget />
              </SocketProvider>
            </NotificationProvider>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
};

export default App;