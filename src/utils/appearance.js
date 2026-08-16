// Theme and language: applied to the document, remembered on the device, and
// mirrored to the user's account.
//
// localStorage stays the source of truth for the *first paint* — it is
// synchronous, so the app never flashes the wrong theme while /auth/me is in
// flight. The server copy is what carries the choice to a new device or a
// reinstall; AuthContext reconciles the two on login (see applyServerPrefs).

import i18n, { DEFAULT_LANG, LANG_KEY } from "../i18n";
import { updateUiPrefs } from "../api/auth";

export const THEME_KEY = "crm_theme";

export const THEMES = ["light", "dark", "system"];
export const LANGUAGES = ["uz", "ru"];

function prefersDark() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

// The stored *choice*, which may be "system" — not the resolved appearance.
export function getStoredTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  return THEMES.includes(stored) ? stored : "system";
}

// What "system" actually resolves to right now.
export function resolveTheme(theme) {
  return theme === "system" ? (prefersDark() ? "dark" : "light") : theme;
}

function paint(theme) {
  document.documentElement.classList.toggle("dark", resolveTheme(theme) === "dark");
}

// Apply + persist locally + push to the account. The network call is
// best-effort: a failed sync must never leave the user staring at a control
// that refused to move, and the next successful save will carry it up anyway.
export function setTheme(theme, { sync = true } = {}) {
  const next = THEMES.includes(theme) ? theme : "system";
  localStorage.setItem(THEME_KEY, next);
  paint(next);
  if (sync) updateUiPrefs({ theme: next }).catch(() => {});
  return next;
}

export function setLanguage(language, { sync = true } = {}) {
  const next = LANGUAGES.includes(language) ? language : DEFAULT_LANG;
  localStorage.setItem(LANG_KEY, next);
  i18n.changeLanguage(next);
  document.documentElement.lang = next;
  if (sync) updateUiPrefs({ language: next }).catch(() => {});
  return next;
}

// Re-paint on OS changes, but only while the choice is "system".
export function watchSystemTheme() {
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  if (!media) return () => {};
  const onChange = () => {
    if (getStoredTheme() === "system") paint("system");
  };
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

// Adopt what the account says, once, at login. Deliberately one-directional
// and non-syncing: this is the server telling the device, so echoing it back
// would be a pointless write. Applied only for keys the server actually has,
// so a fresh account never overrides a choice made on this device before
// logging in.
export function applyServerPrefs(uiPrefs) {
  if (!uiPrefs) return;
  if (uiPrefs.theme) setTheme(uiPrefs.theme, { sync: false });
  if (uiPrefs.language) setLanguage(uiPrefs.language, { sync: false });
}

// Called once at startup, before React renders.
export function initAppearance() {
  paint(getStoredTheme());
  document.documentElement.lang = localStorage.getItem(LANG_KEY) || DEFAULT_LANG;
}
