import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './i18n.js'
import { initAppearance, watchSystemTheme } from './utils/appearance.js'

// Before the first paint, so the app never flashes the wrong theme while
// /auth/me is still in flight. Reads localStorage only; the account's copy is
// reconciled later, once the user is known (AuthContext).
initAppearance()
watchSystemTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
