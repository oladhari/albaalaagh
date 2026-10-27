import sharp from "sharp";
import path from "node:path";

export const EDITORIAL_SERIES_TEXT = "سلسلة مقالات البلاغ";

/** One fixed, locally typeset identity for articles, religious articles and reports. */
export async function createEditorialSeriesBadge(): Promise<Buffer> {
  const text = await sharp({ text: {
    text: `<span foreground="#fff4df">${EDITORIAL_SERIES_TEXT}</span>`,
    font: "Cairo Bold 32", fontfile: path.join(process.cwd(), "public/fonts/Cairo-Bold.ttf"),
    rgba: true, dpi: 72,
  } }).resize({ width: 350, height: 44, fit: "inside", withoutEnlargement: true })
    .png().toBuffer({ resolveWithObject: true });
  const plate = Buffer.from('<svg width="400" height="68"><rect x="1" y="1" width="398" height="66" rx="10" fill="#64152b" stroke="#b99553" stroke-width="2"/><rect x="11" y="17" width="4" height="34" rx="2" fill="#e0bd72"/></svg>');
  return sharp(plate).composite([{ input: text.data,
    left: 25 + Math.floor((350 - text.info.width) / 2),
    top: Math.floor((68 - text.info.height) / 2),
  }]).png().toBuffer();
}
