import { describe, expect, it } from "vitest";
import { renderOverviewDocument } from "../../apps/web/ssr/renderOverview.js";

const SHELL = `<!DOCTYPE html><html><head></head><body><div id="root"></div></body></html>`;

describe("renderOverviewDocument JSON-LD", () => {
  it("escapes < in FAQ copy so script tags cannot break out of JSON-LD", () => {
    const html = renderOverviewDocument(SHELL, {
      lang: "en",
      origin: "https://hello-local.io",
      override: {
        faq: {
          app: {
            q: 'Break</script><script>alert(1)//',
            a: "safe answer",
          },
        },
      },
    });

    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain("\\u003c");
    expect(html).not.toContain("</script><script>alert");
  });
});
