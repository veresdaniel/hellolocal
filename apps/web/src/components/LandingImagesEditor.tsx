/**
 * Superadmin: per-language platform overview images (Cloudinary upload / URL).
 * Stored as AppSetting `platform.landingImages`.
 */
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AdminImageField } from "./AdminImageField";
import { languageLabel } from "../utils/langFields";
import {
  LANDING_IMAGE_SLOTS,
  parseLandingImagesJson,
  type LandingImageSlot,
  type LandingImagesByLang,
} from "../marketing/landingCmsImages";
import { getPublicUiLanguages } from "../api/uiCopy.api";
import { createAppSetting, getAppSetting } from "../api/admin.api";
import { useToast } from "../contexts/ToastContext";

const LANDING_IMAGES_KEY = "platform.landingImages";

const SLOT_LABEL: Record<LandingImageSlot, string> = {
  hero: "Hero / térkép",
  maker: "Story — kézműves",
  service: "Story — szolgáltatás",
  quiet: "Story — mellékutca",
  town: "Story — település",
  closing: "Záró kép",
  share: "Share / OG",
};

export function LandingImagesEditor() {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const [languages, setLanguages] = useState<string[]>(["hu", "en", "de"]);
  const [active, setActive] = useState("hu");
  const [drafts, setDrafts] = useState<LandingImagesByLang>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [langs, setting] = await Promise.all([
          getPublicUiLanguages().catch(() => ({ languages: ["hu", "en", "de"] })),
          getAppSetting(LANDING_IMAGES_KEY).catch(() => null),
        ]);
        if (cancelled) return;
        const codes = langs.languages?.length ? langs.languages : ["hu", "en", "de"];
        setLanguages(codes);
        setActive(codes[0] || "hu");
        setDrafts(parseLandingImagesJson(setting?.value ?? "{}"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const uiLang = (i18n.language || "hu").split("-")[0];

  const slots = useMemo(() => LANDING_IMAGE_SLOTS, []);

  const setSlot = (slot: LandingImageSlot, url: string) => {
    setDrafts((current) => ({
      ...current,
      [active]: {
        ...(current[active] || {}),
        [slot]: url,
      },
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const clean: LandingImagesByLang = {};
      for (const [lang, row] of Object.entries(drafts)) {
        const next: Partial<Record<LandingImageSlot, string>> = {};
        for (const slot of LANDING_IMAGE_SLOTS) {
          const value = row?.[slot]?.trim();
          if (value) next[slot] = value;
        }
        if (Object.keys(next).length) clean[lang] = next;
      }
      await createAppSetting({
        key: LANDING_IMAGES_KEY,
        value: JSON.stringify(clean),
        type: "json",
        description: "Platform overview images per UI language (Cloudinary URLs)",
      });
      setDrafts(clean);
      showToast(t("common.saved", { defaultValue: "Mentve" }), "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p style={{ color: "var(--admin-muted)" }}>{t("common.loading")}</p>;
  }

  return (
    <div>
      <p style={{ margin: "0 0 16px", color: "var(--admin-muted)", lineHeight: 1.5 }}>
        Nyelvfüggő hero / story / share képek a platform áttekintőhöz. Üres mező = beépített
        /marketing tartalék. Feltöltés Cloudinary-re (on-the-fly WebP a megjelenítéskor).
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {languages.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setActive(code)}
            style={{
              minHeight: 36,
              padding: "0 14px",
              borderRadius: 999,
              border: code === active ? "none" : "1px solid var(--admin-border-subtle)",
              background: code === active ? "var(--admin-primary)" : "transparent",
              color: code === active ? "var(--admin-on-primary)" : "inherit",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {languageLabel(code, uiLang)}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {slots.map((slot) => (
          <AdminImageField
            key={`${active}-${slot}`}
            label={SLOT_LABEL[slot]}
            value={drafts[active]?.[slot] || ""}
            onChange={(url) => setSlot(slot, url)}
            folder={`platform/landing/${active}/${slot}`}
            placeholder="https://res.cloudinary.com/…"
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        style={{
          marginTop: 12,
          minHeight: 42,
          padding: "0 16px",
          border: 0,
          borderRadius: 999,
          background: "var(--admin-primary)",
          color: "var(--admin-on-primary)",
          fontWeight: 600,
          cursor: saving ? "wait" : "pointer",
        }}
      >
        {saving ? t("common.loading") : t("common.save", { defaultValue: "Mentés" })}
      </button>
    </div>
  );
}
