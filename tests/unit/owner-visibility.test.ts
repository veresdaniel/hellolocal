import { describe, expect, it } from "vitest";
import { isOwnerAccountPubliclyVisible } from "../../apps/api/src/common/owner-visibility";

describe("isOwnerAccountPubliclyVisible", () => {
  it("allows missing owner (staff-created places)", () => {
    expect(isOwnerAccountPubliclyVisible(null)).toBe(true);
    expect(isOwnerAccountPubliclyVisible(undefined)).toBe(true);
  });

  it("allows active owners", () => {
    expect(isOwnerAccountPubliclyVisible({ isActive: true, role: "viewer" })).toBe(true);
  });

  it("hides suspended non-superadmin owners", () => {
    expect(isOwnerAccountPubliclyVisible({ isActive: false, role: "viewer" })).toBe(false);
    expect(isOwnerAccountPubliclyVisible({ isActive: false, role: "admin" })).toBe(false);
  });

  it("keeps superadmin-owned content visible even if inactive", () => {
    expect(isOwnerAccountPubliclyVisible({ isActive: false, role: "superadmin" })).toBe(true);
  });
});
