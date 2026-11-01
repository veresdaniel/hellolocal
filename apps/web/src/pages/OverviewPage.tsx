import { useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FloatingHeader } from "../components/FloatingHeader";
import { Footer } from "../ui/layout/Footer";
import { useSeo } from "../seo/useSeo";
import { buildUrl } from "../app/urls";
import { APP_LANGS, DEFAULT_LANG, type Lang } from "../app/config";
import { useRouteCtx } from "../app/useRouteCtx";

const FEATURE_KEYS = ["places", "events", "map", "languages", "sites", "editors"] as const;
const AUDIENCE_KEYS = ["municipality", "office", "destination"] as const;

function isLang(value: string): value is Lang {
  return (APP_LANGS as readonly string[]).includes(value);
}

export function OverviewPage() {
  const { t, i18n } = useTranslation();
  const { lang: routeLang } = useRouteCtx();
  const lang: Lang = isLang(routeLang) ? routeLang : DEFAULT_LANG;
  const outlet = useOutletContext<{ platform?: unknown } | null>();
  const insideSiteLayout = Boolean(outlet?.platform);

  useEffect(() => {
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
      localStorage.setItem("i18nextLng", lang);
    }
  }, [i18n, lang]);

  const title = t("public.overview.title");
  const description = t("public.overview.lead");

  useSeo({
    title,
    description,
    og: { type: "website", title, description },
    twitter: { card: "summary", title, description },
  });

  return (
    <>
      <FloatingHeader hideMapViewButton />
      <main
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          paddingTop: "clamp(88px, 12vw, 112px)",
          paddingBottom: "clamp(48px, 8vw, 80px)",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 clamp(16px, 4vw, 24px)",
          }}
        >
          <header style={{ maxWidth: 720, marginBottom: "clamp(36px, 6vw, 56px)" }}>
            <p
              style={{
                margin: "0 0 12px",
                color: "rgba(255,255,255,0.85)",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontSize: 13,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              HelloLocal
            </p>
            <h1
              style={{
                margin: 0,
                color: "#fff",
                fontSize: "clamp(36px, 6vw, 56px)",
                lineHeight: 1.1,
                fontWeight: 700,
                fontFamily: "Poppins, system-ui, sans-serif",
              }}
            >
              {title}
            </h1>
            <p
              style={{
                margin: "18px 0 0",
                color: "rgba(255,255,255,0.95)",
                fontSize: "clamp(18px, 2.4vw, 22px)",
                lineHeight: 1.55,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              {description}
            </p>
            <Link
              to={buildUrl({ lang, path: "" })}
              style={{
                display: "inline-flex",
                marginTop: 28,
                padding: "12px 20px",
                borderRadius: 999,
                background: "#fff",
                color: "#4c51bf",
                fontWeight: 700,
                textDecoration: "none",
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              {t("public.overview.cta")}
            </Link>
          </header>

          <section>
            <h2
              style={{
                margin: "0 0 16px",
                color: "#fff",
                fontSize: "clamp(26px, 4vw, 34px)",
                fontFamily: "Poppins, system-ui, sans-serif",
              }}
            >
              {t("public.overview.featuresTitle")}
            </h2>
            <ul
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 16,
                margin: 0,
                padding: 0,
                listStyle: "none",
              }}
            >
              {FEATURE_KEYS.map((key) => (
                <li
                  key={key}
                  style={{
                    background: "rgba(255,255,255,0.96)",
                    borderRadius: 16,
                    padding: "20px 18px",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 8px",
                      fontSize: 18,
                      fontFamily: "Poppins, system-ui, sans-serif",
                    }}
                  >
                    {t(`public.overview.features.${key}.title`)}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      color: "#4b5563",
                      lineHeight: 1.5,
                      fontFamily: "Inter, system-ui, sans-serif",
                    }}
                  >
                    {t(`public.overview.features.${key}.text`)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section style={{ marginTop: 40 }}>
            <h2
              style={{
                margin: "0 0 16px",
                color: "#fff",
                fontSize: "clamp(26px, 4vw, 34px)",
                fontFamily: "Poppins, system-ui, sans-serif",
              }}
            >
              {t("public.overview.audienceTitle")}
            </h2>
            <ul
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 16,
                margin: 0,
                padding: 0,
                listStyle: "none",
              }}
            >
              {AUDIENCE_KEYS.map((key) => (
                <li
                  key={key}
                  style={{
                    background: "rgba(255,255,255,0.16)",
                    border: "1px solid rgba(255,255,255,0.28)",
                    borderRadius: 16,
                    padding: "20px 18px",
                    color: "#fff",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 8px",
                      fontSize: 18,
                      fontFamily: "Poppins, system-ui, sans-serif",
                    }}
                  >
                    {t(`public.overview.audience.${key}.title`)}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      lineHeight: 1.5,
                      fontFamily: "Inter, system-ui, sans-serif",
                    }}
                  >
                    {t(`public.overview.audience.${key}.text`)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      {!insideSiteLayout && <Footer lang={lang} />}
    </>
  );
}
