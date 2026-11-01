import { describe, expect, it } from "vitest";
import { AdminAppSettingsService } from "../../apps/api/src/admin/admin-app-settings.service";
import { QuoteService } from "../../apps/api/src/quotes/quote.service";

const lead = {
  organization: "Etyek község",
  contactName: "Anna",
  email: "anna@example.com",
  message: "Kérünk ajánlatot a térképre.",
  plan: "municipal",
};

describe("municipal quote recipient", () => {
  it("reads the saved inbox and does not invent one", async () => {
    const writes: unknown[] = [];
    const stored = new AdminAppSettingsService({
      appSetting: {
        findUnique: async () => ({ value: "  offers@example.com  " }),
        create: async (args: unknown) => {
          writes.push(args);
          return { value: "" };
        },
      },
    } as never);
    expect(await stored.ensureQuoteRecipient()).toBe("offers@example.com");

    const missing = new AdminAppSettingsService({
      appSetting: {
        findUnique: async () => null,
        create: async (args: unknown) => {
          writes.push(args);
          return { value: "" };
        },
      },
    } as never);
    expect(await missing.ensureQuoteRecipient()).toBe("");
    expect(writes).toEqual([]);
  });

  it("sends the offer mail to the settings address, not the visitor", async () => {
    const sent: string[] = [];
    const service = new QuoteService(
      {
        quoteRequest: {
          create: async () => ({ id: "lead-1" }),
          update: async () => ({}),
        },
      } as never,
      {
        deliverIfConfigured: async (to: string) => {
          sent.push(to);
          return true;
        },
      } as never,
      { ensureQuoteRecipient: async () => "offers@example.com" } as never
    );

    const result = await service.create(lead);
    expect(sent).toEqual(["offers@example.com"]);
    expect(result).toMatchObject({ id: "lead-1", stored: true, emailed: true, reason: "sent" });
  });

  it("stores the lead and does not send when settings have no inbox", async () => {
    let sent = 0;
    const service = new QuoteService(
      {
        quoteRequest: {
          create: async () => ({ id: "lead-2" }),
          update: async () => ({}),
        },
      } as never,
      {
        deliverIfConfigured: async () => {
          sent += 1;
          return true;
        },
      } as never,
      { ensureQuoteRecipient: async () => "" } as never
    );

    const result = await service.create(lead);
    expect(sent).toBe(0);
    expect(result).toMatchObject({ stored: true, emailed: false, reason: "no_recipient" });
    await expect(service.create({ ...lead, plan: "basic" })).rejects.toThrow(/önkormányzati/);
    await expect(service.create({ ...lead, email: "not-an-email" })).rejects.toThrow(/email/);
  });
});
