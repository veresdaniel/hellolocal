import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getPlatformSettings } from "../api/places.api";
import { requestMunicipalQuote } from "../api/public.api";
import { publicFormErrorMessage, usePublicFormShield } from "./PublicFormShield";
import { buildUrl } from "../app/urls";
import type { Lang } from "../app/config";
import {
  PUBLIC_PLAN_IDS,
  resolvePlanEnabled,
  resolvePublicPlans,
  type PublicPlanId,
  type PublicPlanNumbers,
} from "./publicPlans";
import { useLandingText } from "../hooks/useLandingText";
import "../styles/plan-picker.css";

const LOCALE: Record<Lang, string> = { hu: "hu-HU", en: "en-GB", de: "de-DE" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatCount(value: number, lang: Lang) {
  const formatted = new Intl.NumberFormat(LOCALE[lang], {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(value);
  if (value >= 1000 && formatted.replace(/\D/g, "") === String(value) && !/\D/.test(formatted)) {
    return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  }
  return formatted;
}

function planBullets(
  numbers: PublicPlanNumbers,
  lang: Lang,
  text: (path: string, options?: { count?: string | number }) => string
) {
  return [
    text("plans.places", { count: formatCount(numbers.places, lang) }),
    numbers.events <= 0
      ? text("plans.eventsNone")
      : text("plans.events", { count: formatCount(numbers.events, lang) }),
    numbers.languages <= 1
      ? text("plans.languagesOne")
      : text("plans.languages", { count: formatCount(numbers.languages, lang) }),
  ];
}

export function PlanPicker({ lang }: { lang: Lang }) {
  const text = useLandingText(lang);
  const sectionRef = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  const { data } = useQuery({
    queryKey: ["platformSettings", lang, "default", "plans"],
    queryFn: () => getPlatformSettings(lang),
    staleTime: 30 * 1000,
    retry: 1,
  });
  const plans = resolvePublicPlans(data?.featureMatrix?.planOverrides);
  const enabled = resolvePlanEnabled(data?.featureMatrix?.planOverrides);
  const [quoteOpen, setQuoteOpen] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShown(true);
        observer.disconnect();
      },
      { threshold: 0.18 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      className={`overview__section plan-picker${shown ? " is-shown" : ""}`}
      id="plans"
      ref={sectionRef}
    >
      <h2>{text("plansTitle")}</h2>
      <p>{text("plansLead")}</p>
      <div className="plan-picker__grid">
        {PUBLIC_PLAN_IDS.filter((id) => enabled[id]).map((id) => (
          <PlanCard key={id} id={id} lang={lang} numbers={plans[id]} />
        ))}
        {enabled.municipal ? <MunicipalCard lang={lang} onOpen={() => setQuoteOpen(true)} /> : null}
      </div>
      {quoteOpen ? <MunicipalQuote onClose={() => setQuoteOpen(false)} /> : null}
    </section>
  );
}

function PlanCard({
  id,
  lang,
  numbers,
}: {
  id: PublicPlanId;
  lang: Lang;
  numbers: PublicPlanNumbers;
}) {
  const text = useLandingText(lang);
  const featured = id === "basic";
  const price = numbers.priceHuf <= 0 ? "0" : formatCount(numbers.priceHuf, lang);
  const priceNote = numbers.priceHuf <= 0 ? text("plans.freeForever") : text("plans.priceUnit");
  const registerUrl = `${buildUrl({ lang, path: "admin/register" })}?plan=${id}`;

  return (
    <article className={`plan-picker__card${featured ? " is-featured" : ""} plan-picker__card--${id}`}>
      <div className="plan-picker__top">
        <p className="plan-picker__kicker">{text(`plans.${id}.kicker`)}</p>
        {featured ? <span className="plan-picker__badge">{text("plans.basic.badge")}</span> : null}
      </div>
      <h3>{text(`plans.${id}.name`)}</h3>
      <p className="plan-picker__price">
        <span>{price}</span>
        <small>{priceNote}</small>
      </p>
      <p className="plan-picker__pitch">{text(`plans.${id}.pitch`)}</p>
      <ul>
        {planBullets(numbers, lang, text).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <Link className="plan-picker__cta" to={registerUrl}>
        {text(`plans.${id}.cta`)}
      </Link>
    </article>
  );
}

function MunicipalCard({ lang, onOpen }: { lang: Lang; onOpen: () => void }) {
  const text = useLandingText(lang);
  return (
    <article className="plan-picker__card plan-picker__card--municipal">
      <div className="plan-picker__top">
        <p className="plan-picker__kicker">{text("plans.municipal.kicker")}</p>
      </div>
      <h3>{text("plans.municipal.name")}</h3>
      <p className="plan-picker__pitch">{text("plans.municipal.pitch")}</p>
      <ul>
        <li>{text("plans.municipal.places")}</li>
        <li>{text("plans.municipal.events")}</li>
        <li>{text("plans.municipal.languages")}</li>
      </ul>
      <button className="plan-picker__cta" type="button" onClick={onOpen}>
        {text("plans.municipal.cta")}
      </button>
    </article>
  );
}

function MunicipalQuote({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [organization, setOrganization] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    organization?: string;
    contactName?: string;
    email?: string;
    message?: string;
  }>({});
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"sent" | "stored" | "noRecipient" | "">("");
  const shield = usePublicFormShield("quote");
  const [sending, setSending] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const root = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        root?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]):not([data-honeypot]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );
    root?.querySelector<HTMLElement>("input:not([data-honeypot])")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = focusable();
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setStatus("");
    const next: typeof fieldErrors = {};
    if (organization.trim().length < 2) next.organization = t("public.overview.plans.quote.organizationRequired");
    if (contactName.trim().length < 2) next.contactName = t("public.overview.plans.quote.contactRequired");
    if (!EMAIL_RE.test(email.trim())) next.email = t("public.overview.plans.quote.invalidEmail");
    if (message.trim().length < 12) next.message = t("public.overview.plans.quote.messageShort");
    setFieldErrors(next);
    if (Object.keys(next).length) return;
    setSending(true);
    try {
      const result = await requestMunicipalQuote({
        organization: organization.trim(),
        contactName: contactName.trim(),
        email: email.trim(),
        message: message.trim(),
        plan: "municipal",
        ...(await shield.payload()),
      });
      if (result.emailed) setStatus("sent");
      else if (result.reason === "no_recipient") setStatus("noRecipient");
      else setStatus("stored");
    } catch (err) {
      setError(publicFormErrorMessage(t, err, t("public.overview.plans.quote.failed")));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="plan-quote-modal" onClick={onClose}>
      <div
        className="plan-quote-modal__panel"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="municipal-quote-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="plan-quote-modal__close" type="button" onClick={onClose} aria-label={t("common.close")}>
          ×
        </button>
        <form className="plan-quote" noValidate onSubmit={onSubmit}>
      {shield.fields}
      <h3 id="municipal-quote-title">{t("public.overview.plans.municipal.cta")}</h3>
      <p className="plan-quote__intro">{t("public.overview.plans.quote.intro")}</p>
      <label>
        {t("public.overview.plans.quote.organization")}
        <input
          name="organization"
          autoComplete="organization"
          placeholder={t("public.overview.plans.quote.placeholderOrganization")}
          value={organization}
          onChange={(event) => setOrganization(event.target.value)}
          required
          aria-invalid={fieldErrors.organization ? true : undefined}
        />
        {fieldErrors.organization ? <span className="plan-quote__field-error">{fieldErrors.organization}</span> : null}
      </label>
      <label>
        {t("public.overview.plans.quote.contactName")}
        <input
          name="name"
          autoComplete="name"
          placeholder={t("public.overview.plans.quote.placeholderContactName")}
          value={contactName}
          onChange={(event) => setContactName(event.target.value)}
          required
          aria-invalid={fieldErrors.contactName ? true : undefined}
        />
        {fieldErrors.contactName ? <span className="plan-quote__field-error">{fieldErrors.contactName}</span> : null}
      </label>
      <label>
        {t("public.overview.plans.quote.email")}
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder={t("public.overview.plans.quote.placeholderEmail")}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          aria-invalid={fieldErrors.email ? true : undefined}
        />
        {fieldErrors.email ? <span className="plan-quote__field-error">{fieldErrors.email}</span> : null}
      </label>
      <label>
        {t("public.overview.plans.quote.message")}
        <textarea
          name="message"
          rows={4}
          placeholder={t("public.overview.plans.quote.placeholderMessage")}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
          minLength={12}
          aria-invalid={fieldErrors.message ? true : undefined}
        />
        {fieldErrors.message ? <span className="plan-quote__field-error">{fieldErrors.message}</span> : null}
      </label>
      {error ? <p className="plan-quote__error">{error}</p> : null}
      {status ? (
        <p className="plan-quote__status" role="status">
          {t(`public.overview.plans.quote.${status}`)}
        </p>
      ) : null}
      <button className="plan-picker__cta plan-quote__submit" type="submit" disabled={sending}>
        {sending
          ? t("public.overview.plans.quote.sending")
          : t("public.overview.plans.quote.submit")}
        </button>
        </form>
      </div>
    </div>
  );
}
