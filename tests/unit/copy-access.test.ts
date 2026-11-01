import { describe, expect, it } from "vitest";
import { canEditCopy, placeCopyChanged } from "../../apps/api/src/auth/copy-access";

describe("copy access (unit)", () => {
  it("restricts platform UI copy to superadmin", () => {
    expect(canEditCopy({ role: "admin", siteRole: "siteadmin" }, "platform")).toBe(false);
    expect(canEditCopy({ role: "superadmin" }, "platform")).toBe(true);
  });

  it("lets siteadmin and place owner/manager edit place copy", () => {
    expect(canEditCopy({ role: "editor", siteRole: "siteadmin" }, "place")).toBe(true);
    expect(canEditCopy({ role: "editor", placeRole: "owner" }, "place")).toBe(true);
    expect(canEditCopy({ role: "editor", placeRole: "editor" }, "place")).toBe(false);
  });

  it("flags rewritten place description", () => {
    const current = [{ lang: "hu", name: "Pince", description: "Régi" }];
    expect(placeCopyChanged(current, [{ lang: "hu", name: "Pince", description: "Régi" }])).toBe(
      false
    );
    expect(placeCopyChanged(current, [{ lang: "hu", name: "Pince", description: "Új" }])).toBe(true);
  });
});
