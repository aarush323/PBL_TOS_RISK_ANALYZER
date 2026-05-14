import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'anthropic-fonts'
import './index.css'
import App from './App.jsx'
import AppProviders from '@/app/providers/AppProviders.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
