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

// Native (Capacitor) only: hand the native launch splash off to the in-app
// splash for a seamless amber→amber start, and paint the status bar to match.
// Accessed via the global Capacitor bridge so the web build needs no plugin
// import (the plugins ship in the APK).
const cap = typeof window !== 'undefined' ? window.Capacitor : undefined
if (cap?.isNativePlatform?.()) {
  const p = cap.Plugins || {}
  requestAnimationFrame(() => {
    p.SplashScreen?.hide?.({ fadeOutDuration: 200 })
    p.StatusBar?.setBackgroundColor?.({ color: '#F5A623' })
    p.StatusBar?.setStyle?.({ style: 'LIGHT' })
  })
}
