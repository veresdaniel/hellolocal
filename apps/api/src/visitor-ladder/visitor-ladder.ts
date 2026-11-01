// Pure visitor-ladder rules. No database, no prices, no invoices.

export const LADDER_PLANS = ["FREE", "BASIC", "PRO", "BUSINESS", "MUNICIPAL"] as const;
export type LadderPlan = (typeof LADDER_PLANS)[number];

export const LADDER_ACTIONS = ["notify", "apply-plan", "suspend"] as const;
export type LadderAction = (typeof LADDER_ACTIONS)[number];

export type LadderStepConfig = {
  action: LadderAction;
  plan: LadderPlan;
};

export type VisitorLadderConfig = {
  freeUntil: number;
  stepTwoFrom: number;
  stepThreeFrom: number;
  steps: [LadderStepConfig, LadderStepConfig, LadderStepConfig];
};

export const HOLD_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const METER_WINDOW_DAYS = 30;

/**
 * Defaults chosen for a local map:
 * under 1 000 visitors / 30 days the site stays on the free plan and public,
 * from 5 000 the site admin is notified, from 20 000 they are notified again.
 * Suspend and apply-plan are available, but they are not the default.
 * Apply-plan names an existing plan and only changes entitlement limits.
 */
export const DEFAULT_VISITOR_LADDER: VisitorLadderConfig = {
  freeUntil: 1000,
  stepTwoFrom: 5000,
  stepThreeFrom: 20000,
  steps: [
    { action: "apply-plan", plan: "FREE" },
    { action: "notify", plan: "PRO" },
    { action: "notify", plan: "BUSINESS" },
  ],
};

export type MeterSource = "uniqueVisitors" | "pageViews";

export type MeterSnapshot = {
  value: number;
  source: MeterSource;
};

export type LadderSiteState = {
  manualOverride: boolean;
  ladderStep: number;
  ladderSuspended: boolean;
  belowFloorSince: Date | null;
  plan: LadderPlan;
  lastNotifiedStep: number | null;
  ladderEvaluatedAt: Date | null;
};

export type LadderDecision = {
  skipped: null | "manual-override" | "already-evaluated";
  ladderStep: number;
  plan: LadderPlan;
  ladderSuspended: boolean;
  belowFloorSince: Date | null;
  notify: boolean;
  planChanged: boolean;
  suspendChanged: boolean;
};

type DayCount = {
  uniqueVisitors?: number | null;
  pageViews?: number | null;
};

function isPlan(value: unknown): value is LadderPlan {
  return typeof value === "string" && (LADDER_PLANS as readonly string[]).includes(value);
}

function isAction(value: unknown): value is LadderAction {
  return typeof value === "string" && (LADDER_ACTIONS as readonly string[]).includes(value);
}

function wholeNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return null;
  return value;
}

function readStep(value: unknown): LadderStepConfig | null {
  if (!value || typeof value !== "object") return null;
  const step = value as { action?: unknown; plan?: unknown };
  if (!isAction(step.action) || !isPlan(step.plan)) return null;
  return { action: step.action, plan: step.plan };
}

export function parseVisitorLadder(input: unknown): VisitorLadderConfig {
  const raw = (input ?? {}) as {
    freeUntil?: unknown;
    stepTwoFrom?: unknown;
    stepThreeFrom?: unknown;
    steps?: unknown;
  };
  const freeUntil = wholeNumber(raw.freeUntil);
  const stepTwoFrom = wholeNumber(raw.stepTwoFrom);
  const stepThreeFrom = wholeNumber(raw.stepThreeFrom);
  if (freeUntil === null || stepTwoFrom === null || stepThreeFrom === null) {
    throw new Error("X < Y < Z");
  }
  if (!(freeUntil < stepTwoFrom && stepTwoFrom < stepThreeFrom)) {
    throw new Error("X < Y < Z");
  }
  if (!Array.isArray(raw.steps) || raw.steps.length !== 3) {
    throw new Error("X < Y < Z");
  }
  const steps = raw.steps.map(readStep);
  if (steps.some((step) => !step)) {
    throw new Error("X < Y < Z");
  }
  return {
    freeUntil,
    stepTwoFrom,
    stepThreeFrom,
    steps: steps as [LadderStepConfig, LadderStepConfig, LadderStepConfig],
  };
}

export function windowStart(now: Date): Date {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - (METER_WINDOW_DAYS - 1));
  return start;
}

export function sameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/**
 * Sum unique visitors over the rows given (already limited to the window).
 * If that sum is zero while page views exist, the unique-visitor column was
 * never filled, so the meter falls back to page views and says so.
 */
export function summarizeMeter(rows: DayCount[]): MeterSnapshot {
  let unique = 0;
  let pages = 0;
  for (const row of rows) {
    unique += row.uniqueVisitors ?? 0;
    pages += row.pageViews ?? 0;
  }
  if (unique > 0) return { value: unique, source: "uniqueVisitors" };
  if (pages > 0) return { value: pages, source: "pageViews" };
  return { value: 0, source: "uniqueVisitors" };
}

export function stepForMeter(meter: number, config: VisitorLadderConfig): 0 | 1 | 2 {
  if (meter >= config.stepThreeFrom) return 2;
  if (meter >= config.stepTwoFrom) return 1;
  return 0;
}

export function stepFloor(step: number, config: VisitorLadderConfig): number {
  if (step >= 2) return config.stepThreeFrom;
  if (step === 1) return config.stepTwoFrom;
  return 0;
}

export function clampStep(step: number): 0 | 1 | 2 {
  if (step >= 2) return 2;
  if (step <= 0) return 0;
  return 1;
}

export function ladderPlanToSitePlan(
  plan: LadderPlan
): "basic" | "pro" | "business" | "municipal" {
  if (plan === "PRO") return "pro";
  if (plan === "BUSINESS") return "business";
  if (plan === "MUNICIPAL") return "municipal";
  return "basic";
}

function frozen(
  state: LadderSiteState,
  ladderStep: number,
  skipped: LadderDecision["skipped"]
): LadderDecision {
  return {
    skipped,
    ladderStep,
    plan: state.plan,
    ladderSuspended: state.ladderSuspended,
    belowFloorSince: state.belowFloorSince,
    notify: false,
    planChanged: false,
    suspendChanged: false,
  };
}

/**
 * Upgrade when the 30-day meter reaches the next floor.
 * Downgrade one step only after the meter has stayed under the current floor
 * for the full 30-day hold. A manual override changes nothing.
 * At most one evaluation per UTC day.
 */
export function decideVisitorLadder(input: {
  state: LadderSiteState;
  meter: number;
  config: VisitorLadderConfig;
  now: Date;
}): LadderDecision {
  const currentStep = clampStep(input.state.ladderStep);
  if (input.state.manualOverride) {
    return frozen(input.state, currentStep, "manual-override");
  }
  if (
    input.state.ladderEvaluatedAt &&
    sameUtcDay(input.state.ladderEvaluatedAt, input.now)
  ) {
    return frozen(input.state, currentStep, "already-evaluated");
  }

  const target = stepForMeter(input.meter, input.config);
  let nextStep = currentStep;
  let below = input.state.belowFloorSince;
  let moved = false;

  if (target > currentStep) {
    nextStep = target;
    below = null;
    moved = true;
  } else if (target < currentStep && input.meter < stepFloor(currentStep, input.config)) {
    const heldFor = below ? input.now.getTime() - below.getTime() : 0;
    if (!below || heldFor < HOLD_WINDOW_MS) {
      if (!below) below = input.now;
    } else {
      nextStep = (currentStep - 1) as 0 | 1;
      moved = true;
      below = null;
      if (nextStep > 0 && input.meter < stepFloor(nextStep, input.config)) {
        below = input.now;
      }
    }
  } else {
    below = null;
  }

  let plan = input.state.plan;
  let suspended = input.state.ladderSuspended;
  const waiting = !moved && target < currentStep;
  const step = input.config.steps[nextStep];
  if (!waiting) {
    if (step.action === "apply-plan") {
      plan = step.plan;
      if (suspended) suspended = false;
    } else if (step.action === "suspend") {
      suspended = true;
    } else if (suspended) {
      suspended = false;
    }
  }

  const planChanged = plan !== input.state.plan;
  const suspendChanged = suspended !== input.state.ladderSuspended;
  const notify =
    (moved && step.action === "notify") || planChanged || (suspendChanged && suspended);

  return {
    skipped: null,
    ladderStep: nextStep,
    plan,
    ladderSuspended: suspended,
    belowFloorSince: below,
    notify,
    planChanged,
    suspendChanged,
  };
}
