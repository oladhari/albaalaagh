/** Opt-in paid integration check. Outputs stay local; R2 and content publishing are disabled. */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import path from "node:path";
import sharp from "sharp";

const enabled = process.env.RUN_OPENAI_IMAGE_SMOKE === "1";
const output = process.env.IMAGE_SMOKE_OUTPUT_DIR;
const measurements: { workflow: string; elapsedMs: number; bytes: number }[] = [];
const usage: unknown[] = [];

vi.mock("@/lib/r2", () => ({
  uploadToR2: async (key: string, body: Buffer) => {
    if (!enabled || !output) throw new Error("Explicit live-image smoke configuration required");
    const name = key.includes("/fb-") ? "facebook.png" : key.includes("/writer-") ? "writer.jpg" : "news.png";
    await writeFile(path.join(output, name), body);
    return `local-smoke:${name}`;
  },
}));

import { generateFacebookImage, generateNewsImage, generateWriterArticleImage } from "@/lib/ai-image";

describe.skipIf(!enabled)("live image migration (paid, local outputs only)", () => {
  beforeAll(async () => {
    if (!output || !process.env.IMAGE_SMOKE_PORTRAIT) throw new Error("Set output directory and original portrait path");
    const config = parseEnv(await readFile(process.env.IMAGE_SMOKE_ENV_FILE || ".env.local", "utf8"));
    if (!config.OPENAI_API_KEY) throw new Error("Project OpenAI key is not configured");
    for (const key of ["OPENAI_API_KEY", "OPENAI_TEXT_MODEL", "OPENAI_FAST_MODEL", "AI_PROVIDER"]) {
      if (config[key]) vi.stubEnv(key, config[key]);
    }
    await mkdir(output, { recursive: true });
    const portrait = await readFile(process.env.IMAGE_SMOKE_PORTRAIT);
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url === "https://image-smoke.invalid/portrait.png") {
        return new Response(new Uint8Array(portrait), { headers: { "Content-Type": "image/png" } });
      }
      const response = await originalFetch(input, init);
      if (url.startsWith("https://api.openai.com/v1/images/") && response.ok) {
        const data = await response.clone().json();
        usage.push({ endpoint: new URL(url).pathname, usage: data.usage, size: data.size, quality: data.quality });
      }
      return response;
    });
  });

  afterAll(async () => {
    if (output) await writeFile(path.join(output, "measurements.json"), JSON.stringify({ measurements, usage }, null, 2));
    vi.unstubAllGlobals(); vi.unstubAllEnvs();
  });

  const title = "التعليم في تونس";
  const excerpt = "تصميم اختباري غير مخصص للنشر حول دور القراءة في التعليم.";
  const photo = "https://image-smoke.invalid/portrait.png";
  const reference = [{ name: "سمير الجملي", url: photo }];
  for (const workflow of ["news", "facebook", "writer"] as const) {
    it(`${workflow} accepts the production request shape and returns the expected image`, async () => {
      const started = Date.now();
      const result = workflow === "news" ? await generateNewsImage(title, excerpt, reference)
        : workflow === "facebook" ? await generateFacebookImage(title, excerpt, reference)
        : await generateWriterArticleImage(title, excerpt, "سمير الجملي", photo);
      const file = path.join(output!, result.url.replace("local-smoke:", ""));
      const body = await readFile(file);
      expect(await sharp(body).metadata()).toMatchObject(workflow === "facebook"
        ? { width: 1080, height: 1080, format: "png" }
        : { width: 1280, height: 720, format: workflow === "writer" ? "jpeg" : "png" });
      const metric = { workflow, elapsedMs: Date.now() - started, bytes: body.length };
      measurements.push(metric); console.log(metric);
    }, 180_000);
  }
});
