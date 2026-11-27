/**
 * Admin image field: URL input + CDN upload (Cloudinary) + preview.
 */
import { useRef, useState } from "react";
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

  return (
    <div className="admin-field">
      {label ? <label className="admin-field__label">{label}</label> : null}
      <input
        type="url"
        className="admin-field__control admin-field__control--full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setUploading(true);
          try {
            const url = await uploadService.uploadImage(file, { folder });
            onChange(url);
          } catch (error) {
            showToast(error instanceof Error ? error.message : t("common.error"), "error");
          } finally {
            setUploading(false);
          }
        }}
      />
      <button
        type="button"
        className="admin-btn admin-btn--primary admin-image-field__upload"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
      >
        {uploading ? t("admin.common.uploading") : t("admin.catalog.uploadImage")}
      </button>
      {value ? <img className="admin-image-field__preview" src={value} alt="" /> : null}
      {description ? <div className="admin-image-field__hint">{description}</div> : null}
    </div>
  );
}
