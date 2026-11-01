import { describe, expect, it } from "vitest";
import {
  DEFAULT_VISITOR_LADDER,
  HOLD_WINDOW_MS,
  decideVisitorLadder,
  parseVisitorLadder,
  summarizeMeter,
  type LadderSiteState,
  type VisitorLadderConfig,
} from "../../apps/api/src/visitor-ladder/visitor-ladder";

const now = new Date("2026-06-15T12:00:00.000Z");

function state(partial: Partial<LadderSiteState> = {}): LadderSiteState {
  return {
    manualOverride: false,
    ladderStep: 0,
    ladderSuspended: false,
    belowFloorSince: null,
    plan: "FREE",
    lastNotifiedStep: null,
    ladderEvaluatedAt: null,
    ...partial,
  };
}

describe("visitor ladder (unit)", () => {
  it("blocks suspend when manual override is on", () => {
    const config: VisitorLadderConfig = {
      ...DEFAULT_VISITOR_LADDER,
      steps: [
        DEFAULT_VISITOR_LADDER.steps[0],
        DEFAULT_VISITOR_LADDER.steps[1],
        { action: "suspend", plan: "BUSINESS" },
      ],
    };
    const decision = decideVisitorLadder({
      state: state({ manualOverride: true, plan: "FREE" }),
      meter: config.stepThreeFrom + 500,
      config,
      now,
    });
    expect(decision.skipped).toBe("manual-override");
    expect(decision.ladderSuspended).toBe(false);
    expect(decision.planChanged).toBe(false);
  });

  it("holds a step for one quiet day, then downgrades after the hold window", () => {
    const config = DEFAULT_VISITOR_LADDER;
    const days = Array.from({ length: 30 }, (_, index) => ({
      uniqueVisitors: index === 29 ? 0 : 200,
      pageViews: 10,
    }));
    const meter = summarizeMeter(days);
    expect(meter.source).toBe("uniqueVisitors");

    const oneDayUnder = decideVisitorLadder({
      state: state({
        ladderStep: 1,
        plan: "FREE",
        belowFloorSince: new Date("2026-06-14T12:00:00.000Z"),
      }),
      meter: config.stepTwoFrom - 1,
      config,
      now,
    });
    expect(oneDayUnder.ladderStep).toBe(1);
    expect(oneDayUnder.planChanged).toBe(false);

    const held = new Date(now.getTime() - HOLD_WINDOW_MS);
    const decision = decideVisitorLadder({
      state: state({
        ladderStep: 2,
        plan: "FREE",
        belowFloorSince: held,
      }),
      meter: config.stepTwoFrom - 1,
      config,
      now,
    });
    expect(decision.ladderStep).toBe(1);
    expect(decision.notify).toBe(true);
  });

  it("rejects thresholds that are not X < Y < Z", () => {
    const steps = DEFAULT_VISITOR_LADDER.steps;
    expect(() =>
      parseVisitorLadder({ freeUntil: 10, stepTwoFrom: 10, stepThreeFrom: 20, steps })
    ).toThrow(/X < Y < Z/);
  });
});
