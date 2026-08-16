import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

// Tunisian dialect month names (French-derived), by getMonth() index.
// Most of our readers are in Tunisia and use these day-to-day rather than
// the Mashriqi/MSA names date-fns gives us — shown alongside when they differ.
const TUNISIAN_MONTHS = [
  "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
  "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export function formatArabicDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const day = format(date, "d", { locale: ar });
    const msaMonth = format(date, "MMMM", { locale: ar });
    const year = format(date, "yyyy", { locale: ar });
    const tnMonth = TUNISIAN_MONTHS[date.getMonth()];
    const month = tnMonth === msaMonth ? msaMonth : `${msaMonth} / ${tnMonth}`;
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

export function timeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ar });
  } catch {
    return dateStr;
  }
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
