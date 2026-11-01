import { describe, expect, it } from "vitest";
import { AdminAppSettingsService } from "../../apps/api/src/admin/admin-app-settings.service";

describe("quote recipient (unit)", () => {
  it("returns the trimmed inbox and does not invent a default", async () => {
    const stored = new AdminAppSettingsService({
      appSetting: {
        findUnique: async () => ({ value: "  offers@example.com  " }),
        create: async () => ({ value: "" }),
      },
    } as never);
    expect(await stored.ensureQuoteRecipient()).toBe("offers@example.com");

    const missing = new AdminAppSettingsService({
      appSetting: {
        findUnique: async () => null,
        create: async () => ({ value: "" }),
      },
    } as never);
    expect(await missing.ensureQuoteRecipient()).toBe("");
  });
});
