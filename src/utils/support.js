// Technical-support bot (the same @nyordam bot serves parents, teachers and
// admins; it asks for the role on /start).
export const SUPPORT_URL = "https://t.me/nyordam";

// Inside a Telegram Mini App a plain link would leave the app for the browser;
// openTelegramLink keeps the hop inside Telegram. Everywhere else (browser,
// Capacitor WebView) the anchor's own href/target does the job.
export function openSupport(event) {
  const webApp = window.Telegram?.WebApp;
  if (webApp?.initData && typeof webApp.openTelegramLink === "function") {
    event.preventDefault();
    webApp.openTelegramLink(SUPPORT_URL);
  }
}
