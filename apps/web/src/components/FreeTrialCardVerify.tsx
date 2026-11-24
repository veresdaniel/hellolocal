/**
 * Stripe SetupIntent card verify for free-trial abuse gate (fingerprint only; no charge).
 * Loads Stripe.js from CDN when requireCard is on — optional until STRIPE_* env is set.
 */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  confirmFreeTrialCard,
  createFreeTrialSetupIntent,
  getFreeTrialCardStatus,
  type FreeTrialCardStatus,
} from "../api/signupAbuse.api";

type StripeCardElement = {
  mount: (el: HTMLElement) => void;
  unmount: () => void;
};

type StripeLike = {
  elements: () => {
    create: (type: string) => StripeCardElement;
  };
  confirmCardSetup: (
    clientSecret: string,
    opts: { payment_method: { card: StripeCardElement } }
  ) => Promise<{ setupIntent?: { id: string; status: string }; error?: { message?: string } }>;
};

declare global {
  interface Window {
    Stripe?: (key: string) => StripeLike;
  }
}

function loadStripeJs(): Promise<typeof window.Stripe> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.Stripe) return Promise.resolve(window.Stripe);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-hl-stripe="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Stripe));
      existing.addEventListener("error", () => reject(new Error("Stripe.js failed")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.async = true;
    script.dataset.hlStripe = "1";
    script.onload = () => resolve(window.Stripe);
    script.onerror = () => reject(new Error("Stripe.js failed"));
    document.head.appendChild(script);
  });
}

type Props = {
  onVerified?: () => void;
  /** Compact inline block vs full panel */
  compact?: boolean;
};

export function FreeTrialCardVerify({ onVerified, compact }: Props) {
  const { t } = useTranslation();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<StripeCardElement | null>(null);
  const [status, setStatus] = useState<FreeTrialCardStatus | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripe, setStripe] = useState<StripeLike | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getFreeTrialCardStatus()
      .then((row) => {
        if (cancelled) return;
        setStatus(row);
        if (row.cardVerified || !row.requireCard || !row.publishableKey) return;
        return createFreeTrialSetupIntent().then(async (intent) => {
          if (cancelled) return;
          if (intent.alreadyVerified) {
            setStatus((prev) => (prev ? { ...prev, cardVerified: true } : prev));
            onVerified?.();
            return;
          }
          if (!intent.clientSecret) return;
          setClientSecret(intent.clientSecret);
          const factory = await loadStripeJs();
          if (cancelled || !factory || !row.publishableKey) return;
          setStripe(factory(row.publishableKey));
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
      cardRef.current?.unmount();
      cardRef.current = null;
    };
  }, [onVerified]);

  useEffect(() => {
    if (!stripe || !clientSecret || !mountRef.current) return;
    const card = stripe.elements().create("card");
    card.mount(mountRef.current);
    cardRef.current = card;
    setReady(true);
    return () => {
      card.unmount();
      cardRef.current = null;
      setReady(false);
    };
  }, [stripe, clientSecret]);

  const submit = async () => {
    if (!stripe || !clientSecret || !cardRef.current) return;
    setBusy(true);
    setError(null);
    try {
      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardRef.current },
      });
      if (result.error) {
        setError(result.error.message || t("admin.signupAbuse.cardFailed"));
        return;
      }
      const id = result.setupIntent?.id;
      if (!id) {
        setError(t("admin.signupAbuse.cardFailed"));
        return;
      }
      await confirmFreeTrialCard(id);
      setStatus((prev) => (prev ? { ...prev, cardVerified: true } : prev));
      onVerified?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (!status) {
    return null;
  }
  if (!status.requireCard) return null;
  if (status.cardVerified) {
    return (
      <p style={{ color: "var(--admin-muted)", margin: compact ? 0 : undefined }}>
        {t("admin.signupAbuse.cardVerified")}
      </p>
    );
  }

  return (
    <div
      style={{
        marginTop: compact ? 12 : 0,
        marginBottom: compact ? 0 : 24,
        background: "var(--admin-surface, #fff)",
        borderRadius: 12,
        border: "1px solid var(--admin-border-subtle, #e5e7eb)",
        padding: compact ? 16 : 24,
      }}
    >
      <h2 style={{ marginTop: 0, fontSize: compact ? 16 : 20 }}>
        {t("admin.signupAbuse.cardTitle")}
      </h2>
      <p style={{ color: "var(--admin-muted, #665d78)", marginTop: 0 }}>
        {t("admin.signupAbuse.cardLead")}
      </p>
      <div ref={mountRef} style={{ padding: "8px 0", minHeight: 40 }} />
      {error && (
        <p style={{ color: "#991b1b", fontSize: 14 }} role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={!ready || busy}
        onClick={() => void submit()}
        style={{
          marginTop: 8,
          padding: "10px 16px",
          borderRadius: 8,
          border: "none",
          background: "#1b1730",
          color: "#fff",
          fontWeight: 600,
          cursor: !ready || busy ? "not-allowed" : "pointer",
          opacity: !ready || busy ? 0.6 : 1,
        }}
      >
        {busy ? t("common.save") : t("admin.signupAbuse.cardSubmit")}
      </button>
    </div>
  );
}
