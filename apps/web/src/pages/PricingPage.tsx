// src/pages/PricingPage.tsx
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSiteContext } from "../app/site/useSiteContext";
import { getPlatformSettings } from "../api/places.api";
import { useSeo } from "../seo/useSeo";
import { generateWebPageSchema } from "../seo/schemaOrg";
import { FloatingHeader } from "../components/FloatingHeader";
import { LoadingSpinner } from "../components/LoadingSpinner";

type PlanTier = "free" | "basic" | "pro";

interface Feature {
  category: string;
  name: string;
  free: string | number | boolean;
  basic: string | number | boolean;
  pro: string | number | boolean;
}

export function PricingPage() {
  const { t } = useTranslation();
  const { lang, siteKey } = useSiteContext();
  const safeLang = lang ?? "hu";

  // Load site settings for SEO
  const { data: platformSettings } = useQuery({
    queryKey: ["platformSettings", safeLang, siteKey],
    queryFn: () => getPlatformSettings(safeLang, siteKey),
    staleTime: 5 * 60 * 1000,
  });

  const pageUrl = window.location.href;
  const siteUrl = window.location.origin;

  const seo = {
    title: platformSettings?.seoTitle 
      ? `${t("public.pricing.title")} - ${platformSettings.seoTitle}`
      : t("public.pricing.title"),
    description: t("public.pricing.description"),
    keywords: ["pricing", "csomagok", "tariffs", "preise", "tarife"],
    og: {
      type: "website" as const,
      title: t("public.pricing.title"),
      description: t("public.pricing.description"),
      image: platformSettings?.seoImage,
    },
    twitter: {
      card: platformSettings?.seoImage ? ("summary_large_image" as const) : ("summary" as const),
      title: t("public.pricing.title"),
      description: t("public.pricing.description"),
      image: platformSettings?.seoImage,
    },
    schemaOrg: {
      type: "WebPage" as const,
      data: {
        name: t("public.pricing.title"),
        description: t("public.pricing.description"),
        url: pageUrl,
        inLanguage: safeLang,
        isPartOf: platformSettings?.siteName
          ? {
              name: platformSettings.siteName,
              url: siteUrl,
            }
          : undefined,
      },
    },
  };

  useSeo(seo, {
    siteName: platformSettings?.siteName,
  });

  // Feature matrix data
  const features: Feature[] = [
    // Places
    {
      category: t("public.pricing.categories.places"),
      name: t("public.pricing.features.placesCount"),
      free: 3,
      basic: 30,
      pro: 150,
    },
    {
      category: t("public.pricing.categories.places"),
      name: t("public.pricing.features.imagesPerPlace"),
      free: 3,
      basic: 10,
      pro: 30,
    },
    {
      category: t("public.pricing.categories.places"),
      name: t("public.pricing.features.heroImage"),
      free: true,
      basic: true,
      pro: true,
    },
    {
      category: t("public.pricing.categories.places"),
      name: t("public.pricing.features.contacts"),
      free: true,
      basic: true,
      pro: true,
    },
    {
      category: t("public.pricing.categories.places"),
      name: t("public.pricing.features.extraFields"),
      free: false,
      basic: true,
      pro: true,
    },
    // Visibility
    {
      category: t("public.pricing.categories.visibility"),
      name: t("public.pricing.features.featuredPlaces"),
      free: 0,
      basic: 3,
      pro: 15,
    },
    {
      category: t("public.pricing.categories.visibility"),
      name: t("public.pricing.features.featuredBoost"),
      free: false,
      basic: true,
      pro: "✓✓",
    },
    // Events
    {
      category: t("public.pricing.categories.events"),
      name: t("public.pricing.features.eventsEnabled"),
      free: false,
      basic: true,
      pro: true,
    },
    {
      category: t("public.pricing.categories.events"),
      name: t("public.pricing.features.eventsPerMonth"),
      free: 0,
      basic: 30,
      pro: 200,
    },
    // SEO
    {
      category: t("public.pricing.categories.seo"),
      name: t("public.pricing.features.siteSeo"),
      free: true,
      basic: true,
      pro: true,
    },
    {
      category: t("public.pricing.categories.seo"),
      name: t("public.pricing.features.placeSeo"),
      free: false,
      basic: true,
      pro: true,
    },
    {
      category: t("public.pricing.categories.seo"),
      name: t("public.pricing.features.canonicalSupport"),
      free: true,
      basic: true,
      pro: true,
    },
    // Domain
    {
      category: t("public.pricing.categories.domain"),
      name: t("public.pricing.features.customDomain"),
      free: false,
      basic: false,
      pro: true,
    },
    {
      category: t("public.pricing.categories.domain"),
      name: t("public.pricing.features.multipleDomainAliases"),
      free: false,
      basic: false,
      pro: t("public.pricing.features.max5"),
    },
    // Languages
    {
      category: t("public.pricing.categories.languages"),
      name: t("public.pricing.features.additionalLanguages"),
      free: 1,
      basic: 2,
      pro: 3,
    },
    // Permissions
    {
      category: t("public.pricing.categories.permissions"),
      name: t("public.pricing.features.siteMembers"),
      free: 2,
      basic: 5,
      pro: 20,
    },
    // Admin
    {
      category: t("public.pricing.categories.admin"),
      name: t("public.pricing.features.eventLog"),
      free: false,
      basic: true,
      pro: true,
    },
    // Push
    {
      category: t("public.pricing.categories.push"),
      name: t("public.pricing.features.pushSubscription"),
      free: false,
      basic: false,
      pro: t("public.pricing.features.optionalAddon"),
    },
  ];

  const renderFeatureValue = (value: string | number | boolean): React.ReactNode => {
    if (typeof value === "boolean") {
      return value ? (
        <span style={{ color: "#22c55e", fontSize: "clamp(18px, 2.5vw, 20px)", fontWeight: 600 }}>✓</span>
      ) : (
        <span style={{ color: "#9ca3af", fontSize: "clamp(14px, 2vw, 16px)" }}>–</span>
      );
    }
    if (typeof value === "number") {
      return <span style={{ fontWeight: 600, color: "#1a1a1a", fontSize: "clamp(14px, 2vw, 16px)" }}>{value}</span>;
    }
    return <span style={{ fontWeight: 500, color: "#1a1a1a", fontSize: "clamp(13px, 1.8vw, 15px)" }}>{value}</span>;
  };

  const plans: Array<{ tier: PlanTier; name: string; description: string; highlight?: boolean }> = [
    {
      tier: "free",
      name: t("public.pricing.plans.free.name"),
      description: t("public.pricing.plans.free.description"),
    },
    {
      tier: "basic",
      name: t("public.pricing.plans.basic.name"),
      description: t("public.pricing.plans.basic.description"),
      highlight: true,
    },
    {
      tier: "pro",
      name: t("public.pricing.plans.pro.name"),
      description: t("public.pricing.plans.pro.description"),
    },
  ];

  // Group features by category
  const featuresByCategory = features.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

  return (
    <>
      <LoadingSpinner isLoading={false} />
      <FloatingHeader />
      <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%)",
        paddingTop: "clamp(80px, 12vw, 100px)",
        paddingBottom: "clamp(40px, 8vw, 80px)",
      }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            padding: "0 clamp(16px, 4vw, 24px)",
            width: "100%",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "clamp(40px, 8vw, 64px)" }}>
            <h1
              style={{
                fontSize: "clamp(28px, 6vw, 48px)",
                fontWeight: 700,
                marginBottom: 16,
                color: "#1a1a1a",
                lineHeight: 1.2,
              }}
            >
              {t("public.pricing.title")}
            </h1>
            <p
              style={{
                fontSize: "clamp(16px, 2vw, 18px)",
                color: "#6b7280",
                maxWidth: 600,
                margin: "0 auto",
                lineHeight: 1.6,
                padding: "0 16px",
              }}
            >
              {t("public.pricing.subtitle")}
            </p>
          </div>

          {/* Plan Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
              gap: "clamp(16px, 3vw, 24px)",
              marginBottom: "clamp(40px, 8vw, 80px)",
            }}
          >
            {plans.map((plan) => (
              <div
                key={plan.tier}
                style={{
                  background: plan.highlight
                    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    : "#ffffff",
                  borderRadius: 16,
                  padding: "clamp(24px, 4vw, 32px)",
                  boxShadow: plan.highlight
                    ? "0 20px 40px rgba(102, 126, 234, 0.3)"
                    : "0 4px 12px rgba(0, 0, 0, 0.08)",
                  border: plan.highlight ? "none" : "1px solid rgba(0, 0, 0, 0.08)",
                  position: "relative",
                  transform: plan.highlight ? "scale(1.05)" : "scale(1)",
                  transition: "transform 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  if (!plan.highlight && window.innerWidth >= 768) {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.12)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!plan.highlight) {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08)";
                  }
                }}
              >
                {plan.highlight && (
                  <div
                    style={{
                      position: "absolute",
                      top: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "#22c55e",
                      color: "white",
                      padding: "4px 16px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {t("public.pricing.popular")}
                  </div>
                )}
                <h3
                  style={{
                    fontSize: "clamp(20px, 3vw, 24px)",
                    fontWeight: 700,
                    marginBottom: 8,
                    color: plan.highlight ? "#ffffff" : "#1a1a1a",
                  }}
                >
                  {plan.name}
                </h3>
                <p
                  style={{
                    fontSize: "clamp(13px, 1.8vw, 14px)",
                    color: plan.highlight ? "rgba(255, 255, 255, 0.9)" : "#6b7280",
                    marginBottom: 24,
                    lineHeight: 1.5,
                  }}
                >
                  {plan.description}
                </p>
              </div>
            ))}
          </div>

          {/* Feature Matrix */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
              border: "1px solid rgba(0, 0, 0, 0.08)",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {/* Table Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(180px, 2fr) minmax(80px, 1fr) minmax(80px, 1fr) minmax(80px, 1fr)",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                padding: "clamp(16px, 3vw, 20px) clamp(16px, 3vw, 24px)",
                gap: "clamp(12px, 2vw, 16px)",
                alignItems: "center",
                minWidth: "min(100%, 600px)",
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  color: "#ffffff",
                  fontSize: "clamp(14px, 2vw, 16px)",
                }}
              >
                {t("public.pricing.featureMatrix.feature")}
              </div>
              {plans.map((plan) => (
                <div
                  key={plan.tier}
                  style={{
                    fontWeight: 700,
                    color: "#ffffff",
                    fontSize: "clamp(16px, 2.5vw, 18px)",
                    textAlign: "center",
                  }}
                >
                  {plan.name}
                </div>
              ))}
            </div>

            {/* Table Body */}
            {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
              <div key={category}>
                {/* Category Header */}
                <div
                  style={{
                    background: "#f8f9fa",
                    padding: "clamp(12px, 2vw, 16px) clamp(16px, 3vw, 24px)",
                    borderTop: "1px solid rgba(0, 0, 0, 0.08)",
                    borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
                  }}
                >
                  <h4
                    style={{
                      fontSize: "clamp(14px, 2vw, 16px)",
                      fontWeight: 600,
                      color: "#1a1a1a",
                      margin: 0,
                    }}
                  >
                    {category}
                  </h4>
                </div>

                {/* Category Features */}
                {categoryFeatures.map((feature, idx) => (
                  <div
                    key={`${feature.category}-${feature.name}-${idx}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(180px, 2fr) minmax(80px, 1fr) minmax(80px, 1fr) minmax(80px, 1fr)",
                      padding: "clamp(12px, 2vw, 16px) clamp(16px, 3vw, 24px)",
                      gap: "clamp(12px, 2vw, 16px)",
                      alignItems: "center",
                      borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                      transition: "background 0.2s",
                      minWidth: "min(100%, 600px)",
                    }}
                    onMouseEnter={(e) => {
                      if (window.innerWidth >= 768) {
                        e.currentTarget.style.background = "#f8f9fa";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#ffffff";
                    }}
                  >
                    <div
                      style={{
                        fontSize: "clamp(13px, 1.8vw, 15px)",
                        color: "#374151",
                        fontWeight: 500,
                        lineHeight: 1.5,
                      }}
                    >
                      {feature.name}
                    </div>
                    <div
                      style={{
                        textAlign: "center",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      {renderFeatureValue(feature.free)}
                    </div>
                    <div
                      style={{
                        textAlign: "center",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      {renderFeatureValue(feature.basic)}
                    </div>
                    <div
                      style={{
                        textAlign: "center",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      {renderFeatureValue(feature.pro)}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Footer Note */}
          <div
            style={{
              marginTop: "clamp(32px, 6vw, 48px)",
              padding: "clamp(20px, 3vw, 24px)",
              background: "#f8f9fa",
              borderRadius: 12,
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: "clamp(13px, 1.8vw, 14px)",
                color: "#6b7280",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {t("public.pricing.footerNote")}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
