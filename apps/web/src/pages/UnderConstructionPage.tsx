// Public under-development page. Copy comes from App Settings (DB), with i18n fallbacks.
import { useTranslation } from "react-i18next";

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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
        background: "linear-gradient(160deg, #1f2937 0%, #0f172a 55%, #111827 100%)",
        color: "#f8fafc",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: "-20%",
          background:
            "radial-gradient(circle at 30% 20%, rgba(148,163,184,0.18), transparent 45%), radial-gradient(circle at 70% 80%, rgba(100,116,139,0.16), transparent 40%)",
          pointerEvents: "none",
        }}
      />
      <main style={{ position: "relative", maxWidth: 560, zIndex: 1 }}>
        <p
          style={{
            margin: "0 0 12px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontSize: 12,
            color: "rgba(248,250,252,0.7)",
            fontWeight: 600,
          }}
        >
          HelloLocal
        </p>
        <h1
          style={{
            margin: "0 0 16px",
            fontSize: "clamp(28px, 6vw, 42px)",
            lineHeight: 1.15,
            fontWeight: 700,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: "clamp(16px, 3.5vw, 18px)",
            lineHeight: 1.6,
            color: "rgba(248,250,252,0.85)",
            whiteSpace: "pre-wrap",
          }}
        >
          {body}
        </p>
        {buttonLabel ? (
          <p style={{ margin: "28px 0 0", color: "rgba(248,250,252,0.65)", fontSize: 14 }}>
            {buttonLabel}
          </p>
        ) : null}
      </main>
    </div>
  );
}
