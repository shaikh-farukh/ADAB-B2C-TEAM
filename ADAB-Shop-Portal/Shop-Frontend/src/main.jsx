import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'leaflet/dist/leaflet.css';
import './index.css'
import App from './App.jsx'

import { SellerProvider } from './context/SellerContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SellerProvider>
      <App />
    </SellerProvider>
  </StrictMode>,
)
