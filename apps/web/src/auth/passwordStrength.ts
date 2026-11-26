export type PasswordStrength = "empty" | "weak" | "ok" | "strong";

export const PASSWORD_MIN_LENGTH = 10;

export type PasswordProblem = "short" | "weak" | null;

/** Strong password: length + lower + upper + digit + special. */
export function passwordProblem(password: string): PasswordProblem {
  if (!password || password.length < PASSWORD_MIN_LENGTH) return "short";
  if (
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    return "weak";
  }
  return null;
}

export function passwordStrength(password: string): PasswordStrength {
  if (!password) return "empty";
  if (passwordProblem(password)) return "weak";
  const extra =
    (password.length >= 14 ? 1 : 0) +
    ((password.match(/[^A-Za-z0-9]/g) || []).length >= 2 ? 1 : 0);
  return extra >= 1 ? "strong" : "ok";
}

export function passwordStrengthScore(password: string): 0 | 1 | 2 | 3 {
  const s = passwordStrength(password);
  if (s === "empty") return 0;
  if (s === "weak") return 1;
  if (s === "ok") return 2;
  return 3;
}
