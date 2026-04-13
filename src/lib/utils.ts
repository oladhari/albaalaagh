import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export function formatArabicDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "d MMMM yyyy", { locale: ar });
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
