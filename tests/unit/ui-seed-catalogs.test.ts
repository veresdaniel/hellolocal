import { describe, expect, it } from "vitest";
import { SHIPPED_UI_LANGS, shippedUiSeedCatalogs } from "../../apps/api/src/ui-copy/seed-catalogs";

describe("shippedUiSeedCatalogs", () => {
  it("includes hu/en/de with public overview keys and no admin namespace", () => {
    const catalogs = shippedUiSeedCatalogs();
    expect([...SHIPPED_UI_LANGS]).toEqual(["hu", "en", "de"]);
    for (const lang of SHIPPED_UI_LANGS) {
      const messages = catalogs[lang];
      expect(messages).toBeTruthy();
      expect(messages["public.overview.lead"] || messages["public.overview.title"]).toBeTruthy();
      expect(Object.keys(messages).some((key) => key.startsWith("admin."))).toBe(false);
      expect(Object.keys(messages).some((key) => key.startsWith("common."))).toBe(true);
    }
  });
});
