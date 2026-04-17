"use client";

import { useState } from "react";

const CATEGORY_LABELS: Record<string, string> = {
  "رئيس دولة": "رؤساء دول",
  "وزير":      "وزراء",
  "برلماني":   "برلمانيون",
  "قاضٍ":      "قضاة",
  "دبلوماسي":  "دبلوماسيون",
  "ناشط":      "ناشطون",
  "مفكر":      "مفكرون",
  "صحفي":      "صحفيون",
  "أكاديمي":   "أكاديميون",
  "رجل دين":   "رجال دين",
  "آخر":       "آخرون",
};

interface Guest {
  id: string;
  name: string;
  title?: string;
  image_url?: string;
  category: string | string[];
}

function getCategories(guest: Guest): string[] {
  if (Array.isArray(guest.category)) return guest.category;
  if (guest.category) return [guest.category];
  return [];
}

const isArabic = (name: string) => /[\u0600-\u06FF]/.test(name[0] ?? "");

function sortGuests(list: Guest[]): Guest[] {
  return [...list].sort((a, b) => {
    const aAr = isArabic(a.name);
    const bAr = isArabic(b.name);
    if (aAr && !bAr) return -1;
    if (!aAr && bAr) return 1;
    return a.name.localeCompare(b.name, aAr ? "ar" : "en");
  });
}

export default function GuestsGrid({ guests }: { guests: Guest[] }) {
  const [active, setActive] = useState<string | null>(null);

  const filtered = sortGuests(
    active ? guests.filter((g) => getCategories(g).includes(active)) : guests
  );

  return (
    <>
      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setActive(null)}
          className="px-4 py-1.5 rounded-full text-sm font-medium border transition-colors"
          style={{
            borderColor: active === null ? "#C9A844" : "#2E2A18",
            color:       active === null ? "#C9A844" : "#9A9070",
            background:  active === null ? "rgba(201,168,68,0.08)" : "transparent",
          }}
        >
          الكل
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActive(active === key ? null : key)}
            className="px-4 py-1.5 rounded-full text-sm font-medium border transition-colors"
            style={{
              borderColor: active === key ? "#C9A844" : "#2E2A18",
              color:       active === key ? "#C9A844" : "#9A9070",
              background:  active === key ? "rgba(201,168,68,0.08)" : "transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm" style={{ color: "#9A9070" }}>لا يوجد ضيوف في هذا التصنيف</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filtered.map((guest) => {
            const cats = getCategories(guest);
            return (
              <div
                key={guest.id}
                className="group rounded-xl p-4 text-center card-hover"
                style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
              >
                <div className="relative mb-3">
                  {guest.image_url ? (
                    <img
                      src={guest.image_url}
                      alt={guest.name}
                      className="w-20 h-20 rounded-full object-cover mx-auto transition-transform duration-300 group-hover:scale-105"
                      style={{ border: "2px solid #2E2A18" }}
                    />
                  ) : (
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mx-auto"
                      style={{ background: "rgba(201,168,68,0.15)", color: "#C9A844" }}
                    >
                      {guest.name[0]}
                    </div>
                  )}
                  {cats[0] && (
                    <span
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium"
                      style={{ background: "rgba(201,168,68,0.9)", color: "#111008" }}
                    >
                      {cats[0]}
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold mt-3 leading-snug" style={{ color: "#F0EAD6" }}>
                  {guest.name}
                </p>
                {guest.title && (
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: "#9A9070" }}>
                    {guest.title}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
