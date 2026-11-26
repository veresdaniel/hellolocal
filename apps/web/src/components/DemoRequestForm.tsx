import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import PhoneInput, { isValidPhoneNumber, type Country } from "react-phone-number-input";
import { requestDemo } from "../api/public.api";
import { trackGtmGenerateLead } from "../lib/gtmEvents";
import { publicFormErrorMessage, usePublicFormShield } from "./PublicFormShield";
import "react-phone-number-input/style.css";
import "../styles/plan-picker.css";

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
    <form className="plan-quote overview__demo" noValidate onSubmit={onSubmit}>
      {shield.fields}
      <h3>{t("public.overview.demo.title")}</h3>
      <p className="overview__demo-lead">{t("public.overview.demo.lead")}</p>
      <label>
        {t("public.overview.demo.name")}
        <input
          name="name"
          autoComplete="name"
          placeholder={t("public.overview.demo.placeholderName")}
          value={contactName}
          onChange={(event) => setContactName(event.target.value)}
          required
          aria-invalid={fieldErrors.name ? true : undefined}
        />
        {fieldErrors.name ? <span className="plan-quote__field-error">{fieldErrors.name}</span> : null}
      </label>
      <label>
        {t("public.overview.demo.email")}
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
        {fieldErrors.email ? <span className="plan-quote__field-error">{fieldErrors.email}</span> : null}
      </label>
      <label>
        {t("public.overview.demo.phone")}
        <PhoneInput
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
        {fieldErrors.phone ? <span className="plan-quote__field-error">{fieldErrors.phone}</span> : null}
      </label>
      <label>
        {t("public.overview.demo.organization")}
        <span className="overview__demo-optional"> ({t("public.overview.demo.optional")})</span>
        <input
          name="organization"
          autoComplete="organization"
          placeholder={t("public.overview.demo.placeholderOrganization")}
          value={organization}
          onChange={(event) => setOrganization(event.target.value)}
        />
      </label>
      <label>
        {t("public.overview.demo.message")}
        <span className="overview__demo-optional"> ({t("public.overview.demo.optional")})</span>
        <textarea
          name="message"
          rows={4}
          placeholder={t("public.overview.demo.placeholderMessage")}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </label>
      {error ? <p className="plan-quote__error">{error}</p> : null}
      {status ? (
        <p className="plan-quote__status" role="status">
          {t(`public.overview.demo.${status}`)}
        </p>
      ) : null}
      <button className="plan-picker__cta plan-quote__submit" type="submit" disabled={sending}>
        {sending ? t("public.overview.demo.sending") : t("public.overview.demo.submit")}
      </button>
    </form>
  );
}
