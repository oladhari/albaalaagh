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
            <span className="logo-3d text-2xl font-black tracking-tight">
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

          {/* Support button — desktop */}
          <a
            href="/support"
            className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #C9A844, #9A7B28)",
              color: "#111008",
            }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402C1 3.518 3.318 1 6.25 1c1.862 0 3.505.981 4.75 2.87C12.245 1.981 13.888 1 15.75 1 18.682 1 21 3.518 21 7.191c0 4.105-5.37 8.863-11 14.402z"/>
            </svg>
            ادعم البلاغ
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
            href="/support"
            className="block text-center px-4 py-2 rounded-full text-sm font-bold mt-2"
            style={{
              background: "linear-gradient(135deg, #C9A844, #9A7B28)",
              color: "#111008",
            }}
          >
            ادعم البلاغ
          </a>
        </div>
      )}
    </header>
  );
}
