/**
 * Dev-only logger for the API.
 * No-ops when NODE_ENV === "production".
 */

type LogArgs = unknown[];

const isDev = process.env.NODE_ENV !== "production";

function emit(level: "debug" | "info" | "warn" | "error", args: LogArgs) {
  if (!isDev) return;
  // eslint-disable-next-line no-console
  console[level](...args);
}

export const devLog = {
  debug: (...args: LogArgs) => emit("debug", args),
  info: (...args: LogArgs) => emit("info", args),
  warn: (...args: LogArgs) => emit("warn", args),
  error: (...args: LogArgs) => emit("error", args),
};

export default devLog;
