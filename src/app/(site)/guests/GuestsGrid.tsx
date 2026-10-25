"use client";

import { useState } from "react";
import { guestCategories as getCategories, filterGuestCategory } from "@/lib/guest-categories";

const CATEGORY_LABELS: Record<string, string> = {
  "رئيس دولة": "رؤساء دول",
  "وزير":      "وزراء",
  "برلماني":   "برلمانيون",
  "قاضٍ":      "قضاة",
  "محامٍ":     "محامون",
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
  tier?: string;
  program_name?: string;
  program_names?: string[];
}

const isArabic = (name: string) => /[؀-ۿ]/.test(name[0] ?? "");

function sortGuests(list: Guest[]): Guest[] {
  return [...list].sort((a, b) => {
    const aAr = isArabic(a.name);
    const bAr = isArabic(b.name);
    if (aAr && !bAr) return -1;
    if (!aAr && bAr) return 1;
    return a.name.localeCompare(b.name, aAr ? "ar" : "en");
  });
}

function GuestCard({ guest }: { guest: Guest }) {
  const cats = getCategories(guest);
  const programNames = guest.program_names?.filter(Boolean) ?? [];


  return (
    <div
      className="group rounded-xl p-4 text-center card-hover"
      style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
    >
      <div className="relative mb-3">
        {guest.image_url ? (
          <img
            src={guest.image_url}
            alt={guest.name}
            className="w-20 h-20 rounded-full object-cover mx-auto transition-transform duration-300 group-hover:scale-105"
            style={{ border: "2px solid var(--color-border)" }}
          />
        ) : (
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mx-auto"
            style={{ background: "rgba(201,168,68,0.15)", color: "var(--color-gold)" }}
          >
            {guest.name[0]}
          </div>
        )}

      </div>
      <p className="text-sm font-bold mt-3 leading-snug" style={{ color: "var(--color-text)" }}>
        {guest.name}
      </p>
      {cats.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1 mt-2" aria-label="تصنيفات الضيف">
          {cats.map((category) => (
            <span key={category} className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: "rgba(201,168,68,0.15)", color: "var(--color-gold)", border: "1px solid var(--color-border)" }}>
              {category}
            </span>
          ))}
        </div>
      )}
      {guest.title && (
        <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--color-text-muted)" }}>
          {guest.title}
        </p>
      )}
      {programNames.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1 mt-2">
          {programNames.map((name) => (
            <span
              key={name}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(201,168,68,0.12)", color: "var(--color-gold)", border: "1px solid rgba(201,168,68,0.3)" }}
            >
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GuestsGrid({ programs, guests }: { programs: Guest[]; guests: Guest[] }) {
  const [active, setActive] = useState<string | null>(null);

  const filtered = sortGuests(
    filterGuestCategory(programs, guests, active)
  );

  return (
    <>
      {(guests.length > 0 || programs.length > 0) && (
        <section>
          {/* Category filter */}
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setActive(null)}
              className="px-4 py-1.5 rounded-full text-sm font-medium border transition-colors"
              style={{
                borderColor: active === null ? "#C9A844" : "var(--color-border)",
                color:       active === null ? "var(--color-gold)" : "var(--color-text-muted)",
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
                  borderColor: active === key ? "#C9A844" : "var(--color-border)",
                  color:       active === key ? "var(--color-gold)" : "var(--color-text-muted)",
                  background:  active === key ? "rgba(201,168,68,0.08)" : "transparent",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>لا يوجد ضيوف في هذا التصنيف</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {filtered.map((guest) => (
                <GuestCard key={guest.id} guest={guest} />
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
