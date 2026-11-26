import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useAuth } from "../../contexts/AuthContext";
import { useAdminSite } from "../../contexts/useAdminSite";
import { useToast } from "../../contexts/ToastContext";
import { DEFAULT_LANG, type Lang, isLang } from "../../app/config";
import {
  createGallery,
  createPlace,
  getCategories,
  getTowns,
} from "../../api/admin.api";
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

type TownRow = {
  id: string;
  siteId?: string | null;
  translations?: Array<{ lang?: string; name?: string | null }>;
};

export function PlaceWizard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { selectedSiteId } = useAdminSite();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const isMobile = useIsMobileAdmin();
  usePageTitle("admin.wizard.placeTitle");

  const uiLang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;
  const contentLang = (i18n.language || uiLang).split("-")[0] || uiLang;
  // New places default to free — only superadmin may publish immediately.
  const canPublish = canChooseWizardPublish(user?.role, null);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [townId, setTownId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [photos, setPhotos] = useState<WizardPhoto[]>([]);
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [publishMode, setPublishMode] = useState<WizardPublishMode>("draft");
  const [towns, setTowns] = useState<TownRow[]>([]);
  const [categories, setCategories] = useState<
    Array<{ id: string; translations?: Array<{ lang?: string; name?: string | null }> }>
  >([]);
  const [busy, setBusy] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [donePlaceId, setDonePlaceId] = useState<string | null>(null);
  const [donePublished, setDonePublished] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const townRes = await getTowns(selectedSiteId || undefined, 1, 500);
        const townList = Array.isArray(townRes) ? townRes : townRes.towns || [];
        if (!cancelled) setTowns(townList);
      } catch {
        if (!cancelled) setTowns([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedSiteId]);

  useEffect(() => {
    const town = towns.find((row) => row.id === townId);
    const siteId = town?.siteId || selectedSiteId;
    if (!siteId) {
      setCategories([]);
      return;
    }
    let cancelled = false;
    void getCategories(siteId, 1, 500)
      .then((res) => {
        const list = res.categories || [];
        if (!cancelled) setCategories(list);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [townId, towns, selectedSiteId]);

  const townOptions = useMemo(
    () => optionsFromTranslations(towns, contentLang),
    [towns, contentLang]
  );
  const categoryOptions = useMemo(
    () => optionsFromTranslations(categories, contentLang),
    [categories, contentLang]
  );

  const townLabel = townOptions.find((o) => o.value === townId)?.label || "—";
  const categoryLabel = categoryOptions.find((o) => o.value === categoryId)?.label || "—";

  const canNext = (() => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return Boolean(townId && categoryId);
    return true;
  })();

  const useGps = () => {
    if (!navigator.geolocation) {
      showToast(t("admin.wizard.gpsUnsupported"), "error");
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
        setGpsBusy(false);
      },
      () => {
        showToast(t("admin.wizard.gpsFailed"), "error");
        setGpsBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const save = async () => {
    const town = towns.find((row) => row.id === townId);
    const siteId = town?.siteId || selectedSiteId;
    if (!siteId || !townId || !categoryId || !name.trim()) {
      showToast(t("admin.wizard.missingRequired"), "error");
      return;
    }

    setBusy(true);
    try {
      const publish = canPublish && publishMode === "publish";
      const heroImage = photos[0]?.url || null;
      const shortDescription = plainToHtml(description) || null;
      const place = await createPlace({
        siteId,
        townId,
        categoryId,
        translations: [
          {
            lang: contentLang,
            name: name.trim(),
            shortDescription,
            description: shortDescription,
          },
        ],
        heroImage,
        cardImage: heroImage,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        isActive: publish,
        isCrawlable: publish,
      });

      const placeId = place?.id as string | undefined;
      if (placeId && photos.length > 1) {
        await createGallery({
          siteId,
          placeId,
          name: name.trim(),
          images: photos.slice(1).map((p) => ({ id: p.id, src: p.url, alt: name.trim() })),
          isActive: true,
        });
      }

      notifyEntityChanged("places");
      setDonePublished(publish);
      setDonePlaceId(placeId || "ok");
      setStep(STEP_COUNT);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.createPlaceFailed"), "error");
    } finally {
      setBusy(false);
    }
  };

  if (!isMobile) {
    return <Navigate to={`/${uiLang}/admin/places?new=true`} replace />;
  }

  if (donePlaceId) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px" }}>
        <div style={wizardCard}>
          <h1 style={{ margin: "0 0 10px", fontSize: 22 }}>{t("admin.wizard.savedTitle")}</h1>
          <p style={{ margin: "0 0 18px", fontSize: 15, lineHeight: 1.45 }}>
            {donePublished ? t("admin.wizard.savedPublishedBody") : t("admin.wizard.savedDraftBody")}
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {donePlaceId !== "ok" && (
              <Link
                to={`/${uiLang}/admin/places?edit=${donePlaceId}`}
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
    t("admin.wizard.placeStepName"),
    t("admin.wizard.placeStepTownCategory"),
    t("admin.wizard.placeStepPhotos"),
    t("admin.wizard.placeStepDescription"),
    t("admin.wizard.placeStepLocation"),
    t("admin.wizard.placeStepReview"),
  ];

  return (
    <WizardShell
      title={titles[step] || t("admin.wizard.placeTitle")}
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
          <label style={wizardLabel} htmlFor="wiz-place-name">
            {t("admin.wizard.name")}
          </label>
          <AiPostfixField
            draft={{
              kind: "place",
              field: "name",
              lang: contentLang,
              siteId: selectedSiteId || undefined,
              name,
              categoryId: categoryId || undefined,
              townId: townId || undefined,
            }}
            value={name}
            onApply={setName}
          >
            <input
              id="wiz-place-name"
              style={wizardInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("admin.wizard.namePlaceholder")}
              autoComplete="off"
              autoFocus
            />
          </AiPostfixField>
        </div>
      )}

      {step === 1 && (
        <div style={wizardCard}>
          <label style={wizardLabel} htmlFor="wiz-town">
            {t("admin.wizard.town")}
          </label>
          <select
            id="wiz-town"
            style={{ ...wizardSelect, marginBottom: 16 }}
            value={townId}
            onChange={(e) => {
              setTownId(e.target.value);
              setCategoryId("");
            }}
          >
            <option value="">{t("admin.wizard.selectTown")}</option>
            {townOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <label style={wizardLabel} htmlFor="wiz-category">
            {t("admin.wizard.category")}
          </label>
          <select
            id="wiz-category"
            style={wizardSelect}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={!townId}
          >
            <option value="">{t("admin.wizard.selectCategory")}</option>
            {categoryOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {step === 2 && <WizardPhotoStep photos={photos} onChange={setPhotos} folder="wizard/places" />}

      {step === 3 && (
        <div style={wizardCard}>
          <label style={wizardLabel} htmlFor="wiz-desc">
            {t("admin.wizard.shortDescription")}
          </label>
          <AiPostfixField
            draft={{
              kind: "place",
              field: "shortDescription",
              lang: contentLang,
              siteId:
                towns.find((row) => row.id === townId)?.siteId ||
                selectedSiteId ||
                undefined,
              name,
              categoryId: categoryId || undefined,
              townId: townId || undefined,
            }}
            value={description}
            onApply={(text) => setDescription(stripHtml(text))}
            variant="textarea"
          >
            <textarea
              id="wiz-desc"
              style={wizardTextarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("admin.wizard.shortDescriptionPlaceholder")}
            />
          </AiPostfixField>
        </div>
      )}

      {step === 4 && (
        <div style={wizardCard}>
          <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.45, opacity: 0.85 }}>
            {t("admin.wizard.locationHint")}
          </p>
          <button
            type="button"
            onClick={useGps}
            disabled={gpsBusy}
            style={{
              width: "100%",
              minHeight: 48,
              marginBottom: 14,
              borderRadius: 12,
              border: "none",
              background: "var(--admin-primary, #1b1730)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            {gpsBusy ? t("admin.wizard.gpsLocating") : t("admin.wizard.useGps")}
          </button>
          <label style={wizardLabel} htmlFor="wiz-lat">
            {t("admin.wizard.lat")}
          </label>
          <input
            id="wiz-lat"
            style={{ ...wizardInput, marginBottom: 12 }}
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            inputMode="decimal"
            placeholder="47.48"
          />
          <label style={wizardLabel} htmlFor="wiz-lng">
            {t("admin.wizard.lng")}
          </label>
          <input
            id="wiz-lng"
            style={wizardInput}
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            inputMode="decimal"
            placeholder="18.75"
          />
        </div>
      )}

      {step === 5 && (
        <div style={wizardCard}>
          <dl style={{ margin: 0, display: "grid", gap: 10, fontSize: 15 }}>
            <div>
              <dt style={{ opacity: 0.65, fontSize: 12 }}>{t("admin.wizard.name")}</dt>
              <dd style={{ margin: 0, fontWeight: 600 }}>{name || "—"}</dd>
            </div>
            <div>
              <dt style={{ opacity: 0.65, fontSize: 12 }}>{t("admin.wizard.town")}</dt>
              <dd style={{ margin: 0 }}>{townLabel}</dd>
            </div>
            <div>
              <dt style={{ opacity: 0.65, fontSize: 12 }}>{t("admin.wizard.category")}</dt>
              <dd style={{ margin: 0 }}>{categoryLabel}</dd>
            </div>
            <div>
              <dt style={{ opacity: 0.65, fontSize: 12 }}>{t("admin.wizard.photos")}</dt>
              <dd style={{ margin: 0 }}>{photos.length}</dd>
            </div>
            <div>
              <dt style={{ opacity: 0.65, fontSize: 12 }}>{t("admin.wizard.location")}</dt>
              <dd style={{ margin: 0 }}>
                {lat && lng ? `${lat}, ${lng}` : t("admin.wizard.noLocation")}
              </dd>
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
