// ── Editorial profile of البلاغ ─────────────────────────────────────────────
// Derived from analysis of 130+ Facebook posts from both pages.
// These are the names and topics Oussama covers with urgency.

// Tunisian opposition / persecuted figures — highest signal
const PRIORITY_NAMES = [
  "مخلوف", "سيف الدين",
  "الخياري", "راشد الخياري",
  "بن خالد", "هشام بن خالد",
  "المرايحي", "لطفي المرايحي",
  "الدهماني", "سنية الدهماني",
  "بن مبارك", "جوهر بن مبارك",
  "الدايمي", "عماد الدايمي",
  "غنوشي", "راشد الغنوشي",
  "المقريء", "مقريء", "مجري",
  "البريكي", "عبيد البريكي",
  "ائتلاف الكرامة",
  "الحزقي",
  "بن عزوز", "طارق بن عزوز",
];

// Arrest/sentence/court keywords — urgent regardless of who
const URGENT_KEYWORDS = [
  "بالسجن",
  "إيداع السجن",
  "القبض عليه",
  "اعتقال",
  "توقيف",
  "الفصل 86",
  "حكم ابتدائي",
  "حكم بالإدانة",
  "محكمة الاستئناف",
  "الدائرة الجناحية",
  "الدائرة الجنائية",
];

// Political/legal keywords — high priority
const HIGH_KEYWORDS = [
  "محكمة",
  "قضاء",
  "مداهمة",
  "حبس",
  "سجن",
  "إضراب عن الطعام",
  "نقل إلى سجن",
  "تمديد الاحتجاز",
  "الاعتقال السياسي",
];

// Recurring themes البلاغ covers — medium priority
const MEDIUM_KEYWORDS = [
  "إيران",
  "الاختراق الشيعي",
  "حزب الله",
  "فلسطين",
  "غزة",
  "قيس سعيد",
  "الحرية والكرامة",
  "البرلمان التونسي",
  "المعارضة التونسية",
];

/**
 * Score a news item 0–10 based on البلاغ editorial profile.
 * 8–10 = breaking/urgent (⭐⭐)
 * 5–7  = high priority (⭐)
 * 0–4  = normal
 */
export function scoreNewsPriority(title: string, excerpt: string): number {
  const text = (title + " " + excerpt).toLowerCase();

  let score = 0;

  // Name match = +5 (these are the people البلاغ specifically follows)
  if (PRIORITY_NAMES.some((name) => text.includes(name.toLowerCase()))) {
    score += 5;
  }

  // Urgent legal/arrest keywords = +4
  if (URGENT_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()))) {
    score += 4;
  // High keywords = +2 (if no urgent keyword already)
  } else if (HIGH_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()))) {
    score += 2;
  }

  // Medium theme keywords = +1
  if (MEDIUM_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()))) {
    score += 1;
  }

  return Math.min(score, 10);
}
