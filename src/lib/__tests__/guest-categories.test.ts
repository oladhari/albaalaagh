import { expect, it } from "vitest";
import { filterGuestCategory, guestCategories } from "../guest-categories";

it("finds presidents even when they are recurring programme guests", () => {
  const president = { name: "منصف المرزوقي", category: ["رئيس دولة"] };
  expect(filterGuestCategory([president], [], "رئيس دولة")).toEqual([president]);
});
it("finds the same guest under each of their professions", () => {
  const guest = { name: "محام وبرلماني", category: ["برلماني", "محامٍ", "ناشط"] };
  for (const category of guest.category) expect(filterGuestCategory([], [guest], category)).toEqual([guest]);
  expect(filterGuestCategory([], [guest], "دبلوماسي")).toEqual([]);
});
it("unifies programme and occasional guests in the unfiltered view and handles legacy categories", () => {
  const programme: { category: string | string[] } = { category: ["وزير"] };
  const guest = { category: "محامٍ" };
  expect(filterGuestCategory([programme], [guest], null)).toEqual([programme, guest]);
  expect(guestCategories(guest)).toEqual(["محامٍ"]);
  expect(guestCategories({ category: null })).toEqual([]);
});
