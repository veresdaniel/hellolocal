import { describe, expect, it } from "vitest";
import { normalizeDomainHost } from "../../apps/api/src/common/domain-host";

describe("normalizeDomainHost (unit)", () => {
  it("strips scheme, port, path, userinfo and trailing dots", () => {
    expect(normalizeDomainHost("  HTTPS://Etyek.HU:443/helyek?q=1  ")).toBe("etyek.hu");
    expect(normalizeDomainHost("//www.pelda.hu.")).toBe("www.pelda.hu");
    expect(normalizeDomainHost("user:pass@etyek.hu")).toBe("etyek.hu");
  });

  it("rejects platform hosts, localhost, IPs and invalid labels", () => {
    expect(normalizeDomainHost("hello-local.io")).toBeNull();
    expect(normalizeDomainHost("localhost")).toBeNull();
    expect(normalizeDomainHost("127.0.0.1")).toBeNull();
    expect(normalizeDomainHost("etyek..hu")).toBeNull();
    expect(normalizeDomainHost(null)).toBeNull();
  });
});
