import { useEffect, useRef, useState, type ReactNode } from "react";
import type { TFunction } from "i18next";

export type PublicFormShieldPayload = {
  companyWebsite: string;
  formStartedAt: number;
  recaptchaToken?: string;
};

type Grecaptcha = {
  ready: (callback: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
};

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

const siteKey = () => (import.meta.env.VITE_RECAPTCHA_SITE_KEY || "").trim();

let scriptPromise: Promise<void> | null = null;

function loadRecaptcha(key: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.grecaptcha) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(key)}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("recaptcha"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** Loads invisible reCAPTCHA only while a public form is mounted, and only if a site key exists. */
export function usePublicFormShield(action: string) {
  const startedAt = useRef(Date.now());
  const [companyWebsite, setCompanyWebsite] = useState("");
  const key = siteKey();

  useEffect(() => {
    if (!key) return;
    loadRecaptcha(key).catch(() => undefined);
  }, [key]);

  const payload = async (): Promise<PublicFormShieldPayload> => {
    let recaptchaToken: string | undefined;
    if (key) {
      try {
        await loadRecaptcha(key);
        recaptchaToken = await new Promise((resolve, reject) => {
          const client = window.grecaptcha;
          if (!client) {
            reject(new Error("recaptcha"));
            return;
          }
          client.ready(() => {
            client.execute(key, { action }).then(resolve).catch(reject);
          });
        });
      } catch {
        recaptchaToken = undefined;
      }
    }
    return {
      companyWebsite,
      formStartedAt: startedAt.current,
      ...(recaptchaToken ? { recaptchaToken } : {}),
    };
  };

  const fields: ReactNode = (
    <div
      aria-hidden="true"
      style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}
    >
      <label>
        Website
        <input
          type="text"
          name="companyWebsite"
          data-honeypot=""
          tabIndex={-1}
          autoComplete="off"
          value={companyWebsite}
          onChange={(event) => setCompanyWebsite(event.target.value)}
        />
      </label>
    </div>
  );

  return { fields, payload };
}

export function publicFormErrorMessage(t: TFunction, err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : "";
  const code = Array.isArray(raw) ? String(raw[0] ?? "") : raw;
  if (code === "public_form_too_fast") return t("public.form.tooFast");
  if (code === "public_form_captcha") return t("public.form.captcha");
  if (code === "public_form_rejected") return t("public.form.rejected");
  return code || fallback;
}
