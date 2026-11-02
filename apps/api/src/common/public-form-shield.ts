import { BadRequestException } from "@nestjs/common";

/** Instant scripted posts are rejected. Humans need a short pause after the form appears. */
export const PUBLIC_FORM_MIN_MS = 2500;
const MAX_AGE_MS = 2 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 15_000;

export type PublicFormShieldInput = {
  companyWebsite?: unknown;
  formStartedAt?: unknown;
  recaptchaToken?: unknown;
};

/**
 * Honeypot + minimum time on every anonymous public form.
 * reCAPTCHA v3 is checked only when RECAPTCHA_SECRET_KEY is set.
 * A missing key does not count as a passed captcha.
 */
export async function assertPublicFormShield(input: PublicFormShieldInput): Promise<void> {
  const honeypot = typeof input.companyWebsite === "string" ? input.companyWebsite.trim() : "";
  if (honeypot) {
    throw new BadRequestException("public_form_rejected");
  }

  const started =
    typeof input.formStartedAt === "number" ? input.formStartedAt : Number(input.formStartedAt);
  const now = Date.now();
  const elapsed = now - started;
  if (!Number.isFinite(started) || started > now + CLOCK_SKEW_MS || elapsed < PUBLIC_FORM_MIN_MS || elapsed > MAX_AGE_MS) {
    throw new BadRequestException("public_form_too_fast");
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY?.trim() ?? "";
  if (!secret) return;

  const token = typeof input.recaptchaToken === "string" ? input.recaptchaToken.trim() : "";
  if (!token || !(await verifyRecaptcha(secret, token))) {
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
