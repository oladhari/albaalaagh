import sharp from "sharp";
import path from "node:path";

export interface WriterThumbnailPlan { headlineLines: string[]; backgroundPrompt: string }
const FONT = path.join(process.cwd(), "public/fonts/Cairo-Bold.ttf");
const LOGO = path.join(process.cwd(), "public/branding/albaalaagh-gold.png");
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!));

async function label(text: string, maxWidth: number, size: number, color: string) {
  for (let fontSize = size; fontSize >= 24; fontSize -= 2) {
    const rendered = await sharp({ text: { text: `<span foreground="${color}">${escape(text)}</span>`, font: `Cairo Bold ${fontSize}`, fontfile: FONT, rgba: true, dpi: 72 } }).png().toBuffer({ resolveWithObject: true });
    if (rendered.info.width <= maxWidth && rendered.info.height <= 110) return rendered;
  }
  throw new Error("عنوان الصورة طويل؛ استخدم سطورًا أقصر");
}

/** Original portrait/logo pixels are composited locally; only the separate background may be generated. */
export async function composeWriterThumbnail(input: {
  background: Buffer; writerPhoto: Buffer; writerName: string; headlineLines: string[];
}): Promise<Buffer> {
  if (input.headlineLines.length < 1 || input.headlineLines.length > 3) throw new Error("Use 1–3 headline lines");
  const overlays: sharp.OverlayOptions[] = [];
  // Leave enough story visible above the copy; the writer has a separate right-hand frame.
  const scrim = Buffer.from('<svg width="1280" height="720"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#08080d" stop-opacity=".15"/><stop offset="1" stop-color="#08080d" stop-opacity=".97"/></linearGradient></defs><rect width="800" height="720" fill="url(#g)"/><rect x="810" y="40" width="438" height="646" rx="22" fill="#111017" fill-opacity=".82" stroke="#b59746" stroke-width="2"/></svg>');
  overlays.push({ input: scrim, top: 0, left: 0 });
  const portrait = await sharp(input.writerPhoto).autoOrient().resize(410, 618, { fit: "inside" }).png().toBuffer({ resolveWithObject: true });
  overlays.push({ input: portrait.data, left: 1029 - Math.floor(portrait.info.width / 2), top: 363 - Math.floor(portrait.info.height / 2) });
  const logo = await sharp(LOGO).resize({ width: 146 }).png().toBuffer();
  overlays.push({ input: logo, top: 30, left: 34 });
  const identity = await label("قناة", 100, 34, "#ffffff");
  overlays.push({ input: identity.data, top: 70, left: 194 });
  const nameTop = input.headlineLines.length === 3 ? 305 : 405;
  const name = await label(input.writerName, 650, 38, "#ffffff");
  overlays.push({ input: Buffer.from(`<svg width="${name.info.width + 44}" height="64"><rect width="100%" height="100%" rx="8" fill="#78132e" stroke="#b5455c"/></svg>`), top: nameTop, left: 764 - name.info.width - 44 });
  overlays.push({ input: name.data, top: nameTop + Math.floor((64 - name.info.height) / 2), left: 742 - name.info.width });
  for (const [index, line] of input.headlineLines.entries()) {
    const rendered = await label(line, 718, 80, index === 0 ? "#ffffff" : "#ffd146");
    overlays.push({ input: rendered.data, left: 766 - rendered.info.width, top: nameTop + 91 + index * 96 });
  }
  const output = await sharp(input.background).resize(1280, 720, { fit: "cover" }).composite(overlays).flatten({ background: "#111017" }).jpeg({ quality: 92 }).toBuffer();
  if (output.length >= 2_000_000) throw new Error("Thumbnail exceeds 2 MB");
  return output;
}
