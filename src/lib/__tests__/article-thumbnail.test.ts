import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { composeWriterThumbnail, prepareWriterPortrait } from "../article-thumbnail";
import { generateWriterThumbnailPlan } from "../ai/workflows";
describe("writer thumbnail composition", () => {
  it("removes an edge-connected white backdrop while preserving enclosed white facial details", async () => {
    const rgb = Buffer.alloc(80 * 80 * 3, 255);
    for (let y = 20; y < 60; y++) for (let x = 20; x < 60; x++) {
      const i = (y * 80 + x) * 3;
      rgb[i] = 80; rgb[i + 1] = 120; rgb[i + 2] = 160;
    }
    rgb.fill(255, (40 * 80 + 40) * 3, (40 * 80 + 40) * 3 + 3);
    const png = await sharp(rgb, { raw: { width: 80, height: 80, channels: 3 } }).png().toBuffer();
    const result = await sharp(await prepareWriterPortrait(png)).raw().toBuffer();
    expect(result[3]).toBe(0);
    expect([...result.subarray((30 * 80 + 30) * 4, (30 * 80 + 30) * 4 + 4)]).toEqual([80, 120, 160, 255]);
    expect([...result.subarray((40 * 80 + 40) * 4, (40 * 80 + 40) * 4 + 4)]).toEqual([255, 255, 255, 255]);
  });
  it("trusts an existing transparent mask without removing white clothing or altering RGB", async () => {
    const rgba = Buffer.alloc(40 * 40 * 4, 255); rgba[3] = 0;
    const photo = await sharp(rgba, { raw: { width: 40, height: 40, channels: 4 } }).png().toBuffer();
    expect(await sharp(await prepareWriterPortrait(photo)).raw().toBuffer()).toEqual(rgba);
  });
  it("preserves the original portrait pixels in a 1280x720 landscape JPEG", async () => {
    const background = await sharp({ create: { width: 1280, height: 720, channels: 3, background: "#222222" } }).png().toBuffer();
    const portrait = await sharp({ create: { width: 410, height: 618, channels: 3, background: { r: 22, g: 155, b: 43 } } }).png().toBuffer();
    const output = await composeWriterThumbnail({ background, writerPhoto: portrait, writerName: "كاتب الاختبار", headlineLines: ["سؤال الاقتصاد", "والإنفاق العام"] });
    const meta = await sharp(output).metadata();
    expect(meta).toMatchObject({ width: 1280, height: 720, format: "jpeg", channels: 3 });
    expect(output.length).toBeLessThan(2_000_000);
    // The same fixed badge, rather than newly generated branding, appears on the cover.
    const expectedBadge = await sharp("public/branding/article-series.png")
      .extract({ left: 20, top: 10, width: 360, height: 48 }).removeAlpha().raw().toBuffer();
    const actualBadge = await sharp(output)
      .extract({ left: 54, top: 40, width: 360, height: 48 }).raw().toBuffer();
    const rmse = Math.sqrt(actualBadge.reduce((sum, value, i) => sum + (value - expectedBadge[i]) ** 2, 0) / actualBadge.length);
    expect(rmse).toBeLessThan(8);
    const pixel = await sharp(output).extract({ left: 1000, top: 300, width: 1, height: 1 }).raw().toBuffer();
    expect(Math.abs(pixel[0] - 22)).toBeLessThan(5); expect(Math.abs(pixel[1] - 155)).toBeLessThan(5); expect(Math.abs(pixel[2] - 43)).toBeLessThan(5);
  });
  it("validates concise headline plans without accepting markup", async () => {
    const ai = { structured: vi.fn(async (req: { validate: (v: unknown) => unknown }) => req.validate({ headlineLines: ["<script>"], backgroundPrompt: "A plain editorial background with no faces or words" })) };
    await expect(generateWriterThumbnailPlan({ title: "اقتصاد", excerpt: "", writerName: "كاتب" }, ai as never)).rejects.toThrow("Invalid headline markup");
  });
});
