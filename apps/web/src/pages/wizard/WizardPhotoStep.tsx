import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { uploadService } from "../../services/upload/uploadService";
import { wizardCard, wizardLabel, wizardPrimaryBtn, wizardSecondaryBtn } from "./wizardStyles";

export type WizardPhoto = {
  id: string;
  url: string;
};

type WizardPhotoStepProps = {
  photos: WizardPhoto[];
  onChange: (photos: WizardPhoto[]) => void;
  folder?: string;
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function WizardPhotoStep({
  photos,
  onChange,
  folder = "wizard",
}: WizardPhotoStepProps) {
  const { t } = useTranslation();
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    setUploading(true);
    try {
      const next = [...photos];
      for (const file of Array.from(files)) {
        // uploadService optimizes (WebP + resize) globally before CDN upload
        const url = await uploadService.uploadImage(file, { folder });
        next.push({ id: newId(), url });
      }
      onChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.wizard.uploadFailed"));
    } finally {
      setUploading(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (libraryRef.current) libraryRef.current.value = "";
    }
  };

  const removeAt = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div style={wizardCard}>
      <label style={wizardLabel}>{t("admin.wizard.photos")}</label>
      <p style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.45, opacity: 0.8 }}>
        {t("admin.wizard.photosHint")}
      </p>

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <button
          type="button"
          style={{ ...wizardPrimaryBtn, fontSize: 15 }}
          disabled={uploading}
          onClick={() => cameraRef.current?.click()}
        >
          {t("admin.wizard.takePhoto")}
        </button>
        <button
          type="button"
          style={{ ...wizardSecondaryBtn, fontSize: 15 }}
          disabled={uploading}
          onClick={() => libraryRef.current?.click()}
        >
          {t("admin.wizard.fromLibrary")}
        </button>
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {uploading && (
        <p style={{ margin: "0 0 12px", fontSize: 14 }}>{t("admin.wizard.uploading")}</p>
      )}
      {error && (
        <p style={{ margin: "0 0 12px", fontSize: 14, color: "#b91c1c" }} role="alert">
          {error}
        </p>
      )}

      {photos.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
          }}
        >
          {photos.map((photo, index) => (
            <div key={photo.id} style={{ position: "relative" }}>
              <img
                src={photo.url}
                alt=""
                style={{
                  width: "100%",
                  aspectRatio: "1",
                  objectFit: "cover",
                  borderRadius: 10,
                  display: "block",
                  border: index === 0 ? "2px solid var(--admin-primary, #1b1730)" : "none",
                }}
              />
              {index === 0 && (
                <span
                  style={{
                    position: "absolute",
                    left: 4,
                    bottom: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    background: "rgba(27,23,48,0.85)",
                    color: "#fff",
                    padding: "2px 6px",
                    borderRadius: 6,
                  }}
                >
                  {t("admin.wizard.heroBadge")}
                </span>
              )}
              <button
                type="button"
                aria-label={t("admin.wizard.removePhoto")}
                onClick={() => removeAt(index)}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 28,
                  height: 28,
                  borderRadius: 99,
                  border: "none",
                  background: "rgba(0,0,0,0.65)",
                  color: "#fff",
                  fontSize: 16,
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
