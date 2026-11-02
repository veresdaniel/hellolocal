import { describe, expect, it, afterEach } from "vitest";
import {
  hostnameFromUrl,
  isPlatformHostname,
  isProductionSeoEnvironment,
  publicOriginForHost,
  requestHostname,
} from "../../apps/api/src/seo/public-path.util";

describe("production SEO gate", () => {
  const prev = process.env.FRONTEND_URL;

  afterEach(() => {
    if (prev === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = prev;
  });

  it("enables crawl SEO only when FRONTEND_URL is the live platform", () => {
    process.env.FRONTEND_URL = "https://hello-local.io";
    expect(isProductionSeoEnvironment()).toBe(true);

    process.env.FRONTEND_URL = "https://www.hello-local.io";
    expect(isProductionSeoEnvironment()).toBe(true);

    process.env.FRONTEND_URL = "https://beta.hello-local.io";
    expect(isProductionSeoEnvironment()).toBe(false);

    process.env.FRONTEND_URL = "https://devel.hello-local.io";
    expect(isProductionSeoEnvironment()).toBe(false);

    process.env.FRONTEND_URL = "http://localhost:5173";
    expect(isProductionSeoEnvironment()).toBe(false);
  });

  it("treats FRONTEND_URL host as platform for the current deployment", () => {
    process.env.FRONTEND_URL = "https://beta.hello-local.io";
    expect(isPlatformHostname("beta.hello-local.io")).toBe(true);
    expect(isPlatformHostname("etyek.hu")).toBe(false);
  });

  it("builds custom-domain origins from the request host without env per domain", () => {
    process.env.FRONTEND_URL = "https://hello-local.io";
    expect(publicOriginForHost("etyek-example.com")).toBe("https://etyek-example.com");
    expect(publicOriginForHost("hello-local.io")).toBe("https://hello-local.io");
    expect(hostnameFromUrl("https://Etyek.Example.com/path")).toBe("etyek.example.com");
  });

  it("prefers X-Forwarded-Host for DB domain lookup", () => {
    expect(
      requestHostname({
        host: "api.hello-local.io",
        "x-forwarded-host": "etyek-example.com",
      })
    ).toBe("etyek-example.com");
  });
});
