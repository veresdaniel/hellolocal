import { BadRequestException } from "@nestjs/common";

/**
 * Instant scripted posts are rejected. Keep this short: password managers +
 * autofill often submit login within ~1s of paint; 2.5s made the first click fail.
 */
export const PUBLIC_FORM_MIN_MS = 800;
const MAX_AGE_MS = 2 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 15_000;

export type PublicFormShieldInput = {
  companyWebsite?: unknown;
  formStartedAt?: unknown;
  recaptchaToken?: unknown;
};

export type PublicFormShieldOptions = {
  /** Override minimum dwell time (ms). Lead forms use a longer window than login. */
  minMs?: number;
  /**
   * - `required` (default): when RECAPTCHA_SECRET_KEY is set, a valid token is mandatory
   * - `optional`: verify when a token is present; do not fail closed if missing (login / password flows)
   * - `off`: never check captcha
   */
  captcha?: "required" | "optional" | "off";
};

/**
 * Honeypot + minimum time on every anonymous public form.
 * reCAPTCHA v3 is checked only when RECAPTCHA_SECRET_KEY is set.
 * A missing key does not count as a passed captcha.
 */
export async function assertPublicFormShield(
  input: PublicFormShieldInput,
  opts?: PublicFormShieldOptions
): Promise<void> {
  const honeypot = typeof input.companyWebsite === "string" ? input.companyWebsite.trim() : "";
  if (honeypot) {
    throw new BadRequestException("public_form_rejected");
  }

  const minMs = Math.max(opts?.minMs ?? PUBLIC_FORM_MIN_MS, PUBLIC_FORM_MIN_MS);
  const started =
    typeof input.formStartedAt === "number" ? input.formStartedAt : Number(input.formStartedAt);
  const now = Date.now();
  const elapsed = now - started;
  if (!Number.isFinite(started) || started > now + CLOCK_SKEW_MS || elapsed < minMs || elapsed > MAX_AGE_MS) {
    throw new BadRequestException("public_form_too_fast");
  }

  const captchaMode = opts?.captcha ?? "required";
  if (captchaMode === "off") return;

  const secret = process.env.RECAPTCHA_SECRET_KEY?.trim() ?? "";
  if (!secret) return;

  const token = typeof input.recaptchaToken === "string" ? input.recaptchaToken.trim() : "";
  if (!token) {
    if (captchaMode === "optional") return;
    throw new BadRequestException("public_form_captcha");
  }
  if (!(await verifyRecaptcha(secret, token))) {
    throw new BadRequestException("public_form_captcha");
  }
}

async function verifyRecaptcha(secret: string, token: string): Promise<boolean> {
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean; score?: number };
    if (!data.success) return false;
    if (typeof data.score === "number" && data.score < 0.5) return false;
    return true;
  } catch {
    return false;
  }
}
