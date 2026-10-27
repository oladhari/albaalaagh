import { describe, expect, it } from "vitest";
import { buildFacebookPrompt, buildNews16_9Prompt } from "@/lib/ai-image";

describe("Facebook image prompt", () => {
  it("scopes flag examples to the story and prohibits invented cartography", () => {
    const iran = buildFacebookPrompt("إيران: استقالة وزير النفط", "قطاع الطاقة الإيراني");
    expect(iran).toContain("Iran: green-white-red");
    expect(iran).not.toContain("Syria:");
    const tunisia = buildFacebookPrompt("تونس: أخبار الاقتصاد", "");
    expect(tunisia).toContain("Tunisia: red field");
    expect(tunisia).not.toContain("Syria:");
    const yemen = buildFacebookPrompt("اليمن: باب المندب وذوباب", "");
    expect(yemen).toContain("Yemen: red-white-black");
    expect(yemen).toContain("Do not generate maps");
  });
  it("uses topic-specific safe imagery instead of an unrelated sensitive-category catalog", () => {
    const prompt = buildFacebookPrompt(
      "تقرير عن ثغرة في أداة ذكاء اصطناعي",
      "دراسة مستقلة حول ضوابط السلامة",
    );

    expect(prompt).toContain("based only on the supplied story");
    expect(prompt).toContain("Do not depict or explain harmful materials");
    expect(prompt).toContain("No authentic person photo is attached");
    expect(prompt).not.toContain("prison bars");
    expect(prompt).not.toContain("confiscated items");
    expect(prompt).not.toContain("accident scene");
  });
});

describe("Square documentary references", () => {
  it("uses the photographed seafood scene despite an ambiguous subject label", () => {
    const prompt = buildFacebookPrompt("ارتفاع أسعار جراد البحر", "سوق السمك في تونس", [
      { name: "جراد البحر", url: "https://example.com/crevettes.jpg" },
    ]);
    expect(prompt).toContain("Image 2: story reference labeled جراد البحر");
    expect(prompt).toContain("the visible photograph determines what to show");
    expect(prompt).toContain("Do not substitute lobster or crayfish for shrimp/prawns");
    expect(prompt).toContain("A documentary market/group photograph is a scene reference");
    expect(prompt).not.toContain("Create one restrained, non-actionable editorial metaphor");
    expect(prompt).not.toContain("NO PEOPLE:");
  });
});

describe("Landscape reference policy", () => {
  it("does not assume a supplied field or logo reference is a person", () => {
    const prompt = buildNews16_9Prompt("القصرين: برمجة 85 ألف هكتار لزراعة الحبوب", "", [{ name: "85 ألف هكتار لزراعة الحبوب", url: "https://example.com/fields.png" }]);
    expect(prompt).toContain("NOT proof that the image depicts a person");
    expect(prompt).toContain("another supplied reference independently qualifies");
    expect(prompt).not.toContain("You MUST include this exact person");
    expect(prompt).not.toContain("diplomatic meetings");
    expect(prompt).toContain("Template people are never authorized person references");
  });
  it("requires a supplied portrait as the main subject even for court news", () => {
    const prompt = buildNews16_9Prompt("المحكمة تنظر في قضية رياض بن فضل", "قضية فساد مالي", [{ name: "رياض بن فضل", url: "https://example.com/portrait.png" }]);
    expect(prompt).toContain("Their inclusion is REQUIRED, not optional");
    expect(prompt).toContain("Image 2: reference labeled رياض بن فضل");
    expect(prompt).toContain("do not need to recognize or independently verify a single-person portrait");
    expect(prompt).not.toContain("NO PERSON REFERENCE ATTACHED");
    expect(prompt).not.toContain("often preferable");
  });
  it("prohibits invented people when no reference was supplied", () => {
    expect(buildNews16_9Prompt("زراعة الحبوب", "")).toContain("NO INVENTED HUMANS");
  });
});
