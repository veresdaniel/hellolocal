import { describe, expect, it, vi } from "vitest";

vi.mock("../../apps/api/src/platform-settings/platform-settings.service", () => ({
  PlatformSettingsService: class {},
}));

vi.mock("../../apps/api/src/seo/public-path.util", () => ({
  isProductionSeoEnvironment: () => true,
}));

import { RobotsService } from "../../apps/api/src/seo/robots.service";

describe("RobotsService social preview allowlist", () => {
  it("allows facebookexternalhit when global crawling is disabled", async () => {
    const platformSettings = {
      getGlobalCrawlability: vi.fn().mockResolvedValue(false),
    };
    const service = new RobotsService(platformSettings as never);
    const txt = await service.buildRobotsTxt({
      kind: "platform",
      origin: "https://hellolocal.hu",
      host: "hellolocal.hu",
    } as never);

    expect(txt).toContain("User-agent: facebookexternalhit");
    expect(txt).toMatch(/User-agent: facebookexternalhit\nAllow: \//);
    expect(txt).toContain("User-agent: *");
    expect(txt).toMatch(/User-agent: \*\nDisallow: \//);
  });
});
