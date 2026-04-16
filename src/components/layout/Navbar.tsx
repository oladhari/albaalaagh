"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/",            label: "الرئيسية"  },
  { href: "/interviews",    label: "المقابلات"    },
  { href: "/news",          label: "الأخبار"      },
  { href: "/articles",      label: "المقالات"     },
  { href: "/qadaya-sharia", label: "قضايا شرعية"  },
  { href: "/guests",      label: "الضيوف"   },
  { href: "/about",       label: "من نحن"   },
  { href: "/contact",     label: "تواصل معنا"},
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        background: "rgba(17,16,8,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #2E2A18",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span
              className="text-2xl font-black tracking-tight"
              style={{
                background: "linear-gradient(135deg, #E8D5A3 0%, #C9A844 60%, #9A7B28 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              البلاغ
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 rounded-md text-sm font-medium transition-all duration-200"
                  style={{
                    color:           active ? "#C9A844" : "#9A9070",
                    backgroundColor: active ? "rgba(201,168,68,0.08)" : "transparent",
                    borderBottom:    active ? "1px solid #C9A844" : "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.color = "#E8D5A3";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.color = "#9A9070";
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* YouTube subscribe button — desktop */}
          <a
            href="https://www.youtube.com/@albaalaagh"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #C9A844, #9A7B28)",
              color: "#111008",
            }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.6 5.8a3 3 0 0 0 2.1 2.1C4.5 20.5 12 20.5 12 20.5s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.75 15.5V8.5l6.25 3.5-6.25 3.5z"/>
            </svg>
            اشترك
          </a>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-md"
            style={{ color: "#C9A844" }}
            onClick={() => setOpen(!open)}
            aria-label="القائمة"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="md:hidden px-4 pb-4 space-y-1"
          style={{ borderTop: "1px solid #2E2A18" }}
        >
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-3 rounded-lg text-sm font-medium"
                style={{
                  color:           active ? "#C9A844" : "#9A9070",
                  backgroundColor: active ? "rgba(201,168,68,0.08)" : "transparent",
                }}
              >
                {link.label}
              </Link>
            );
          })}
          <a
            href="https://www.youtube.com/@albaalaagh"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center px-4 py-2 rounded-full text-sm font-bold mt-2"
            style={{
              background: "linear-gradient(135deg, #C9A844, #9A7B28)",
              color: "#111008",
            }}
          >
            اشترك في يوتيوب
          </a>
        </div>
      )}
    </header>
  );
}
