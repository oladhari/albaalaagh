const ALLOWED_MIME = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/avif",
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export function validateImageUpload(file: File): string | null {
  if (!ALLOWED_MIME.has(file.type)) return "نوع الملف غير مسموح به. يُقبل فقط: JPG, PNG, WebP, GIF";
  if (file.size > MAX_BYTES) return "حجم الملف يتجاوز الحد الأقصى (10 ميغابايت)";
  return null;
}

export function safeExt(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const allowed: Record<string, string> = {
    jpg: "jpg", jpeg: "jpg", png: "png", webp: "webp", gif: "gif", avif: "avif",
  };
  return allowed[ext] ?? "jpg";
}
