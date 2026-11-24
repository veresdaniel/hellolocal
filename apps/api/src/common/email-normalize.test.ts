import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isDisposableEmail, normalizeEmail } from "./email-normalize";

describe("normalizeEmail", () => {
  it("lowercases and strips plus tags", () => {
    assert.equal(normalizeEmail("Foo.Bar+tag@Example.COM"), "foo.bar@example.com");
  });

  it("strips Gmail dots and plus tags", () => {
    assert.equal(normalizeEmail("a.b.c+promo@gmail.com"), "abc@gmail.com");
    assert.equal(normalizeEmail("a.b.c@googlemail.com"), "abc@gmail.com");
  });

  it("rejects invalid", () => {
    assert.equal(normalizeEmail(""), null);
    assert.equal(normalizeEmail("not-an-email"), null);
  });
});

describe("isDisposableEmail", () => {
  it("blocks curated hosts", () => {
    assert.equal(isDisposableEmail("x@mailinator.com"), true);
    assert.equal(isDisposableEmail("x@gmail.com"), false);
  });

  it("honors extras", () => {
    assert.equal(isDisposableEmail("a@evil.test", ["evil.test"]), true);
  });
});
