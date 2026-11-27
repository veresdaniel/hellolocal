import { describe, expect, it } from "vitest";
import { liveDemoMapHref } from "../../apps/web/src/app/liveDemoUrl";

describe("liveDemoMapHref", () => {
  it("appends the map word for the language in the path", () => {
    expect(liveDemoMapHref("https://helloetyek.hu/hu", "hu")).toBe(
      "https://helloetyek.hu/hu/terkep"
    );
    expect(liveDemoMapHref("https://helloetyek.hu/en", "hu")).toBe(
      "https://helloetyek.hu/en/map"
    );
    expect(liveDemoMapHref("/de", "hu")).toBe("/de/karte");
  });

  it("keeps a path that is already the map", () => {
    expect(liveDemoMapHref("https://helloetyek.hu/hu/terkep", "en")).toBe(
      "https://helloetyek.hu/hu/terkep"
    );
  });

  it("does not append a map onto the region list", () => {
    expect(liveDemoMapHref("/hu/regiok", "hu")).toBe("/hu/regiok");
  });

  it("keeps a query string", () => {
    expect(liveDemoMapHref("/hu/etyek-budai?town=etyek", "hu")).toBe(
      "/hu/etyek-budai/terkep?town=etyek"
    );
  });
});
