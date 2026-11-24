import { useContext, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { AuthContext } from "../../contexts/AuthContext";
import { DEFAULT_LANG, type Lang, isLang } from "../../app/config";
import { isSuperadmin } from "../../utils/roleHelpers";
import type { UserRole } from "../../types/enums";

type ContentKind = "place" | "event" | "collection";

type TypeCard = {
  kind: ContentKind;
  title: string;
  description: string;
  path: string;
};

/**
 * One-step content-type picker. Navigates to the existing create screen for that type.
 */
export function NewContentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const auth = useContext(AuthContext);
  const userRole = (auth?.user?.role ?? null) as UserRole | null;
  const userIsSuperadmin = userRole ? isSuperadmin(userRole) : false;
  usePageTitle("admin.newContent.title");

  const currentLang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;
  const adminPath = (sub: string) => `/${currentLang}/admin${sub}`;

  const cards = useMemo((): TypeCard[] => {
    const list: TypeCard[] = [
      {
        kind: "place",
        title: t("admin.newContent.place"),
        description: t("admin.newContent.placeDesc"),
        path: `${adminPath("/places")}?new=true&from=new-content`,
      },
      {
        kind: "event",
        title: t("admin.newContent.event"),
        description: t("admin.newContent.eventDesc"),
        path: `${adminPath("/events")}?new=true&from=new-content`,
      },
    ];
    if (userIsSuperadmin) {
      list.push({
        kind: "collection",
        title: t("admin.newContent.collection"),
        description: t("admin.newContent.collectionDesc"),
        path: `${adminPath("/collections/new")}?from=new-content`,
      });
    }
    return list;
  }, [currentLang, t, userIsSuperadmin]);

  return (
    <div>
      <AdminPageHeader
        title={t("admin.newContent.title")}
        subtitle={t("admin.newContent.lead")}
        showNewButton={false}
        backTo={adminPath("")}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))",
          gap: 16,
          marginTop: 8,
        }}
      >
        {cards.map((card) => (
          <button
            key={card.kind}
            type="button"
            onClick={() => navigate(card.path)}
            style={{
              textAlign: "left",
              padding: "20px 18px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.92)",
              color: "var(--admin-primary, #1b1730)",
              cursor: "pointer",
              fontFamily: "var(--admin-font)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>{card.title}</div>
            <div style={{ fontSize: 14, lineHeight: 1.45, opacity: 0.85 }}>{card.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
