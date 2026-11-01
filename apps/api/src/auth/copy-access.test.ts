import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canEditCopy, placeCopyChanged } from "./copy-access";

describe("canEditCopy", () => {
  it("rejects a site owner writing platform UI copy", () => {
    assert.equal(canEditCopy({ role: "admin", siteRole: "siteadmin" }, "platform"), false);
    assert.equal(canEditCopy({ role: "editor", siteRole: "siteadmin" }, "platform"), false);
    assert.equal(canEditCopy({ role: "viewer", siteRole: "siteadmin" }, "platform"), false);
  });

  it("lets the site owner write their own place translation", () => {
    assert.equal(canEditCopy({ role: "editor", siteRole: "siteadmin" }, "place"), true);
    assert.equal(canEditCopy({ role: "admin", siteRole: "siteadmin" }, "site"), true);
  });

  it("lets a place owner or manager write their own place translation", () => {
    assert.equal(canEditCopy({ role: "editor", placeRole: "owner" }, "place"), true);
    assert.equal(canEditCopy({ role: "editor", placeRole: "manager" }, "place"), true);
    assert.equal(canEditCopy({ role: "editor", placeRole: "editor" }, "place"), false);
  });

  it("rejects an owner of another site and a non-owner on the same site", () => {
    assert.equal(canEditCopy({ role: "admin", siteRole: null }, "site"), false);
    assert.equal(canEditCopy({ role: "admin", siteRole: null }, "place"), false);
    assert.equal(canEditCopy({ role: "editor", siteRole: "editor" }, "place"), false);
    assert.equal(canEditCopy({ role: "admin", siteRole: "viewer" }, "site"), false);
  });

  it("rejects a place owner writing site or platform copy", () => {
    assert.equal(canEditCopy({ role: "editor", placeRole: "owner" }, "site"), false);
    assert.equal(canEditCopy({ role: "editor", placeRole: "owner" }, "platform"), false);
  });

  it("lets a superadmin edit platform, site, and place copy", () => {
    assert.equal(canEditCopy({ role: "superadmin" }, "platform"), true);
    assert.equal(canEditCopy({ role: "superadmin" }, "site"), true);
    assert.equal(canEditCopy({ role: "superadmin", siteRole: null }, "place"), true);
  });
});

describe("placeCopyChanged", () => {
  it("ignores an unchanged translation and flags a rewritten description", () => {
    const current = [{ lang: "hu", name: "Pince", description: "Régi" }];
    assert.equal(placeCopyChanged(current, [{ lang: "hu", name: "Pince", description: "Régi" }]), false);
    assert.equal(placeCopyChanged(current, [{ lang: "hu", name: "Pince", description: "Új" }]), true);
  });
});
