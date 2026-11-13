import sharp from "sharp";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ edit: vi.fn(), generate: vi.fn(), upload: vi.fn() }));
vi.mock("openai", async (importOriginal) => {
  const original = await importOriginal<typeof import("openai")>();
  return { ...original, default: class { images = { edit: mocks.edit, generate: mocks.generate }; } };
});
vi.mock("@/lib/r2", () => ({ uploadToR2: mocks.upload }));
vi.mock("@/lib/ai/workflows", () => ({
  generateWriterThumbnailPlan: vi.fn(async () => ({
    headlineLines: ["التعليم والمستقبل"], backgroundPrompt: "A quiet school library, no people or text",
  })),
}));

import { generateFacebookImage, generateNewsImage, generateWriterArticleImage } from "@/lib/ai-image";

let png: Buffer;
beforeEach(async () => {
  vi.clearAllMocks();
  png = await sharp({ create: { width: 1280, height: 720, channels: 3, background: "#234567" } }).png().toBuffer();
  mocks.edit.mockResolvedValue({ data: [{ b64_json: png.toString("base64") }] });
  mocks.generate.mockResolvedValue({ data: [{ b64_json: png.toString("base64") }] });
  mocks.upload.mockResolvedValue("https://example.com/test-image");
  vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array(png))));
});
afterEach(() => vi.unstubAllGlobals());

describe("image model migration", () => {
  it("edits the news template and supplied reference with Sunburst at 1280×720", async () => {
    const result = await generateNewsImage("تطوير التعليم", "", [{ name: "مدرسة", url: "https://example.com/reference.png" }]);
    expect(mocks.edit).toHaveBeenCalledWith(expect.objectContaining({
      model: "gpt-image-2.6-sunburst", size: "1280x720", quality: "medium", n: 1,
      image: expect.arrayContaining([expect.objectContaining({ name: "template.png" })]),
    }));
    expect(mocks.edit.mock.calls[0][0].image).toHaveLength(2);
    expect(mocks.upload).toHaveBeenCalledWith(expect.stringMatching(/^ai-images\//), png, "image/png");
    expect(result).toEqual({ url: "https://example.com/test-image", failedPeople: [] });
  });

  it("edits the square template and retains the final Facebook size", async () => {
    await generateFacebookImage("تطوير التعليم", "");
    expect(mocks.edit).toHaveBeenCalledWith(expect.objectContaining({
      model: "gpt-image-2.6-sunburst", size: "1024x1024", quality: "medium", n: 1,
    }));
    expect(await sharp(mocks.upload.mock.calls[0][1]).metadata()).toMatchObject({ width: 1080, height: 1080, format: "png" });
  });

  it("generates only the writer background and composes the original portrait locally", async () => {
    const result = await generateWriterArticleImage("التعليم والمستقبل", "", "كاتب الاختبار", "https://example.com/portrait.png");
    const request = mocks.generate.mock.calls[0][0];
    expect(request).toMatchObject({ model: "gpt-image-2.6-sunburst", size: "1280x720", quality: "medium", n: 1 });
    expect(request).not.toHaveProperty("image");
    expect(request.prompt).toContain("No people, faces, text, logos");
    expect(mocks.edit).not.toHaveBeenCalled();
    expect(await sharp(mocks.upload.mock.calls[0][1]).metadata()).toMatchObject({ width: 1280, height: 720, format: "jpeg" });
    expect(result.headlineLines).toEqual(["التعليم والمستقبل"]);
  });

  it.each(["news", "facebook", "writer"])("does not store an image when %s generation returns no image", async (kind) => {
    mocks.edit.mockResolvedValue({ data: [] }); mocks.generate.mockResolvedValue({ data: [] });
    const request = kind === "news" ? generateNewsImage("التعليم", "")
      : kind === "facebook" ? generateFacebookImage("التعليم", "")
      : generateWriterArticleImage("التعليم", "", "كاتب الاختبار", "https://example.com/portrait.png");
    await expect(request).rejects.toThrow();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
