import { describe, expect, it } from "vitest";
import { buildNews16_9Prompt } from "@/lib/ai-image";
import { EDITORIAL_INSTRUCTIONS } from "@/lib/ai/workflows";

describe("news geographic accuracy", () => {
  it("does not inject Syria into Iran or Tunisia stories", () => {
    for (const title of ["إيران: استقالة وزير النفط", "تونس: أخبار الاقتصاد"]) {
      const prompt = buildNews16_9Prompt(title, "");
      expect(prompt).not.toContain("Syria:");
      expect(prompt).toContain("Do not generate maps");
    }
  });
  it("preserves the new Syrian flag for Syria stories", () => {
    expect(buildNews16_9Prompt("سوريا: أخبار اليوم", "")).toContain("three red five-pointed stars");
  });
  it("uses the correct regional designs and Arabic place name", () => {
    expect(buildNews16_9Prompt("إيران", "")).toContain("Iran: green-white-red");
    expect(buildNews16_9Prompt("تونس", "")).toContain("Tunisia: red field");
    expect(buildNews16_9Prompt("اليمن", "")).toContain("Yemen: red-white-black");
    expect(EDITORIAL_INSTRUCTIONS).toContain("is ذوباب, never ذباب or ذياب");
  });
});
