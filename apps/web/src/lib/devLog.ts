/**
 * Dev-only logger for the web app.
 * No-ops in production builds (`import.meta.env.DEV === false`).
 */

type LogArgs = unknown[];

const isDev = import.meta.env.DEV;

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
