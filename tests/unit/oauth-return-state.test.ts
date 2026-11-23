import { describe, expect, it } from "vitest";
import {
  decodeOAuthReturnState,
  encodeOAuthReturnState,
  oauthLoginPath,
} from "../../apps/api/src/auth/oauth-return.util";

describe("oauth return state", () => {
  it("round-trips origin, lang, and mode", () => {
    const encoded = encodeOAuthReturnState({
      origin: "https://helloetyek.hu",
      lang: "hu",
      mode: "admin",
    });
    expect(decodeOAuthReturnState(encoded)).toEqual({
      origin: "https://helloetyek.hu",
      lang: "hu",
      mode: "admin",
    });
  });

  it("builds admin vs visitor login paths", () => {
    expect(oauthLoginPath("hu", "admin")).toBe("/hu/admin/login");
    expect(oauthLoginPath("en", "visitor")).toBe("/en/login");
  });

  it("rejects malformed state", () => {
    expect(decodeOAuthReturnState("")).toBeNull();
    expect(decodeOAuthReturnState("%%%")).toBeNull();
  });
});
