"use client";

import { useEffect, useRef } from "react";

interface NewsTickerProps {
  items: string[];
}

export default function NewsTicker({ items }: NewsTickerProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  if (!items.length) return null;

  const doubled = [...items, ...items]; // seamless loop

  return (
    <div
      className="w-full overflow-hidden flex items-center"
      style={{ background: "#1A1810", borderBottom: "1px solid #2E2A18", height: "40px" }}
    >
      {/* Label */}
      <div
        className="shrink-0 px-4 text-xs font-bold z-10 flex items-center gap-1 h-full"
        style={{
          background: "linear-gradient(135deg, #C9A844, #9A7B28)",
          color: "#111008",
          minWidth: "80px",
        }}
      >
        عاجل
      </div>

      {/* Scrolling track */}
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={trackRef}
          className="flex items-center gap-8 whitespace-nowrap"
          style={{
            animation: "ticker 40s linear infinite",
            willChange: "transform",
          }}
        >
          {doubled.map((item, i) => (
            <span key={i} className="text-sm shrink-0" style={{ color: "#F0EAD6" }}>
              {item}
              <span className="mx-4" style={{ color: "#C9A844" }}>◆</span>
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
