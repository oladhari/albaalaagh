import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { composeWriterThumbnail } from "../article-thumbnail";
import { generateWriterThumbnailPlan } from "../ai/workflows";
describe("writer thumbnail composition", () => {
  it("preserves the original portrait pixels in a 1280x720 landscape JPEG", async () => {
    const background = await sharp({ create: { width: 1280, height: 720, channels: 3, background: "#222222" } }).png().toBuffer();
    const portrait = await sharp({ create: { width: 410, height: 618, channels: 3, background: { r: 22, g: 155, b: 43 } } }).png().toBuffer();
    const output = await composeWriterThumbnail({ background, writerPhoto: portrait, writerName: "كاتب الاختبار", headlineLines: ["سؤال الاقتصاد", "والإنفاق العام"] });
    const meta = await sharp(output).metadata();
    expect(meta).toMatchObject({ width: 1280, height: 720, format: "jpeg", channels: 3 });
    expect(output.length).toBeLessThan(2_000_000);
    const pixel = await sharp(output).extract({ left: 1000, top: 300, width: 1, height: 1 }).raw().toBuffer();
    expect(Math.abs(pixel[0] - 22)).toBeLessThan(5); expect(Math.abs(pixel[1] - 155)).toBeLessThan(5); expect(Math.abs(pixel[2] - 43)).toBeLessThan(5);
  });
  it("validates concise headline plans without accepting markup", async () => {
    const ai = { structured: vi.fn(async (req: { validate: (v: unknown) => unknown }) => req.validate({ headlineLines: ["<script>"], backgroundPrompt: "A plain editorial background with no faces or words" })) };
    await expect(generateWriterThumbnailPlan({ title: "اقتصاد", excerpt: "", writerName: "كاتب" }, ai as never)).rejects.toThrow("Invalid headline markup");
  });
});
