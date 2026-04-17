"use client";

import Link from "next/link";
import type { ReactElement } from "react";
import { SOCIAL_LINKS } from "@/types";

const SocialIcon = ({ icon, name }: { icon: string; name: string }) => {
  const iconMap: Record<string, ReactElement> = {
    youtube: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.6 5.8a3 3 0 0 0 2.1 2.1C4.5 20.5 12 20.5 12 20.5s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.75 15.5V8.5l6.25 3.5-6.25 3.5z"/>
      </svg>
    ),
    facebook: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    x: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    instagram: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
      </svg>
    ),
    tiktok: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.77 1.52V6.73a4.85 4.85 0 01-1-.04z"/>
      </svg>
    ),
    linkedin: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    twitch: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
      </svg>
    ),
    kick: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M2 2h6v8.5L13.5 2H22l-8 9.5L22 22h-8.5L8 13.5V22H2V2z"/>
      </svg>
    ),
    ummah: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 6a6 6 0 0 1 0 12A6 6 0 0 1 12 6z"/>
      </svg>
    ),
  };

  return iconMap[icon] || <span className="text-xs">{name}</span>;
};

export default function Footer() {
  return (
    <footer
      className="mt-auto pt-12 pb-6"
      style={{ borderTop: "1px solid #2E2A18", background: "#0D0C06" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Top row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">

          {/* Brand */}
          <div>
            <h2
              className="text-3xl font-black mb-3"
              style={{
                background: "linear-gradient(135deg, #E8D5A3, #C9A844, #9A7B28)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              البلاغ
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "#9A9070" }}>
              منبر سياسي تونسي يتخصص في الحوار المعمق مع شخصيات سياسية وفكرية بارزة. نصنع المحتوى الجاد الذي يحترم عقل المتلقي.
            </p>
          </div>

          {/* Nav links */}
          <div>
            <h3 className="text-sm font-bold mb-4" style={{ color: "#C9A844" }}>
              روابط سريعة
            </h3>
            <ul className="space-y-2">
              {[
                ["/interviews",    "المقابلات"],
                ["/news",          "الأخبار"],
                ["/articles",      "المقالات"],
                ["/qadaya-sharia", "قضايا شرعية"],
                ["/guests",        "الضيوف"],
                ["/about",         "من نحن"],
                ["/contact",       "تواصل معنا"],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm transition-colors duration-200"
                    style={{ color: "#9A9070" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#C9A844")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#9A9070")}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-sm font-bold mb-4" style={{ color: "#C9A844" }}>
              تابعنا
            </h3>
            <div className="flex flex-wrap gap-3">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.icon}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.name}
                  className="p-2 rounded-lg transition-all duration-200"
                  style={{ color: "#9A9070", background: "#1A1810" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "#C9A844";
                    (e.currentTarget as HTMLElement).style.background = "rgba(201,168,68,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "#9A9070";
                    (e.currentTarget as HTMLElement).style.background = "#1A1810";
                  }}
                >
                  <SocialIcon icon={s.icon} name={s.name} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div
          className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs"
          style={{ borderTop: "1px solid #2E2A18", color: "#9A9070" }}
        >
          <span>© {new Date().getFullYear()} قناة البلاغ. جميع الحقوق محفوظة.</span>
          <span>
            <a href="https://www.albaalaagh.com" style={{ color: "#C9A844" }}>
              albaalaagh.com
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
