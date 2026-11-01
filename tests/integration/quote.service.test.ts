import { describe, expect, it } from "vitest";
import { QuoteService } from "../../apps/api/src/quotes/quote.service";

/**
 * QuoteService with mocked Prisma / email / settings — no production DB.
 * Command: pnpm test:integration
 */
describe("QuoteService (integration)", () => {
  const lead = {
    organization: "Etyek község",
    contactName: "Anna",
    email: "anna@example.com",
    message: "Kérünk ajánlatot a térképre.",
    plan: "municipal",
  };

  it("emails the settings inbox, not the visitor", async () => {
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
    expect(result).toMatchObject({ stored: true, emailed: true, reason: "sent" });
  });

  it("stores without sending when no recipient is configured", async () => {
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
  });
});
