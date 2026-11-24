import { describe, expect, it } from "vitest";
import { preferModernImageUrl } from "../../apps/web/src/seo/cloudinaryImage";

describe("preferModernImageUrl", () => {
  it("replaces picsum placeholders with the marketing fallback", () => {
    expect(
      preferModernImageUrl("https://picsum.photos/seed/etyek-budai-event/1600/900")
    ).toBe("/marketing/map-szeged-720.webp");
  });

  it("leaves same-origin paths unchanged", () => {
    expect(preferModernImageUrl("/marketing/side-street-720.webp")).toBe(
      "/marketing/side-street-720.webp"
    );
  });

  it("injects f_auto,q_auto into Cloudinary upload URLs", () => {
    const out = preferModernImageUrl(
      "https://res.cloudinary.com/demo/image/upload/v1/folder/pic.jpg",
      { width: 800 }
    );
    expect(out).toContain("/upload/w_800,f_auto,q_auto/");
    expect(out).toContain("folder/pic.jpg");
  });
});
