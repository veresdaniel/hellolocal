import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import PhoneInput, { isValidPhoneNumber, type Country } from "react-phone-number-input";
import { requestDemo } from "../api/public.api";
import { trackGtmGenerateLead } from "../lib/gtmEvents";
import { publicFormErrorMessage, usePublicFormShield } from "./PublicFormShield";
import "react-phone-number-input/style.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function defaultCountry(lang: string): Country {
  if (lang.startsWith("de")) return "DE";
  if (lang.startsWith("en")) return "GB";
  return "HU";
}

export function DemoRequestForm() {
  const { t, i18n } = useTranslation();
  const shield = usePublicFormShield("demo");
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

        <header className="overview-demo__header">
          <p className="overview-demo__kicker">{t("public.overview.demo.kicker")}</p>
          <h3 className="overview-demo__title">{t("public.overview.demo.title")}</h3>
          <p className="overview-demo__lead">{t("public.overview.demo.lead")}</p>
        </header>

        {done ? (
          <div className="overview-demo__success" role="status">
            <span className="overview-demo__success-mark" aria-hidden="true">
              ✓
            </span>
            <p>{t(`public.overview.demo.${status}`)}</p>
          </div>
        ) : (
          <>
            <div className="overview-demo__grid">
              <label className="overview-demo__field">
                <span className="overview-demo__label">{t("public.overview.demo.name")}</span>
                <input
                  name="name"
                  autoComplete="name"
                  placeholder={t("public.overview.demo.placeholderName")}
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
                <span className="overview-demo__label">{t("public.overview.demo.email")}</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t("public.overview.demo.placeholderEmail")}
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
                <span className="overview-demo__label">{t("public.overview.demo.phone")}</span>
                <PhoneInput
                  className="overview-demo__phone"
                  international
                  defaultCountry={country}
                  countryCallingCodeEditable={false}
                  value={phone}
                  onChange={setPhone}
                  placeholder={t("public.overview.demo.placeholderPhone")}
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
                  {t("public.overview.demo.organization")}
                  <span className="overview-demo__optional">{t("public.overview.demo.optional")}</span>
                </span>
                <input
                  name="organization"
                  autoComplete="organization"
                  placeholder={t("public.overview.demo.placeholderOrganization")}
                  value={organization}
                  onChange={(event) => setOrganization(event.target.value)}
                />
              </label>

              <label className="overview-demo__field overview-demo__field--full">
                <span className="overview-demo__label">
                  {t("public.overview.demo.message")}
                  <span className="overview-demo__optional">{t("public.overview.demo.optional")}</span>
                </span>
                <textarea
                  name="message"
                  rows={3}
                  placeholder={t("public.overview.demo.placeholderMessage")}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </label>
            </div>

            {error ? <p className="overview-demo__banner-error">{error}</p> : null}

            <div className="overview-demo__footer">
              <p className="overview-demo__trust">{t("public.overview.demo.trust")}</p>
              <button className="overview-demo__submit" type="submit" disabled={sending}>
                {sending ? t("public.overview.demo.sending") : t("public.overview.demo.submit")}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
