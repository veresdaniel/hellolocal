import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useAuth } from "../../contexts/AuthContext";
import { useAdminSite } from "../../contexts/useAdminSite";
import { useToast } from "../../contexts/ToastContext";
import { DEFAULT_LANG, type Lang, isLang } from "../../app/config";
import { createEvent, createGallery, getPlaces } from "../../api/admin.api";
import { notifyEntityChanged } from "../../hooks/useAdminCache";
import { optionsFromTranslations } from "../../utils/adminSelectOptions";
import { WizardShell } from "./WizardShell";
import { WizardPhotoStep, type WizardPhoto } from "./WizardPhotoStep";
import {
  WizardPublishChoice,
  canChooseWizardPublish,
  type WizardPublishMode,
} from "./WizardPublishChoice";
import { useIsMobileAdmin } from "./useIsMobileAdmin";
import { AiPostfixField } from "../../components/AiGeneratePostfixButton";
import { stripHtml } from "../../utils/htmlUtils";
import {
  plainToHtml,
  wizardCard,
  wizardInput,
  wizardLabel,
  wizardSelect,
  wizardTextarea,
} from "./wizardStyles";

const STEP_COUNT = 6;

type PlaceRow = {
  id: string;
  siteId?: string;
  tenantId?: string;
  plan?: string | null;
  translations?: Array<{ lang?: string; name?: string | null; title?: string | null }>;
  name?: string | null;
};

export function EventWizard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { selectedSiteId } = useAdminSite();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const isMobile = useIsMobileAdmin();
  usePageTitle("admin.wizard.eventTitle");

  const uiLang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;
  const contentLang = (i18n.language || uiLang).split("-")[0] || uiLang;

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [photos, setPhotos] = useState<WizardPhoto[]>([]);
  const [description, setDescription] = useState("");
  const [publishMode, setPublishMode] = useState<WizardPublishMode>("draft");
  const [places, setPlaces] = useState<PlaceRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [doneEventId, setDoneEventId] = useState<string | null>(null);
  const [donePublished, setDonePublished] = useState(false);

  useEffect(() => {
    if (!selectedSiteId) {
      setPlaces([]);
      return;
    }
    let cancelled = false;
    void getPlaces(selectedSiteId, 1, 500)
      .then((res) => {
        const list = Array.isArray(res) ? res : res.places || [];
        if (!cancelled) setPlaces(list);
      })
      .catch(() => {
        if (!cancelled) setPlaces([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSiteId]);

  const placeOptions = useMemo(
    () => optionsFromTranslations(places, contentLang),
    [places, contentLang]
  );
  const placeLabel = placeOptions.find((o) => o.value === placeId)?.label || "—";
  const selectedPlace = places.find((row) => row.id === placeId);
  const eventSiteId = selectedPlace?.siteId || selectedPlace?.tenantId || selectedSiteId || undefined;
  const eventDraftHints = [
    "Mobile event upload wizard",
    "Synthesize original guide copy from public knowledge; do not copy source wording",
    placeId && placeLabel !== "—" ? `Linked place: ${placeLabel}` : "",
    startDate ? `Starts: ${startDate}` : "",
  ]
    .filter(Boolean)
    .join(". ");
  const canPublish = canChooseWizardPublish(user?.role, selectedPlace?.plan);

  useEffect(() => {
    if (!canPublish && publishMode !== "draft") setPublishMode("draft");
  }, [canPublish, publishMode]);

  const canNext = (() => {
    if (step === 0) return title.trim().length > 0;
    if (step === 1) return Boolean(placeId);
    if (step === 2) return Boolean(startDate);
    return true;
  })();

  const save = async () => {
    const place = places.find((row) => row.id === placeId);
    const siteId = place?.siteId || place?.tenantId || selectedSiteId;
    if (!siteId || !placeId || !title.trim() || !startDate) {
      showToast(t("admin.wizard.missingRequired"), "error");
      return;
    }

    setBusy(true);
    try {
      const publish = canChooseWizardPublish(user?.role, place?.plan) && publishMode === "publish";
      const heroImage = photos[0]?.url || null;
      const shortDescription = plainToHtml(description) || null;
      const event = await createEvent({
        siteId,
        placeId,
        translations: [
          {
            lang: contentLang,
            title: title.trim(),
            shortDescription,
            description: shortDescription,
          },
        ],
        startDate,
        endDate: endDate || null,
        heroImage,
        isActive: publish,
        isCrawlable: publish,
        isPublished: publish,
      });

      const eventId = event?.id as string | undefined;
      if (eventId && photos.length > 1) {
        await createGallery({
          siteId,
          placeId,
          eventId,
          name: title.trim(),
          images: photos.slice(1).map((p) => ({ id: p.id, src: p.url, alt: title.trim() })),
          isActive: true,
        });
      }

      notifyEntityChanged("events");
      setDonePublished(publish);
      setDoneEventId(eventId || "ok");
      setStep(STEP_COUNT);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.createEventFailed"), "error");
    } finally {
      setBusy(false);
    }
  };

  if (!isMobile) {
    return <Navigate to={`/${uiLang}/admin/events?new=true`} replace />;
  }

  if (doneEventId) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px" }}>
        <div style={wizardCard}>
          <h1 style={{ margin: "0 0 10px", fontSize: 22 }}>{t("admin.wizard.savedTitle")}</h1>
          <p style={{ margin: "0 0 18px", fontSize: 15, lineHeight: 1.45 }}>
            {donePublished ? t("admin.wizard.savedPublishedBody") : t("admin.wizard.savedDraftBody")}
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {doneEventId !== "ok" && (
              <Link
                to={`/${uiLang}/admin/events?edit=${doneEventId}`}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "14px 12px",
                  borderRadius: 12,
                  background: "var(--admin-primary, #1b1730)",
                  color: "#fff",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                {t("admin.wizard.openInAdmin")}
              </Link>
            )}
            <button
              type="button"
              onClick={() => navigate(`/${uiLang}/admin/wizard`)}
              style={{
                padding: "14px 12px",
                borderRadius: 12,
                border: "2px solid rgba(27,23,48,0.2)",
                background: "#fff",
                fontWeight: 600,
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              {t("admin.wizard.backToWizardHome")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const titles = [
    t("admin.wizard.eventStepName"),
    t("admin.wizard.eventStepPlace"),
    t("admin.wizard.eventStepWhen"),
    t("admin.wizard.eventStepPhotos"),
    t("admin.wizard.eventStepDescription"),
    t("admin.wizard.eventStepReview"),
  ];

  return (
    <WizardShell
      title={titles[step] || t("admin.wizard.eventTitle")}
      stepIndex={step}
      stepCount={STEP_COUNT}
      onBack={
        step === 0
          ? () => navigate(`/${uiLang}/admin/wizard`)
          : () => setStep((s) => Math.max(0, s - 1))
      }
      onNext={
        step === STEP_COUNT - 1
          ? () => void save()
          : () => setStep((s) => Math.min(STEP_COUNT - 1, s + 1))
      }
      nextLabel={step === STEP_COUNT - 1 ? t("admin.wizard.saveDraft") : undefined}
      nextDisabled={!canNext}
      busy={busy}
    >
      {step === 0 && (
        <div style={wizardCard}>
          <label style={wizardLabel} htmlFor="wiz-event-title">
            {t("admin.wizard.eventName")}
          </label>
          <AiPostfixField
            draft={{
              kind: "event",
              field: "title",
              lang: contentLang,
              siteId: eventSiteId,
              placeId: placeId || undefined,
              name: title,
              contextHints: eventDraftHints,
            }}
            value={title}
            onApply={setTitle}
          >
            <input
              id="wiz-event-title"
              style={wizardInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("admin.wizard.eventNamePlaceholder")}
              autoComplete="off"
              autoFocus
            />
          </AiPostfixField>
        </div>
      )}

      {step === 1 && (
        <div style={wizardCard}>
          <label style={wizardLabel} htmlFor="wiz-place">
            {t("admin.wizard.linkedPlace")}
          </label>
          <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.4, opacity: 0.8 }}>
            {t("admin.wizard.linkedPlaceHint")}
          </p>
          <select
            id="wiz-place"
            style={wizardSelect}
            value={placeId}
            onChange={(e) => setPlaceId(e.target.value)}
          >
            <option value="">{t("admin.wizard.selectPlace")}</option>
            {placeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {!selectedSiteId && (
            <p style={{ margin: "12px 0 0", fontSize: 13, color: "#b91c1c" }}>
              {t("admin.wizard.needSite")}
            </p>
          )}
        </div>
      )}

      {step === 2 && (
        <div style={wizardCard}>
          <label style={wizardLabel} htmlFor="wiz-start">
            {t("admin.wizard.startDate")}
          </label>
          <input
            id="wiz-start"
            type="datetime-local"
            style={{ ...wizardInput, marginBottom: 14 }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <label style={wizardLabel} htmlFor="wiz-end">
            {t("admin.wizard.endDate")}
          </label>
          <input
            id="wiz-end"
            type="datetime-local"
            style={wizardInput}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      )}

      {step === 3 && <WizardPhotoStep photos={photos} onChange={setPhotos} folder="wizard/events" />}

      {step === 4 && (
        <div style={wizardCard}>
          <label style={wizardLabel} htmlFor="wiz-event-desc">
            {t("admin.wizard.shortDescription")}
          </label>
          <AiPostfixField
            draft={{
              kind: "event",
              field: "shortDescription",
              lang: contentLang,
              siteId: eventSiteId,
              placeId: placeId || undefined,
              name: title,
              contextHints: eventDraftHints,
            }}
            value={description}
            onApply={(text) => setDescription(stripHtml(text))}
            variant="textarea"
          >
            <textarea
              id="wiz-event-desc"
              style={wizardTextarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("admin.wizard.shortDescriptionPlaceholder")}
            />
          </AiPostfixField>
        </div>
      )}

      {step === 5 && (
        <div style={wizardCard}>
          <dl style={{ margin: 0, display: "grid", gap: 10, fontSize: 15 }}>
            <div>
              <dt style={{ opacity: 0.65, fontSize: 12 }}>{t("admin.wizard.eventName")}</dt>
              <dd style={{ margin: 0, fontWeight: 600 }}>{title || "—"}</dd>
            </div>
            <div>
              <dt style={{ opacity: 0.65, fontSize: 12 }}>{t("admin.wizard.linkedPlace")}</dt>
              <dd style={{ margin: 0 }}>{placeLabel}</dd>
            </div>
            <div>
              <dt style={{ opacity: 0.65, fontSize: 12 }}>{t("admin.wizard.startDate")}</dt>
              <dd style={{ margin: 0 }}>{startDate || "—"}</dd>
            </div>
            <div>
              <dt style={{ opacity: 0.65, fontSize: 12 }}>{t("admin.wizard.photos")}</dt>
              <dd style={{ margin: 0 }}>{photos.length}</dd>
            </div>
          </dl>
          <WizardPublishChoice
            canPublish={canPublish}
            value={publishMode}
            onChange={setPublishMode}
          />
        </div>
      )}
    </WizardShell>
  );
}
