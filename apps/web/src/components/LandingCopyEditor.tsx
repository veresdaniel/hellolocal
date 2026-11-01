import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { isUiLang, LANG_VALUES, type Lang } from "../types/enums";
import languages from "../i18n/languages.json";
import {
  LANDING_EDITOR_CHROME,
  LANDING_GROUPS,
  landingDefault,
  landingDrafts,
  landingOverridesFromDrafts,
  type LandingDrafts,
} from "./landingCopy";
import "../styles/landing-editor.css";

export function LandingCopyEditor({
  planOverrides,
  saving,
  onSave,
}: {
  planOverrides: unknown;
  saving: boolean;
  onSave: (
    landingCopy: ReturnType<typeof landingOverridesFromDrafts>,
    drafts: LandingDrafts
  ) => Promise<void>;
}) {
  const { i18n } = useTranslation();
  const uiLang: Lang = isUiLang(i18n.language) ? i18n.language : "hu";
  const chrome = LANDING_EDITOR_CHROME[uiLang];
  const [active, setActive] = useState<Lang>(uiLang);
  const [drafts, setDrafts] = useState<LandingDrafts>(() => landingDrafts(planOverrides));

  useEffect(() => {
    setDrafts(landingDrafts(planOverrides));
  }, [planOverrides]);

  const endonym = (code: Lang) =>
    languages.languages.find((language) => language.code === code)?.endonym ?? code;

  return (
    <form
      className="landing-editor"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave(landingOverridesFromDrafts(drafts), drafts);
      }}
    >
      <p className="landing-editor__note">{chrome.note}</p>
      <div className="landing-editor__langs">
        {LANG_VALUES.map((code) => (
          <button
            key={code}
            type="button"
            className={code === active ? "landing-editor__lang is-on" : "landing-editor__lang"}
            onClick={() => setActive(code)}
          >
            {endonym(code)}
          </button>
        ))}
      </div>
      {LANDING_GROUPS.map((group) => (
        <details key={group.id} className="landing-editor__group" open={group.id === "hero"}>
          <summary>{group.title[uiLang]}</summary>
          <div className="landing-editor__fields">
            {group.fields.map((item) => {
              const value = drafts[active]?.[item.path] ?? "";
              const fallback = landingDefault(active, item.path);
              return (
                <label key={item.path}>
                  {item.label[uiLang]}
                  {fallback.includes("{{count}}") ? (
                    <span className="landing-editor__hint">{chrome.countHint}</span>
                  ) : null}
                  {item.long ? (
                    <textarea
                      value={value}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [active]: { ...current[active], [item.path]: event.target.value },
                        }))
                      }
                    />
                  ) : (
                    <input
                      value={value}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [active]: { ...current[active], [item.path]: event.target.value },
                        }))
                      }
                    />
                  )}
                </label>
              );
            })}
          </div>
        </details>
      ))}
      <button className="landing-editor__save" type="submit" disabled={saving}>
        {saving ? chrome.saving : chrome.save}
      </button>
    </form>
  );
}
