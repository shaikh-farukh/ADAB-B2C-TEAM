import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
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
