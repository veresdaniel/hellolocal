import { describe, expect, it } from "vitest";
import {
  FREE_TRIAL_DAYS_DEFAULT,
  freeTrialValidUntil,
  parseFreeTrialDays,
} from "../../apps/api/src/common/free-trial";

describe("parseFreeTrialDays", () => {
  it("defaults when missing or invalid", () => {
    expect(parseFreeTrialDays(undefined)).toBe(FREE_TRIAL_DAYS_DEFAULT);
    expect(parseFreeTrialDays("")).toBe(FREE_TRIAL_DAYS_DEFAULT);
    expect(parseFreeTrialDays(0)).toBe(FREE_TRIAL_DAYS_DEFAULT);
    expect(parseFreeTrialDays(-3)).toBe(FREE_TRIAL_DAYS_DEFAULT);
  });

  it("accepts positive integers and clamps", () => {
    expect(parseFreeTrialDays(14)).toBe(14);
    expect(parseFreeTrialDays("45")).toBe(45);
    expect(parseFreeTrialDays(99999)).toBe(3650);
  });
});

describe("freeTrialValidUntil", () => {
  it("adds days in UTC", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    expect(freeTrialValidUntil(start, 30).toISOString()).toBe("2026-01-31T00:00:00.000Z");
  });
});
