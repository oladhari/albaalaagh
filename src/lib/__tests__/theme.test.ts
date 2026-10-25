import { describe, expect, it } from "vitest";
import { runInNewContext } from "node:vm";
import { resolveTheme, themeBootstrap } from "../theme";

describe("reading theme", () => {
  it("honours explicit choices over device preference", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme("invalid", false)).toBe("light");
  });
  it.each([
    ["light", true, false, "light", "light"],
    ["dark", false, false, "dark", "dark"],
    [null, false, false, "light", "system"],
    [null, true, true, "dark", "system"],
  ])("initializes before paint with saved=%s deviceDark=%s deniedStorage=%s", (saved, dark, denied, theme, preference) => {
    const dataset: Record<string, string> = {};
    runInNewContext(themeBootstrap, {
      location: { pathname: "/reports/example" },
      document: { documentElement: { dataset } },
      localStorage: { getItem: () => { if (denied) throw Error("blocked"); return saved; } },
      matchMedia: () => ({ matches: dark }),
    });
    expect(dataset).toEqual({ theme, themePreference: preference });
  });
  it("keeps private admin/writer screens on their established palette", () => {
    for (const pathname of ["/admin", "/writer/articles"]) {
      const dataset = {};
      runInNewContext(themeBootstrap, { location: { pathname }, document: { documentElement: { dataset } } });
      expect(dataset).toEqual({});
    }
  });
});
