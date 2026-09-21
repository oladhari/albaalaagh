import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

describe("editorial publication invariants", () => {
  it("generation is authenticated and cannot publish or overwrite a stored draft", () => {
    const route = read("src/app/api/admin/news/[id]/generate/route.ts");
    expect(route).toContain("requireAdmin()");
    expect(route).not.toMatch(/\.from\("news"\)\s*\.update/);
    expect(route).not.toContain('status: "approved"');
  });

  it("URL import creates only a pending placeholder after validated generation", () => {
    const route = read("src/app/api/admin/news/from-url/route.ts");
    expect(route).toContain("generated = await generateUrlDraft");
    expect(route).toContain('status:      "pending"');
    expect(route.indexOf("generated = await generateUrlDraft")).toBeLessThan(route.indexOf('.from("news")'));
  });

  it("RSS cron imports pending records and never approved records", () => {
    const route = read("src/app/api/cron/fetch-news/route.ts");
    expect(route).toContain('status: "pending"');
    expect(route).not.toContain('status: "approved"');
  });

  it("publication remains a separate authenticated manual action", () => {
    const route = read("src/app/api/admin/news/[id]/publish/route.ts");
    const ui = read("src/app/admin/news/page.tsx");
    expect(route).toContain("requireAdmin()");
    expect(route).toContain('status:         "approved"');
    expect(ui).toContain("onClick={publish}");
    expect(ui).toContain("يمكنك التعديل قبل النشر");
  });
});
