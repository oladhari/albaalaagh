import { describe, expect, it } from "vitest";
import { matchesGuestSearch } from "../guest-search";
const guest = { name: "أَنْوَر الغربي", title: "ناشط حقوقي ومستشار في الشؤون الاستراتيجية" };
describe("Arabic guest search", () => {
  it("finds names regardless of vowels, tatweel, alef spelling or word order", () => {
    for (const query of ["انور الغربي", "الغربي أنور", "أنــور", "  أنور   حقوقي  "]) {
      expect(matchesGuestSearch(guest, query)).toBe(true);
    }
  });
  it("searches roles, keeps all results for an empty query and rejects unrelated words", () => {
    expect(matchesGuestSearch(guest, "مستشار")).toBe(true);
    expect(matchesGuestSearch(guest, " ")).toBe(true);
    expect(matchesGuestSearch(guest, "أنور صحفي")).toBe(false);
  });
});
