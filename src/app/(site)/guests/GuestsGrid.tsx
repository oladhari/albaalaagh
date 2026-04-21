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
  tier?: string;
  program_name?: string;
  program_names?: string[];
}

function getCategories(guest: Guest): string[] {
  if (Array.isArray(guest.category)) return guest.category;
  if (guest.category) return [guest.category];
  return [];
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

function GuestCard({ guest, isProgram }: { guest: Guest; isProgram?: boolean }) {
  const cats = getCategories(guest);
  const programNames = guest.program_names?.filter(Boolean) ?? [];
  const badge = isProgram ? (programNames[0] ?? guest.program_name) : cats[0];

  return (
    <div
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
        {badge && (
          <span
            title={badge}
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs px-2 py-0.5 rounded-full font-medium overflow-hidden"
            style={{
              background: "rgba(201,168,68,0.9)",
              color: "#111008",
              maxWidth: "calc(100% - 8px)",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              display: "block",
              transform: "translateX(-50%)",
            }}
          >
            {badge}
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
      {/* Show additional program names if more than one */}
      {isProgram && programNames.length > 1 && (
        <div className="flex flex-wrap justify-center gap-1 mt-2">
          {programNames.slice(1).map((name) => (
            <span
              key={name}
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(201,168,68,0.12)", color: "#C9A844" }}
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
    active ? guests.filter((g) => getCategories(g).includes(active)) : guests
  );

  return (
    <>
      {/* ── برامج دورية ── */}
      {programs.length > 0 && (
        <section className="mb-14">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-lg font-black" style={{ color: "#C9A844" }}>برامج دورية</h2>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, #2E2A18)" }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {sortGuests(programs).map((guest) => (
              <GuestCard key={guest.id} guest={guest} isProgram />
            ))}
          </div>
        </section>
      )}

      {/* ── ضيوف الحلقات ── */}
      {guests.length > 0 && (
        <section>
          {programs.length > 0 && (
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-lg font-black" style={{ color: "#C9A844" }}>ضيوف الحلقات</h2>
              <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, #2E2A18)" }} />
            </div>
          )}

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
