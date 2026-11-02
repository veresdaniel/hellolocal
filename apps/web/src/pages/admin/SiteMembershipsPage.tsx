import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AuthContext } from "../../contexts/AuthContext";
import { useAdminSite } from "../../contexts/useAdminSite";
import { deleteSite } from "../../api/admin.api";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { AdminDataTable } from "../../components/AdminDataTable";
import { adminReturnState } from "../../components/useAdminListState";
import { isSuperadmin } from "../../utils/roleHelpers";
import { findTranslation } from "../../utils/langHelpers";
import { regionAddress } from "../../app/urls";
import type { Lang } from "../../types/enums";
import type { Site } from "../../api/admin.api";

function regionName(site: Site, lang: Lang) {
  return (
    findTranslation(site.translations, lang)?.name ||
    findTranslation(site.translations, "hu")?.name ||
    site.slug
  );
}

export function SiteMembershipsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user ?? null;
  const { sites, isLoading, setSelectedSiteId, reloadSites } = useAdminSite();
  const userIsSuperadmin = currentUser ? isSuperadmin(currentUser.role) : false;
  usePageTitle(
    userIsSuperadmin
      ? "admin.dashboardCards.regionAndMemberships"
      : "admin.dashboardCards.regionMembershipsOnly"
  );

  const lang = (i18n.language || "hu").split("-")[0] as Lang;
  const langPrefix = `/${i18n.language || "hu"}`;
  const [deleteError, setDeleteError] = useState("");

  const openEditor = (site: Site) => {
    setSelectedSiteId(site.id);
    const tab = userIsSuperadmin ? "" : "?tab=members";
    navigate(`${langPrefix}/admin/sites/${site.id}/edit${tab}`, {
      state: adminReturnState(location.pathname, location.search),
    });
  };

  const handleDelete = async (site: Site) => {
    if (!confirm(t("admin.confirmations.deleteSite"))) return;
    try {
      setDeleteError("");
      await deleteSite(site.id);
      await reloadSites();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t("admin.errors.deleteSiteFailed"));
    }
  };

  return (
    <div className="admin-page-content">
      <AdminPageHeader
        title={
          userIsSuperadmin
            ? t("admin.dashboardCards.regionAndMemberships")
            : t("admin.dashboardCards.regionMembershipsOnly")
        }
        subtitle={t("admin.regionList.subtitle")}
        backTo={`${langPrefix}/admin`}
        showNewButton={false}
      />

      {deleteError ? (
        <p role="alert" style={{ color: "#991b1b", margin: "0 0 16px" }}>
          {deleteError}
        </p>
      ) : null}

      <AdminDataTable
        items={sites}
        getItemId={(site) => site.id}
        isLoading={isLoading}
        stateKey="regions"
        emptyMessage={t("admin.regionList.empty")}
        columns={[
          {
            key: "name",
            label: t("common.name"),
            getText: (site) => regionName(site, lang),
            render: (site) => regionName(site, lang),
          },
          {
            key: "slug",
            label: t("admin.slug"),
            getText: (site) => site.slug,
            render: (site) => site.slug,
          },
          {
            key: "status",
            label: t("admin.table.status"),
            getText: (site) => (site.isActive ? t("common.active") : t("common.inactive")),
            render: (site) => (site.isActive ? t("common.active") : t("common.inactive")),
          },
        ]}
        onView={(site) => {
          window.open(
            regionAddress({
              lang: i18n.language || "hu",
              slug: site.slug,
              primaryDomain: site.primaryDomain,
            }),
            "_blank",
            "noopener,noreferrer"
          );
        }}
        onAnalytics={(site) => {
          setSelectedSiteId(site.id);
          navigate(
            `${langPrefix}/admin/analytics/site?siteKey=${encodeURIComponent(site.slug)}`,
            { state: adminReturnState(location.pathname, location.search) }
          );
        }}
        onStatus={(site) => {
          setSelectedSiteId(site.id);
          navigate(`${langPrefix}/admin/site-status?siteId=${encodeURIComponent(site.id)}`, {
            state: adminReturnState(location.pathname, location.search),
          });
        }}
        statusLabel={t("admin.siteStatus.title")}
        onEdit={userIsSuperadmin ? openEditor : undefined}
        onDelete={userIsSuperadmin ? (site) => void handleDelete(site) : undefined}
      />
    </div>
  );
}
