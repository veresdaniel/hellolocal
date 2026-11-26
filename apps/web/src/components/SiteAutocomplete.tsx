import { useTranslation } from "react-i18next";
import type { Site } from "../api/admin.api";
import { getHuTranslation } from "../utils/langHelpers";
import { BaseAutocomplete } from "./BaseAutocomplete";

interface SiteAutocompleteProps {
  selectedSiteIds: string[];
  onSiteIdsChange: (siteIds: string[]) => void;
  allSites: Site[];
  label?: string;
  placeholder?: string;
}

export function SiteAutocomplete({
  selectedSiteIds,
  onSiteIdsChange,
  allSites,
  label,
  placeholder,
}: SiteAutocompleteProps) {
  const { t } = useTranslation();

  const getSiteName = (site: Site) =>
    getHuTranslation(site.translations)?.name || site.slug || site.id;

  return (
    <BaseAutocomplete
      items={allSites}
      selectedItemIds={selectedSiteIds}
      onSelect={(siteId) => {
        if (!selectedSiteIds.includes(siteId)) {
          onSiteIdsChange([...selectedSiteIds, siteId]);
        }
      }}
      onRemove={(siteId) => onSiteIdsChange(selectedSiteIds.filter((id) => id !== siteId))}
      getItemName={getSiteName}
      label={label ?? t("admin.tenants")}
      placeholder={placeholder ?? t("admin.forms.addSites")}
      multiple
    />
  );
}
