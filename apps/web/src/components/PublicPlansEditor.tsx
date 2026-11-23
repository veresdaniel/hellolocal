import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import languages from "../i18n/languages.json";
import { getPlatformCurrencies, type PlatformCurrency } from "../api/admin.api";
import { getUiMessages } from "../api/uiCopy.api";
import { isUiLang, LANG_VALUES, type Lang } from "../types/enums";
import {
  PLAN_CARD_FIELDS,
  PLAN_COPY_KEY_PREFIX,
  PLAN_EDITOR_CHROME,
  PLAN_FIELD_LABEL_FIELDS,
  PLAN_MUNICIPAL_FIELDS,
  PLAN_SECTION_FIELDS,
  PLAN_SHARED_LINE_FIELDS,
  PUBLIC_PLAN_IDS,
  applyPlanCopyMessages,
  emptyPlanCopyDrafts,
  resolvePlanEnabled,
  resolvePublicPlans,
  type PlanCopyDrafts,
  type PlanCopyField,
  type PublicPlanId,
  type PublicPlanNumbers,
  type SwitchablePlanId,
} from "./publicPlans";
import "../styles/plan-picker.css";

const LIMIT_FIELDS: Array<"places" | "events" | "languages"> = ["places", "events", "languages"];

function TextField({
  item,
  uiLang,
  value,
  hint,
  onChange,
}: {
  item: PlanCopyField;
  uiLang: Lang;
  value: string;
  hint?: string;
  onChange: (next: string) => void;
}) {
  const label = item.label[isUiLang(uiLang) ? uiLang : "hu"];
  return (
    <label className="public-plans-editor__text">
      {label}
      {hint ? <span className="public-plans-editor__hint">{hint}</span> : null}
      {item.long ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

export function PublicPlansEditor({
  planOverrides,
  saving,
  onSave,
}: {
  planOverrides: unknown;
  saving: boolean;
  onSave: (
    plans: Record<PublicPlanId, PublicPlanNumbers & { enabled: boolean }> & {
      municipal?: { enabled: boolean };
    },
    copyDrafts: PlanCopyDrafts
  ) => Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const uiLang: Lang = isUiLang(i18n.language) ? i18n.language : "hu";
  const chrome = PLAN_EDITOR_CHROME[isUiLang(uiLang) ? uiLang : "hu"];
  const [active, setActive] = useState<Lang>(uiLang);
  const [draft, setDraft] = useState(() => resolvePublicPlans(planOverrides));
  const [enabled, setEnabled] = useState<Record<SwitchablePlanId, boolean>>(() =>
    resolvePlanEnabled(planOverrides)
  );
  const [copyDrafts, setCopyDrafts] = useState<PlanCopyDrafts>(() => emptyPlanCopyDrafts());
  const [copyLoading, setCopyLoading] = useState(true);
  const [currencies, setCurrencies] = useState<PlatformCurrency[]>([
    { code: "HUF", name: "forint", plural: "forint", symbol: "Ft" },
    { code: "EUR", name: "euro", plural: "euros", symbol: "€" },
  ]);

  useEffect(() => {
    setDraft(resolvePublicPlans(planOverrides));
    setEnabled(resolvePlanEnabled(planOverrides));
  }, [planOverrides]);

  useEffect(() => {
    let cancelled = false;
    setCopyLoading(true);
    void (async () => {
      let next = emptyPlanCopyDrafts();
      for (const code of LANG_VALUES) {
        try {
          const data = await getUiMessages(code);
          const messages: Record<string, string> = {};
          for (const entry of data.entries) {
            if (!entry.key.startsWith(PLAN_COPY_KEY_PREFIX)) continue;
            const value = (entry.value || entry.reference || "").trim();
            if (value) messages[entry.key] = value;
          }
          next = applyPlanCopyMessages(next, code, messages);
        } catch {
          /* JSON defaults already in emptyPlanCopyDrafts */
        }
      }
      try {
        const list = await getPlatformCurrencies();
        if (!cancelled && list.length) setCurrencies(list);
      } catch {
        /* keep HUF/EUR fallback */
      }
      if (!cancelled) {
        setCopyDrafts(next);
        setCopyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLimitField = (id: PublicPlanId, field: "places" | "events" | "languages", raw: string) => {
    const parsed = raw === "" ? 0 : Math.max(0, Math.round(Number(raw)));
    setDraft((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [field]: Number.isFinite(parsed) ? parsed : current[id][field],
      },
    }));
  };

  const setPrice = (id: PublicPlanId, currencyCode: string, raw: string) => {
    const parsed = raw === "" ? 0 : Number(raw);
    const amount =
      Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : 0;
    setDraft((current) => ({
      ...current,
      [id]: {
        ...current[id],
        prices: { ...current[id].prices, [currencyCode]: amount },
      },
    }));
  };

  const setCopy = (path: string, value: string) => {
    setCopyDrafts((current) => ({
      ...current,
      [active]: { ...current[active], [path]: value },
    }));
  };

  const endonym = (code: Lang) =>
    languages.languages.find((language) => language.code === code)?.endonym ?? code;

  const labelFor = (field: "places" | "events" | "languages" | "price") => {
    const path = `plans.fields.${field === "price" ? "price" : field}`;
    const legacy =
      field === "price"
        ? copyDrafts[active]?.["plans.fields.priceHuf"] || t("public.overview.plans.fields.priceHuf")
        : "";
    return (
      copyDrafts[active]?.[path] ||
      t(`public.overview.${path}`, {
        defaultValue: legacy || undefined,
      })
    );
  };

  return (
    <form
      className="public-plans-editor"
      onSubmit={(event) => {
        event.preventDefault();
        const plans = Object.fromEntries(
          PUBLIC_PLAN_IDS.map((id) => [id, { ...draft[id], enabled: enabled[id] }])
        ) as Record<PublicPlanId, PublicPlanNumbers & { enabled: boolean }> & {
          municipal?: { enabled: boolean };
        };
        plans.municipal = { enabled: enabled.municipal };
        void onSave(plans, copyDrafts);
      }}
    >
      <p className="public-plans-editor__note">{chrome.note}</p>
      <div className="public-plans-editor__langs">
        {LANG_VALUES.map((code) => (
          <button
            key={code}
            type="button"
            className={
              code === active
                ? "public-plans-editor__lang is-on"
                : "public-plans-editor__lang"
            }
            onClick={() => setActive(code)}
          >
            {endonym(code)}
          </button>
        ))}
      </div>

      {copyLoading ? (
        <p className="public-plans-editor__note">{t("public.overview.plans.saving")}</p>
      ) : (
        <>
          <div className="public-plans-editor__section">
            {PLAN_SECTION_FIELDS.map((item) => (
              <TextField
                key={item.path}
                item={item}
                uiLang={uiLang}
                value={copyDrafts[active]?.[item.path] ?? ""}
                onChange={(value) => setCopy(item.path, value)}
              />
            ))}
          </div>

          <div className="public-plans-editor__section">
            <h4>{chrome.labelsTitle}</h4>
            <div className="public-plans-editor__labels">
              {PLAN_FIELD_LABEL_FIELDS.map((item) => (
                <TextField
                  key={item.path}
                  item={item}
                  uiLang={uiLang}
                  value={copyDrafts[active]?.[item.path] ?? ""}
                  onChange={(value) => setCopy(item.path, value)}
                />
              ))}
            </div>
          </div>

          <div className="public-plans-editor__grid">
            {PUBLIC_PLAN_IDS.map((id) => (
              <fieldset className="public-plans-editor__card" key={id}>
                <label className="public-plans-editor__toggle">
                  <input
                    type="checkbox"
                    checked={enabled[id]}
                    onChange={(event) =>
                      setEnabled((current) => ({ ...current, [id]: event.target.checked }))
                    }
                  />
                  {t("public.overview.plans.visible")}
                </label>
                {PLAN_CARD_FIELDS[id].map((item) => (
                  <TextField
                    key={item.path}
                    item={item}
                    uiLang={uiLang}
                    value={copyDrafts[active]?.[item.path] ?? ""}
                    onChange={(value) => setCopy(item.path, value)}
                  />
                ))}
                {currencies.map((currency) => (
                  <label key={`${id}-${currency.code}`}>
                    {labelFor("price")} ({currency.code}
                    {currency.symbol ? ` ${currency.symbol}` : ""})
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={draft[id].prices[currency.code] ?? 0}
                      onChange={(event) => setPrice(id, currency.code, event.target.value)}
                    />
                  </label>
                ))}
                {LIMIT_FIELDS.map((field) => (
                  <label key={field}>
                    {labelFor(field)}
                    <input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={draft[id][field]}
                      onChange={(event) => setLimitField(id, field, event.target.value)}
                    />
                  </label>
                ))}
              </fieldset>
            ))}
          </div>

          <div className="public-plans-editor__section">
            <h4>{chrome.municipalTitle}</h4>
            <label className="public-plans-editor__toggle">
              <input
                type="checkbox"
                checked={enabled.municipal}
                onChange={(event) =>
                  setEnabled((current) => ({ ...current, municipal: event.target.checked }))
                }
              />
              {t("public.overview.plans.visible")}
            </label>
            <div className="public-plans-editor__municipal">
              {PLAN_MUNICIPAL_FIELDS.map((item) => (
                <TextField
                  key={item.path}
                  item={item}
                  uiLang={uiLang}
                  value={copyDrafts[active]?.[item.path] ?? ""}
                  onChange={(value) => setCopy(item.path, value)}
                />
              ))}
            </div>
          </div>

          <div className="public-plans-editor__section">
            <h4>{chrome.sharedTitle}</h4>
            <div className="public-plans-editor__shared">
              {PLAN_SHARED_LINE_FIELDS.map((item) => {
                const value = copyDrafts[active]?.[item.path] ?? "";
                return (
                  <TextField
                    key={item.path}
                    item={item}
                    uiLang={uiLang}
                    value={value}
                    hint={value.includes("{{count}}") ? chrome.countHint : undefined}
                    onChange={(next) => setCopy(item.path, next)}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}

      <button className="public-plans-editor__save" type="submit" disabled={saving || copyLoading}>
        {saving
          ? t("public.overview.plans.saving")
          : t("public.overview.plans.save")}
      </button>
    </form>
  );
}
