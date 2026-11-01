import { describe, expect, it } from "vitest";
import { isSafeHref } from "../../apps/web/src/utils/sanitizeHtml";
import { safeInternalPath } from "../../apps/web/src/utils/safeInternalPath";
import { GA_MEASUREMENT_ID_PATTERN, isValidGaMeasurementIdInput } from "../../apps/web/src/lib/gaMeasurementId";

describe("isSafeHref", () => {
  it("allows http(s), mailto, tel, paths and hashes", () => {
    expect(isSafeHref("https://example.com/a")).toBe(true);
    expect(isSafeHref("/hu/place/x")).toBe(true);
    expect(isSafeHref("#section")).toBe(true);
    expect(isSafeHref("mailto:a@b.c")).toBe(true);
    expect(isSafeHref("tel:+361234")).toBe(true);
  });

  it("rejects javascript/data and protocol-relative URLs", () => {
    expect(isSafeHref("javascript:alert(1)")).toBe(false);
    expect(isSafeHref(" JavaScript:alert(1)")).toBe(false);
    expect(isSafeHref("data:text/html,<script>")).toBe(false);
    expect(isSafeHref("//evil.example/phish")).toBe(false);
    expect(isSafeHref("")).toBe(false);
    expect(isSafeHref(null)).toBe(false);
  });
});

describe("safeInternalPath", () => {
  it("accepts same-app relative paths", () => {
    expect(safeInternalPath("/hu/admin", "/hu")).toBe("/hu/admin");
    expect(safeInternalPath("/hu/place/x?x=1#y", "/hu")).toBe("/hu/place/x?x=1#y");
  });

  it("rejects open redirects", () => {
    expect(safeInternalPath("https://evil.example/", "/hu")).toBe("/hu");
    expect(safeInternalPath("//evil.example/phish", "/hu")).toBe("/hu");
    expect(safeInternalPath("\\\\evil.example", "/hu")).toBe("/hu");
    expect(safeInternalPath("javascript:alert(1)", "/hu")).toBe("/hu");
    expect(safeInternalPath(null, "/hu")).toBe("/hu");
  });
});

describe("GA measurement ID", () => {
  it("only allows G- alphanumeric IDs", () => {
    expect(GA_MEASUREMENT_ID_PATTERN.test("G-ABC123")).toBe(true);
    expect(isValidGaMeasurementIdInput("g-abc123")).toBe(true);
    expect(isValidGaMeasurementIdInput("")).toBe(true);
    expect(isValidGaMeasurementIdInput("UA-123")).toBe(false);
    expect(isValidGaMeasurementIdInput("G-ABC<script>")).toBe(false);
    expect(isValidGaMeasurementIdInput("G-ABC/../x")).toBe(false);
  });
});
