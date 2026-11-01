import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_VISITOR_LADDER,
  HOLD_WINDOW_MS,
  decideVisitorLadder,
  parseVisitorLadder,
  summarizeMeter,
  type LadderSiteState,
  type VisitorLadderConfig,
} from "./visitor-ladder";

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

test("manual override blocks a suspend", () => {
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
  assert.equal(decision.skipped, "manual-override");
  assert.equal(decision.ladderSuspended, false);
  assert.equal(decision.plan, "FREE");
  assert.equal(decision.planChanged, false);
  assert.equal(decision.suspendChanged, false);
  assert.equal(decision.notify, false);
});

test("Y does not downgrade on one quiet day", () => {
  const config = DEFAULT_VISITOR_LADDER;
  const days = Array.from({ length: 30 }, (_, index) => ({
    uniqueVisitors: index === 29 ? 0 : 200,
    pageViews: 10,
  }));
  const meter = summarizeMeter(days);
  assert.equal(meter.source, "uniqueVisitors");
  assert.ok(meter.value >= config.stepTwoFrom);

  const stillAbove = decideVisitorLadder({
    state: state({ ladderStep: 1, plan: "FREE", lastNotifiedStep: 1 }),
    meter: meter.value,
    config,
    now,
  });
  assert.equal(stillAbove.ladderStep, 1);
  assert.equal(stillAbove.planChanged, false);
  assert.equal(stillAbove.ladderSuspended, false);

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
  assert.equal(oneDayUnder.ladderStep, 1);
  assert.equal(oneDayUnder.plan, "FREE");
  assert.equal(oneDayUnder.planChanged, false);
});

test("downgrade one step after full 30 quiet days", () => {
  const config = DEFAULT_VISITOR_LADDER;
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
  assert.equal(decision.skipped, null);
  assert.equal(decision.ladderStep, 1);
  assert.equal(decision.notify, true);
  assert.equal(decision.ladderSuspended, false);
});

test("X < Y < Z is rejected", () => {
  const steps = DEFAULT_VISITOR_LADDER.steps;
  assert.throws(
    () => parseVisitorLadder({ freeUntil: 10, stepTwoFrom: 10, stepThreeFrom: 20, steps }),
    /X < Y < Z/
  );
  assert.throws(
    () => parseVisitorLadder({ freeUntil: 30, stepTwoFrom: 20, stepThreeFrom: 10, steps }),
    /X < Y < Z/
  );
  assert.throws(
    () => parseVisitorLadder({ freeUntil: 10, stepTwoFrom: 40, stepThreeFrom: 30, steps }),
    /X < Y < Z/
  );
  const ok = parseVisitorLadder({
    freeUntil: 1000,
    stepTwoFrom: 5000,
    stepThreeFrom: 20000,
    steps,
  });
  assert.equal(ok.freeUntil, 1000);
  assert.ok(ok.freeUntil < ok.stepTwoFrom && ok.stepTwoFrom < ok.stepThreeFrom);
});
