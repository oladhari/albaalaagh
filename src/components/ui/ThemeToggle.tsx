"use client";

import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { resolveTheme, THEME_STORAGE_KEY } from "@/lib/theme";

export default function ThemeToggle() {
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const followSystem = () => {
      if (root.dataset.themePreference === "system") {
        root.dataset.theme = resolveTheme(null, media.matches);
      }
    };
    const sync = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
      const explicit = event.newValue === "light" || event.newValue === "dark";
      root.dataset.themePreference = explicit ? event.newValue! : "system";
      root.dataset.theme = resolveTheme(event.newValue, media.matches);
    };
    media.addEventListener("change", followSystem);
    window.addEventListener("storage", sync);
    return () => {
      media.removeEventListener("change", followSystem);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    root.dataset.themePreference = next;
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* The current page still switches. */ }
  }

  return (
    <button type="button" onClick={toggle}
      className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full border border-border text-text hover:bg-bg-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      aria-label="تبديل المظهر بين الفاتح والداكن" title="تبديل المظهر بين الفاتح والداكن">
      <Sun size={19} className="theme-show-light" aria-hidden="true" />
      <Moon size={19} className="theme-show-dark" aria-hidden="true" />
    </button>
  );
}
