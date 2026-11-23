/**
 * Admin image field: URL input + CDN upload (Cloudinary) + preview.
 */
import { useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { uploadService } from "../services/upload/uploadService";
import { useToast } from "../contexts/ToastContext";

type AdminImageFieldProps = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder: string;
  description?: string;
  placeholder?: string;
};

export function AdminImageField({
  label,
  value,
  onChange,
  folder,
  description,
  placeholder = "https://...",
}: AdminImageFieldProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: 12,
    fontSize: "clamp(15px, 3.5vw, 16px)",
    border: "1px solid #ddd",
    borderRadius: 4,
    fontFamily:
      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    boxSizing: "border-box",
  };

  return (
    <div style={{ marginBottom: 16 }}>
      {label ? (
        <label
          style={{
            display: "block",
            marginBottom: 8,
            fontWeight: 500,
            fontSize: "clamp(14px, 3.5vw, 16px)",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {label}
        </label>
      ) : null}
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setUploading(true);
          try {
            const url = await uploadService.uploadImage(file, { folder });
            onChange(url);
          } catch (error) {
            showToast(
              error instanceof Error ? error.message : t("common.error"),
              "error"
            );
          } finally {
            setUploading(false);
          }
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        style={{
          marginTop: 8,
          padding: "8px 16px",
          background: "var(--admin-primary)",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: uploading ? "not-allowed" : "pointer",
          fontWeight: 600,
          fontFamily:
            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {uploading ? t("admin.common.uploading") : t("admin.catalog.uploadImage")}
      </button>
      {value ? (
        <img
          src={value}
          alt=""
          style={{
            marginTop: 8,
            maxWidth: "100%",
            maxHeight: 200,
            borderRadius: 6,
            display: "block",
            objectFit: "cover",
          }}
        />
      ) : null}
      {description ? (
        <div
          style={{
            marginTop: 6,
            fontSize: 13,
            color: "var(--admin-muted)",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {description}
        </div>
      ) : null}
    </div>
  );
}
