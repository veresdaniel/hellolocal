import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiGet, apiPost, apiPut } from "../../api/client";
import { AdminAutocomplete } from "../../components/AdminAutocomplete";
import { AdminDataTable } from "../../components/AdminDataTable";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { isoCountries } from "../../utils/isoCountries";

type CountryDomain = { id: string; domain: string; isPrimary: boolean };
type CountryRegion = {
  id: string;
  slug: string;
  translations?: Array<{ lang: string; name: string }>;
};
type CountryRow = {
  id: string;
  code: string;
  domains: CountryDomain[];
  regionCount: number;
};
type CountryDetail = CountryRow & { sites: CountryRegion[] };
type DomainDraft = { key: string; domain: string; isPrimary: boolean };

export function CountriesPage() {
  const { t, i18n } = useTranslation();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const lang = (langParam || i18n.language || "hu").slice(0, 2);
  const countries = useMemo(() => isoCountries(lang), [lang]);
  const labelFor = (code: string) => countries.find((item) => item.code === code)?.label || code;

  const [rows, setRows] = useState<CountryRow[]>([]);
  const [selected, setSelected] = useState<CountryDetail | null>(null);
  const [domains, setDomains] = useState<DomainDraft[]>([]);
  const [regionName, setRegionName] = useState("");
  const [regionSlug, setRegionSlug] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async (selectId?: string) => {
    const list = await apiGet<CountryRow[]>("/admin/countries");
    setRows(list);
    const id = selectId || selected?.id;
    if (!id) return;
    const detail = await apiGet<CountryDetail>(`/admin/countries/${id}`);
    setSelected(detail);
    setDomains(draftsFrom(detail.domains));
  };

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  const open = async (id: string) => {
    const detail = await apiGet<CountryDetail>(`/admin/countries/${id}`);
    setSelected(detail);
    setDomains(draftsFrom(detail.domains));
    setAdding(false);
  };

  const addCountry = async (code: string) => {
    setError("");
    try {
      const created = await apiPost<CountryRow>("/admin/countries", {
        slug: code.toLowerCase(),
        code,
        translations: [],
      });
      await load(created.id);
      setAdding(false);
    } catch (err) {
      const list = await apiGet<CountryRow[]>("/admin/countries").catch(() => rows);
      setRows(list);
      const existing = list.find((row) => row.code === code);
      if (existing) {
        await open(existing.id);
        setAdding(false);
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const saveDomains = async () => {
    if (!selected) return;
    setError("");
    const filled = domains.filter((row) => row.domain.trim());
    const withPrimary = filled.some((row) => row.isPrimary)
      ? filled
      : filled.map((row, index) => ({ ...row, isPrimary: index === 0 }));
    try {
      await apiPut(`/admin/countries/${selected.id}/domains`, {
        domains: withPrimary.map((row) => ({ domain: row.domain.trim(), isPrimary: row.isPrimary })),
      });
      await open(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const addRegion = async () => {
    if (!selected) return;
    setError("");
    try {
      await apiPost(`/admin/countries/${selected.id}/regions`, {
        name: regionName.trim(),
        slug: regionSlug.trim(),
      });
      setRegionName("");
      setRegionSlug("");
      await open(selected.id);
      await load(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="admin-page-content">
      <AdminPageHeader
        title={t("admin.countriesPage.title")}
        subtitle={t("admin.countriesPage.hint")}
        newButtonLabel={t("admin.countriesPage.add")}
        onNewClick={() => {
          setAdding(true);
          setSelected(null);
        }}
        showNewButton={!adding && !selected}
        isCreatingOrEditing={adding || !!selected}
        onCancel={() => {
          setAdding(false);
          setSelected(null);
        }}
      />
      {error ? (
        <p className="admin-section-card" role="alert" style={{ color: "#991b1b", marginBottom: 16 }}>
          {error}
        </p>
      ) : null}
      {adding ? (
        <section className="admin-section-card" style={{ marginBottom: 24, maxWidth: 480 }}>
          <h2 className="admin-section-card__title">{t("admin.countriesPage.add")}</h2>
          <AdminAutocomplete
            options={countries.map((item) => ({ value: item.code, label: item.label }))}
            value=""
            onChange={(code) => void addCountry(code)}
            placeholder={t("admin.siteEdit.domain.countryPlaceholder")}
            emptyLabel={t("admin.siteEdit.domain.countryEmpty")}
          />
        </section>
      ) : null}
      {selected ? (
        <section className="admin-section-card">
          <h2 className="admin-section-card__title">{labelFor(selected.code)}</h2>
          <h3 className="admin-field__label">{t("admin.siteEdit.domain.countryDomains")}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
            {domains.map((row) => (
              <div key={row.key} className="admin-row">
                <input
                  className="admin-field__control"
                  value={row.domain}
                  placeholder="orszag.hu"
                  onChange={(event) =>
                    setDomains((current) =>
                      current.map((item) =>
                        item.key === row.key ? { ...item, domain: event.target.value } : item
                      )
                    )
                  }
                  style={{ flex: "1 1 240px", maxWidth: 420 }}
                />
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 15, fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="country-primary"
                    checked={row.isPrimary}
                    onChange={() =>
                      setDomains((current) => current.map((item) => ({ ...item, isPrimary: item.key === row.key })))
                    }
                  />
                  {t("admin.siteEdit.domain.setAsPrimary")}
                </label>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() =>
                setDomains((current) => [
                  ...current,
                  { key: `new-${current.length}`, domain: "", isPrimary: current.length === 0 },
                ])
              }
            >
              {t("admin.siteEdit.domain.addSubdomain")}
            </button>
            <button type="button" className="admin-btn admin-btn--primary" onClick={() => void saveDomains()}>
              {t("admin.siteEdit.domain.saveCountryDomains")}
            </button>
          </div>
          <h3 className="admin-field__label">{t("admin.countriesPage.regions")}</h3>
          <ul style={{ margin: "0 0 16px", paddingLeft: 18, lineHeight: 1.6 }}>
            {(selected.sites || []).map((site) => (
              <li key={site.id}>
                <Link to={`/${lang}/admin/sites/${site.id}/edit?tab=domain`}>
                  {site.translations?.find((item) => item.lang === "hu")?.name || site.slug}
                </Link>
              </li>
            ))}
          </ul>
          <div className="admin-row">
            <input
              className="admin-field__control"
              value={regionName}
              placeholder={t("admin.siteEdit.domain.regionName")}
              onChange={(event) => setRegionName(event.target.value)}
              style={{ flex: "1 1 180px" }}
            />
            <input
              className="admin-field__control"
              value={regionSlug}
              placeholder={t("admin.siteEdit.domain.regionSlug")}
              onChange={(event) => setRegionSlug(event.target.value)}
              style={{ flex: "1 1 180px" }}
            />
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              disabled={!regionName.trim() || !regionSlug.trim()}
              onClick={() => void addRegion()}
            >
              {t("admin.siteEdit.domain.addRegion")}
            </button>
          </div>
        </section>
      ) : null}
      {!adding && !selected ? (
        <AdminDataTable
          items={rows}
          getItemId={(row) => row.id}
          stateKey="countries"
          emptyMessage={t("admin.countriesPage.empty")}
          columns={[
            {
              key: "name",
              label: t("common.name"),
              getText: (row) => labelFor(row.code),
              render: (row) => labelFor(row.code),
            },
            {
              key: "code",
              label: t("admin.countriesPage.code"),
              getText: (row) => row.code,
              render: (row) => row.code,
            },
            {
              key: "domain",
              label: t("admin.siteEdit.domain.domain"),
              getText: (row) => row.domains?.find((item) => item.isPrimary)?.domain || row.domains?.[0]?.domain || "",
              render: (row) => row.domains?.find((item) => item.isPrimary)?.domain || row.domains?.[0]?.domain || "—",
            },
            {
              key: "regions",
              label: t("admin.countriesPage.regions"),
              getText: (row) => String(row.regionCount),
              render: (row) => row.regionCount,
            },
          ]}
          onEdit={(row) => void open(row.id)}
        />
      ) : null}
    </div>
  );
}

function draftsFrom(domains: CountryDomain[] | undefined): DomainDraft[] {
  if (!domains?.length) return [{ key: "blank", domain: "", isPrimary: true }];
  return domains.map((row) => ({ key: row.id, domain: row.domain, isPrimary: row.isPrimary }));
}
