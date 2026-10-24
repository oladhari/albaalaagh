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

const START = "<!--albaalaagh-programme-source:";
const END = "<!--/albaalaagh-programme-source-->";
export const emptyProgrammeSource = (): ProgrammeSource => ({ programme: "", participants: "", broadcastDate: "", videoUrl: "" });
export function readProgrammeSource(content: string): ProgrammeSource | null {
  const start = content.indexOf(START);
  if (start < 0) return null;
  const end = content.indexOf("-->", start);
  if (end < 0 || !content.includes(END, end)) return null;
  try {
    const value = JSON.parse(decodeURIComponent(content.slice(start + START.length, end)));
    return value && ["programme", "participants", "broadcastDate", "videoUrl"].every(key => typeof value[key] === "string")
      ? { programme: value.programme, participants: value.participants, broadcastDate: value.broadcastDate, videoUrl: value.videoUrl } : null;
  } catch { return null; }
}
export function updateProgrammeSource(content: string, source: ProgrammeSource): string {
  const html = programmeSourceHtml(source); // Validate before changing any article markup.
  const previous = readProgrammeSource(content);
  if (previous && JSON.stringify(previous) === JSON.stringify(source)) return content;
  const block = `${START}${encodeURIComponent(JSON.stringify(source))}-->${html}${END}`;
  const start = content.indexOf(START);
  const end = start >= 0 ? content.indexOf(END, start) : -1;
  if (start >= 0 && end >= 0) return content.slice(0, start) + block + content.slice(end + END.length);
  return block + "\n" + content;
}
