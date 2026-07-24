import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { getStoredLang } from './i18n.js'

if (localStorage.getItem('crm_theme') === 'dark') {
  document.documentElement.classList.add('dark')
}

// i18next is initialized inside i18n.js as a side effect of the import above;
// mirror the stored language onto <html lang> the same way the theme class is set.
document.documentElement.lang = getStoredLang()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
