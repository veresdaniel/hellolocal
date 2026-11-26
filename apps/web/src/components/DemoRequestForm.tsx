import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import PhoneInput, { isValidPhoneNumber, type Country } from "react-phone-number-input";
import { requestDemo } from "../api/public.api";
import { trackGtmGenerateLead } from "../lib/gtmEvents";
import {
  LEAD_FORM_MIN_MS,
  publicFormErrorMessage,
  usePublicFormShield,
} from "./PublicFormShield";
import { LandingHtml, LandingInline, landingPlain } from "./LandingHtml";
import "react-phone-number-input/style.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const THANKS_RESET_MS = 30_000;

function defaultCountry(lang: string): Country {
  if (lang.startsWith("de")) return "DE";
  if (lang.startsWith("en")) return "GB";
  return "HU";
}

function ThanksIcon({ tone }: { tone: "ok" | "warn" }) {
  return (
    <span className={`overview-demo__thanks-icon overview-demo__thanks-icon--${tone}`} aria-hidden="true">
      {tone === "ok" ? (
        <svg viewBox="0 0 48 48" width="48" height="48" fill="none">
          <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.5" opacity="0.28" />
          <path
            d="M14.5 24.5 21 31l12.5-14"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 48 48" width="48" height="48" fill="none">
          <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.5" opacity="0.28" />
          <path d="M24 15v14" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="24" cy="34" r="1.8" fill="currentColor" />
        </svg>
      )}
    </span>
  );
}

export function DemoRequestForm() {
  const { t, i18n } = useTranslation();
  const shield = usePublicFormShield("demo", { minMs: LEAD_FORM_MIN_MS });
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState<string | undefined>();
  const [organization, setOrganization] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
  }>({});
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"sent" | "stored" | "noRecipient" | "">("");
  const [sending, setSending] = useState(false);
  const country = useMemo(() => defaultCountry(i18n.language || "hu"), [i18n.language]);
  const done = Boolean(status);
  const thanksTone = status === "sent" ? "ok" : "warn";

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => {
      setStatus("");
      setContactName("");
      setEmail("");
      setPhone(undefined);
      setOrganization("");
      setMessage("");
      setFieldErrors({});
      setError("");
    }, THANKS_RESET_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setStatus("");
    const next: { name?: string; email?: string; phone?: string } = {};
    if (!contactName.trim()) next.name = t("public.overview.demo.required");
    if (!email.trim() || !EMAIL_RE.test(email.trim())) next.email = t("public.overview.demo.invalidEmail");
    if (!phone || !isValidPhoneNumber(phone)) next.phone = t("public.overview.demo.invalidPhone");
    setFieldErrors(next);
    if (next.name || next.email || next.phone) return;
    setSending(true);
    try {
      const result = await requestDemo({
        contactName: contactName.trim(),
        email: email.trim(),
        phone: phone!,
        organization: organization.trim(),
        message: message.trim(),
        ...(await shield.payload()),
      });
      trackGtmGenerateLead("demo_request");
      if (result.emailed) setStatus("sent");
      else if (result.reason === "no_recipient") setStatus("noRecipient");
      else setStatus("stored");
    } catch (err) {
      setError(publicFormErrorMessage(t, err, t("public.overview.demo.failed")));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`overview-demo${done ? " is-done" : ""}`}>
      <div className="overview-demo__glow" aria-hidden="true" />
      <form className="overview-demo__form" noValidate onSubmit={onSubmit}>
        {shield.fields}

        {done && status ? (
          <div
            className={`overview-demo__thanks overview-demo__thanks--${thanksTone}`}
            role="status"
            aria-live="polite"
          >
            <ThanksIcon tone={thanksTone} />
            <h3 className="overview-demo__thanks-title">
              <LandingInline html={t(`public.overview.demo.${status}Title`)} />
            </h3>
            <LandingHtml
              html={t(`public.overview.demo.${status}Lead`)}
              className="overview-demo__thanks-lead"
              as="div"
            />
          </div>
        ) : (
          <>
            <header className="overview-demo__header">
              <LandingHtml
                html={t("public.overview.demo.kicker")}
                className="overview-demo__kicker"
                as="div"
              />
              <h3 className="overview-demo__title">
                <LandingInline html={t("public.overview.demo.title")} />
              </h3>
              <LandingHtml
                html={t("public.overview.demo.lead")}
                className="overview-demo__lead"
                as="div"
              />
              <LandingHtml
                html={t("public.overview.demo.trust")}
                className="overview-demo__trust overview-demo__trust--aside"
                as="div"
              />
            </header>

            <div className="overview-demo__grid">
              <label className="overview-demo__field">
                <span className="overview-demo__label">
                  <LandingInline html={t("public.overview.demo.name")} />
                </span>
                <input
                  name="name"
                  autoComplete="name"
                  placeholder={landingPlain(t("public.overview.demo.placeholderName"))}
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  required
                  aria-invalid={fieldErrors.name ? true : undefined}
                />
                {fieldErrors.name ? (
                  <span className="overview-demo__error">{fieldErrors.name}</span>
                ) : null}
              </label>

              <label className="overview-demo__field">
                <span className="overview-demo__label">
                  <LandingInline html={t("public.overview.demo.email")} />
                </span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder={landingPlain(t("public.overview.demo.placeholderEmail"))}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  aria-invalid={fieldErrors.email ? true : undefined}
                />
                {fieldErrors.email ? (
                  <span className="overview-demo__error">{fieldErrors.email}</span>
                ) : null}
              </label>

              <label className="overview-demo__field">
                <span className="overview-demo__label">
                  <LandingInline html={t("public.overview.demo.phone")} />
                </span>
                <PhoneInput
                  className="overview-demo__phone"
                  international
                  defaultCountry={country}
                  countryCallingCodeEditable={false}
                  value={phone}
                  onChange={setPhone}
                  placeholder={landingPlain(t("public.overview.demo.placeholderPhone"))}
                  numberInputProps={{
                    name: "phone",
                    autoComplete: "tel",
                    required: true,
                    "aria-invalid": fieldErrors.phone ? true : undefined,
                  }}
                />
                {fieldErrors.phone ? (
                  <span className="overview-demo__error">{fieldErrors.phone}</span>
                ) : null}
              </label>

              <label className="overview-demo__field">
                <span className="overview-demo__label">
                  <LandingInline html={t("public.overview.demo.organization")} />
                  <LandingHtml
                    html={t("public.overview.demo.optional")}
                    className="overview-demo__optional"
                    as="span"
                  />
                </span>
                <input
                  name="organization"
                  autoComplete="organization"
                  placeholder={landingPlain(t("public.overview.demo.placeholderOrganization"))}
                  value={organization}
                  onChange={(event) => setOrganization(event.target.value)}
                />
              </label>

              <label className="overview-demo__field overview-demo__field--full">
                <span className="overview-demo__label">
                  <LandingInline html={t("public.overview.demo.message")} />
                  <LandingHtml
                    html={t("public.overview.demo.optional")}
                    className="overview-demo__optional"
                    as="span"
                  />
                </span>
                <textarea
                  name="message"
                  rows={3}
                  placeholder={landingPlain(t("public.overview.demo.placeholderMessage"))}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </label>
            </div>

            {error ? <p className="overview-demo__banner-error">{error}</p> : null}

            <div className="overview-demo__footer">
              <LandingHtml
                html={t("public.overview.demo.trust")}
                className="overview-demo__trust overview-demo__trust--foot"
                as="div"
              />
              <button className="overview-demo__submit" type="submit" disabled={sending}>
                <LandingInline
                  html={
                    sending ? t("public.overview.demo.sending") : t("public.overview.demo.submit")
                  }
                />
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
