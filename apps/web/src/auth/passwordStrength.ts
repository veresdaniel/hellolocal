export type PasswordStrength = "empty" | "weak" | "ok" | "strong";

/** A usable password has 8 characters, a letter, and a number. */
export function passwordProblem(password: string): "short" | "weak" | null {
  if (!password) return "short";
  if (password.length < 8) return "short";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "weak";
  return null;
}

export function passwordStrength(password: string): PasswordStrength {
  if (!password) return "empty";
  if (passwordProblem(password)) return "weak";
  const extra =
    (/[a-z]/.test(password) && /[A-Z]/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0) +
    (password.length >= 12 ? 1 : 0);
  return extra >= 2 ? "strong" : "ok";
}
