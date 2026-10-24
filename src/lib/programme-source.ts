export interface ProgrammeSource {
  programme: string;
  participants: string;
  broadcastDate: string;
  videoUrl: string;
}
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
export function programmeSourceHtml(source: ProgrammeSource): string {
  if (!source.programme.trim() || !source.participants.trim()) throw new Error("أدخل اسم البرنامج والمشاركين");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source.broadcastDate) || !Number.isFinite(Date.parse(source.broadcastDate)) || new Date(source.broadcastDate).toISOString().slice(0, 10) !== source.broadcastDate) throw new Error("أدخل تاريخ بث صحيحًا");
  let url: URL;
  try { url = new URL(source.videoUrl); } catch { throw new Error("أدخل رابط YouTube صحيحًا"); }
  const id = url.hostname === "youtu.be" ? url.pathname.slice(1) : ["www.youtube.com", "youtube.com"].includes(url.hostname) && url.pathname === "/watch" ? url.searchParams.get("v") : null;
  if (url.protocol !== "https:" || !id || !/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error("استعمل رابط YouTube من نوع watch أو youtu.be");
  return `<section class="report-note"><h2>عن الحلقة</h2><p><strong>البرنامج:</strong> ${escape(source.programme.trim())}</p><p><strong>المشاركون:</strong> ${escape(source.participants.trim())}</p><p><strong>تاريخ البث الأصلي:</strong> ${source.broadcastDate} — يختلف عن تاريخ نشر هذا المقال.</p><p>إعداد تحريري: قناة البلاغ الرقمية. يعرض المقال أفكار المشاركين مع نسبتها إليهم؛ وما يضاف من سياق تحريري يُبيّن على حدة.</p></section>\n<figure><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="${escape(source.programme.trim())} — الحلقة الكاملة" allowfullscreen></iframe><figcaption>شاهد الحلقة الأصلية: <a href="https://www.youtube.com/watch?v=${id}">${escape(source.programme.trim())}</a></figcaption></figure>`;
}
