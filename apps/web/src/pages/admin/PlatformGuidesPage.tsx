import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { TipTapEditorWithUpload } from "../../components/TipTapEditorWithUpload";
import { useToast } from "../../contexts/ToastContext";
import { isLang, type Lang } from "../../app/config";
import {
  createPlatformGuide,
  deletePlatformGuide,
  getAdminPlatformGuide,
  listAdminPlatformGuides,
  updatePlatformGuide,
  type PlatformGuideTranslation,
} from "../../api/platformGuides";

const LANGS: Lang[] = ["hu", "en", "de"];

const EMPTY_TRANSLATION = (lang: Lang): PlatformGuideTranslation => ({
  lang,
  title: "",
  body: "",
  imageUrl: "",
  imageCaption: "",
  seoTitle: "",
  seoDescription: "",
});

export function PlatformGuidesPage() {
  const { t } = useTranslation();
  const { lang: routeLang, id } = useParams<{ lang: string; id?: string }>();
  const lang: Lang = isLang(routeLang) ? routeLang : "hu";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const creating = id === "new";
  const editing = Boolean(id && id !== "new");

  const list = useQuery({
    queryKey: ["admin-platform-guides"],
    queryFn: listAdminPlatformGuides,
  });
  const detail = useQuery({
    queryKey: ["admin-platform-guide", id],
    queryFn: () => getAdminPlatformGuide(id || ""),
    enabled: editing,
  });

  const [editLang, setEditLang] = useState<Lang>("hu");
  const [slug, setSlug] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isPublished, setIsPublished] = useState(true);
  const [translations, setTranslations] = useState<Record<Lang, PlatformGuideTranslation>>({
    hu: EMPTY_TRANSLATION("hu"),
    en: EMPTY_TRANSLATION("en"),
    de: EMPTY_TRANSLATION("de"),
  });

  useEffect(() => {
    if (!detail.data) return;
    setSlug(detail.data.slug);
    setSortOrder(detail.data.sortOrder);
    setIsPublished(detail.data.isPublished);
    setTranslations((prev) => {
      const next = { ...prev };
      for (const code of LANGS) {
        const row = detail.data?.translations.find((item) => item.lang === code);
        next[code] = row
          ? {
              ...row,
              imageUrl: row.imageUrl || "",
              imageCaption: row.imageCaption || "",
              seoTitle: row.seoTitle || "",
              seoDescription: row.seoDescription || "",
            }
          : EMPTY_TRANSLATION(code);
      }
      return next;
    });
  }, [detail.data]);

  const payload = useMemo(
    () => ({
      slug,
      sortOrder,
      isPublished,
      translations: LANGS.map((code) => translations[code]).filter((row) => row.title.trim() && row.body.trim()),
    }),
    [slug, sortOrder, isPublished, translations]
  );

  const save = useMutation({
    mutationFn: async () => {
      if (creating) return createPlatformGuide(payload);
      return updatePlatformGuide(id || "", payload);
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-platform-guides"] });
      showToast(t("admin.saved", { defaultValue: "Mentve" }), "success");
      if (creating) navigate(`/${lang}/admin/platform-guides/${saved.id}`);
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const remove = useMutation({
    mutationFn: () => deletePlatformGuide(id || ""),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-platform-guides"] });
      navigate(`/${lang}/admin/platform-guides`);
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const current = translations[editLang];
  const patch = (partial: Partial<PlatformGuideTranslation>) => {
    setTranslations((prev) => ({ ...prev, [editLang]: { ...prev[editLang], ...partial } }));
  };

  if (!creating && !editing) {
    return (
      <div className="admin-page-content">
        <AdminPageHeader
          title={t("admin.platformGuides")}
          subtitle={t("admin.platformGuidesHint")}
          newButtonLabel={t("admin.new", { defaultValue: "Új" })}
          onNewClick={() => navigate(`/${lang}/admin/platform-guides/new`)}
        />
        {list.isLoading ? <p>…</p> : null}
        <ul className="guide-admin__list">
          {(list.data ?? []).map((guide) => {
            const title = guide.translations.find((row) => row.lang === lang)?.title || guide.slug;
            return (
              <li key={guide.id}>
                <button type="button" onClick={() => navigate(`/${lang}/admin/platform-guides/${guide.id}`)}>
                  <strong>{title}</strong>
                  <span>/{guide.slug}</span>
                  {!guide.isPublished ? <em>rejtett</em> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="admin-page-content">
      <AdminPageHeader
        title={creating ? t("admin.platformGuides") : slug || t("admin.platformGuides")}
        subtitle={t("admin.platformGuidesHint")}
        isCreatingOrEditing
        showNewButton={false}
        onSave={() => save.mutate()}
        saveLabel={save.isPending ? "…" : t("admin.save", { defaultValue: "Mentés" })}
        onCancel={() => navigate(`/${lang}/admin/platform-guides`)}
      />
      <div className="guide-admin__form">
        <label>
          Slug
          <input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="google-terkep" />
        </label>
        <label>
          {t("admin.sortOrder", { defaultValue: "Sorrend" })}
          <input
            type="number"
            value={sortOrder}
            onChange={(event) => setSortOrder(Number(event.target.value))}
          />
        </label>
        <label className="guide-admin__check">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(event) => setIsPublished(event.target.checked)}
          />
          {t("admin.published", { defaultValue: "Publikus" })}
        </label>
        <div className="guide-admin__langs" role="tablist">
          {LANGS.map((code) => (
            <button
              key={code}
              type="button"
              role="tab"
              aria-selected={editLang === code}
              className={editLang === code ? "is-on" : ""}
              onClick={() => setEditLang(code)}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
        <label>
          {t("admin.title", { defaultValue: "Cím" })}
          <input value={current.title} onChange={(event) => patch({ title: event.target.value })} />
        </label>
        <label>
          {t("admin.seoTitle", { defaultValue: "SEO cím" })}
          <input value={current.seoTitle || ""} onChange={(event) => patch({ seoTitle: event.target.value })} />
        </label>
        <label>
          {t("admin.seoDescription", { defaultValue: "SEO leírás" })}
          <textarea
            rows={3}
            value={current.seoDescription || ""}
            onChange={(event) => patch({ seoDescription: event.target.value })}
          />
        </label>
        <label>
          {t("admin.image", { defaultValue: "Kép a szövegben" })}
          <input
            value={current.imageUrl || ""}
            onChange={(event) => patch({ imageUrl: event.target.value })}
            placeholder="/marketing/map-szeged.jpg"
          />
        </label>
        <label>
          {t("admin.caption", { defaultValue: "Képaláírás" })}
          <input
            value={current.imageCaption || ""}
            onChange={(event) => patch({ imageCaption: event.target.value })}
          />
        </label>
        <div>
          <p>{t("admin.content", { defaultValue: "Szöveg" })}</p>
          <TipTapEditorWithUpload
            value={current.body}
            onChange={(body) => patch({ body })}
            uploadFolder="editor/platform-guides"
            autoHeight
            minHeight={220}
            maxHeight={560}
          />
        </div>
        {editing ? (
          <button type="button" className="guide-admin__delete" onClick={() => remove.mutate()}>
            {t("admin.delete", { defaultValue: "Törlés" })}
          </button>
        ) : null}
      </div>
    </div>
  );
}
