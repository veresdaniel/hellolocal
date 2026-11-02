import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import languages from "../i18n/languages.json";
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

const NUMBER_FIELDS: Array<keyof PublicPlanNumbers> = ["priceHuf", "places", "events", "languages"];

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
      if (!cancelled) {
        setCopyDrafts(next);
        setCopyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setField = (id: PublicPlanId, field: keyof PublicPlanNumbers, raw: string) => {
    const parsed = raw === "" ? 0 : Math.max(0, Math.round(Number(raw)));
    setDraft((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [field]: Number.isFinite(parsed) ? parsed : current[id][field],
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

  const labelFor = (field: keyof PublicPlanNumbers) => {
    const path = `plans.fields.${field}`;
    return copyDrafts[active]?.[path] || t(`public.overview.${path}`);
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
                {NUMBER_FIELDS.map((field) => (
                  <label key={field}>
                    {labelFor(field)}
                    <input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={draft[id][field]}
                      onChange={(event) => setField(id, field, event.target.value)}
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
