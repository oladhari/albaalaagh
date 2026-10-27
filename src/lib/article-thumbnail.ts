import sharp from "sharp";
import path from "node:path";

export interface WriterThumbnailPlan { headlineLines: string[]; backgroundPrompt: string }
const FONT = path.join(process.cwd(), "public/fonts/Cairo-Bold.ttf");
const SERIES_BADGE = path.join(process.cwd(), "public/branding/article-series.png");
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!));

async function label(text: string, maxWidth: number, size: number, color: string) {
  for (let fontSize = size; fontSize >= 24; fontSize -= 2) {
    const rendered = await sharp({ text: { text: `<span foreground="${color}">${escape(text)}</span>`, font: `Cairo Bold ${fontSize}`, fontfile: FONT, rgba: true, dpi: 72 } }).png().toBuffer({ resolveWithObject: true });
    if (rendered.info.width <= maxWidth && rendered.info.height <= 110) return rendered;
  }
  throw new Error("عنوان الصورة طويل؛ استخدم سطورًا أقصر");
}

/** Remove only edge-connected near-white backdrop pixels; never synthesize a face.
 * Transparent cutouts from a checked non-generative mask are preferred. */
export async function prepareWriterPortrait(photo: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(photo).autoOrient()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  for (let offset = 3; offset < data.length; offset += 4) {
    if (data[offset] < 255) {
      return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
    }
  }
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let start = 0, end = 0;
  const visit = (x: number, y: number) => {
    const index = y * width + x, offset = index * 4;
    if (visited[index]) return;
    visited[index] = 1;
    const values = [data[offset], data[offset + 1], data[offset + 2]];
    if (data[offset + 3] === 0 || (Math.min(...values) >= 220 && Math.max(...values) - Math.min(...values) <= 25)) {
      data[offset + 3] = 0;
      queue[end++] = index;
    }
  };
  for (let x = 0; x < width; x++) { visit(x, 0); visit(x, height - 1); }
  for (let y = 0; y < height; y++) { visit(0, y); visit(width - 1, y); }
  while (start < end) {
    const index = queue[start++], x = index % width, y = Math.floor(index / width);
    if (x) visit(x - 1, y);
    if (x + 1 < width) visit(x + 1, y);
    if (y) visit(x, y - 1);
    if (y + 1 < height) visit(x, y + 1);
  }
  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

/** Original portrait pixels and the fixed series badge are composed locally. */
export async function composeWriterThumbnail(input: {
  background: Buffer; writerPhoto: Buffer; writerName: string; headlineLines: string[];
}): Promise<Buffer> {
  if (input.headlineLines.length < 1 || input.headlineLines.length > 3) throw new Error("Use 1–3 headline lines");
  const overlays: sharp.OverlayOptions[] = [];
  const scrim = Buffer.from('<svg width="1280" height="720"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#08080d" stop-opacity=".15"/><stop offset="1" stop-color="#08080d" stop-opacity=".97"/></linearGradient></defs><rect width="800" height="720" fill="url(#g)"/></svg>');
  overlays.push({ input: scrim, top: 0, left: 0 });
  const cutout = await prepareWriterPortrait(input.writerPhoto);
  const portrait = await sharp(cutout).resize(580, 665, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Fade the source crop boundaries into the scene without touching opaque face RGB.
  for (let y = 0; y < portrait.info.height; y++) {
    for (let x = 0; x < portrait.info.width; x++) {
      const edge = Math.min(1, x / 10, (portrait.info.width - 1 - x) / 10,
        (portrait.info.height - 1 - y) / 30);
      const offset = (y * portrait.info.width + x) * 4 + 3;
      portrait.data[offset] = Math.round(portrait.data[offset] * Math.max(0, edge));
    }
  }
  const portraitImage = await sharp(portrait.data, { raw: { width: portrait.info.width,
    height: portrait.info.height, channels: 4 } }).png().toBuffer();
  overlays.push({ input: portraitImage, left: 1280 - portrait.info.width,
    top: 720 - portrait.info.height });
  overlays.push({ input: await sharp(SERIES_BADGE).png().toBuffer(), top: 30, left: 34 });
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
