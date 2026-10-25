export const THEME_STORAGE_KEY = "albaalaagh-theme";
export type SiteTheme = "light" | "dark";
export function resolveTheme(saved: string | null, prefersDark: boolean): SiteTheme {
  return saved === "light" || saved === "dark" ? saved : prefersDark ? "dark" : "light";
}

// Runs before paint; the existing CSP nonce authorizes this fixed script.
export const themeBootstrap = `(() => {
  if (/^\\/(admin|writer)(\\/|$)/.test(location.pathname)) return;
  let saved = null;
  try { saved = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}); } catch {}
  const explicit = saved === 'light' || saved === 'dark';
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = explicit ? saved : dark ? 'dark' : 'light';
  document.documentElement.dataset.themePreference = explicit ? saved : 'system';
})();`;
