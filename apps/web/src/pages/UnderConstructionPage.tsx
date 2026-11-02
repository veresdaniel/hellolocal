// Public under-development page. Copy comes from App Settings (DB), with i18n fallbacks.
import { useTranslation } from "react-i18next";
import "../styles/under-construction.css";

export type UnderConstructionPageCopy = {
  title?: string;
  body?: string;
  buttonLabel?: string;
};

type Props = {
  copy?: UnderConstructionPageCopy | null;
};

export function UnderConstructionPage({ copy }: Props) {
  const { t } = useTranslation();
  const title = copy?.title?.trim() || t("underConstruction.title");
  const body = copy?.body?.trim() || t("underConstruction.body");
  const buttonLabel = copy?.buttonLabel?.trim() || "";

  return (
    <div className="uc-gate">
      <div className="uc-gate__glow" aria-hidden />
      <main className="uc-gate__inner">
        <p className="uc-gate__brand">HelloLocal</p>
        <h1 className="uc-gate__title">{title}</h1>
        <p className="uc-gate__body">{body}</p>
        {buttonLabel ? <p className="uc-gate__button">{buttonLabel}</p> : null}
      </main>
    </div>
  );
}
