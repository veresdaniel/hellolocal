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
        <span style={{ 
          color: "#22c55e", 
          fontSize: "clamp(20px, 3vw, 24px)", 
          fontWeight: 700,
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}>✓</span>
      ) : (
        <span style={{ 
          color: "#9ca3af", 
          fontSize: "clamp(18px, 2.5vw, 20px)",
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}>–</span>
      );
    }
    if (typeof value === "number") {
      return <span style={{ 
        fontWeight: 700, 
        color: "#1a1a1a", 
        fontSize: "clamp(16px, 2.5vw, 20px)",
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>{value}</span>;
    }
    return <span style={{ 
      fontWeight: 600, 
      color: "#1a1a1a", 
      fontSize: "clamp(15px, 2.2vw, 18px)",
      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>{value}</span>;
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

  // Plan icons as SVG components - unique custom designs
  const PlanIcon = ({ tier }: { tier: PlanTier }) => {
    const iconSize = 56;
    const circleSize = 96;
    
    if (tier === "free") {
      // Knitted beanie - matching the reference image, larger size
      return (
        <div style={{
          width: circleSize,
          height: circleSize,
          borderRadius: "50%",
          background: "white",
          border: "5px solid #667eea",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 20px rgba(102, 126, 234, 0.25)",
        }}>
          <svg width={iconSize * 1.15} height={iconSize * 1.15} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'translateY(-2px)' }}>
            {/* Main beanie body - rounded dome shape, centered */}
            <path d="M12 4.5C9 4.5 7 6 7 8.5C7 10 7.5 11.5 8.5 12.5V13.5H15.5V12.5C16.5 11.5 17 10 17 8.5C17 6 15 4.5 12 4.5Z" fill="#667eea" stroke="#5568d3" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Knitted texture pattern - horizontal ribbing lines */}
            <path d="M7 6.5H17" stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" opacity="0.4"/>
            <path d="M7 7.3H17" stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" opacity="0.4"/>
            <path d="M7 8.1H17" stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" opacity="0.4"/>
            <path d="M7 8.9H17" stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" opacity="0.4"/>
            <path d="M7 9.7H17" stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" opacity="0.4"/>
            <path d="M7 10.5H17" stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" opacity="0.4"/>
            <path d="M7 11.3H17" stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" opacity="0.4"/>
            <path d="M7 12.1H17" stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" opacity="0.4"/>
            {/* Large wide brim - flat and prominent, centered */}
            <ellipse cx="12" cy="13.5" rx="9" ry="2.8" fill="#667eea" stroke="#5568d3" strokeWidth="1.2"/>
            {/* Brim underside shadow */}
            <ellipse cx="12" cy="14.3" rx="8.5" ry="2" fill="#5568d3" opacity="0.3"/>
            {/* Knitted texture on brim */}
            <path d="M3.5 13.5H20.5" stroke="#ffffff" strokeWidth="0.5" strokeLinecap="round" opacity="0.3"/>
            <path d="M3.5 14H20.5" stroke="#ffffff" strokeWidth="0.5" strokeLinecap="round" opacity="0.3"/>
            <path d="M3.5 14.5H20.5" stroke="#ffffff" strokeWidth="0.5" strokeLinecap="round" opacity="0.3"/>
          </svg>
        </div>
      );
    } else if (tier === "basic") {
      // Viking helmet with horns
      return (
        <div style={{
          width: circleSize,
          height: circleSize,
          borderRadius: "50%",
          background: "white",
          border: "5px solid #667eea",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 20px rgba(102, 126, 234, 0.25)",
        }}>
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Helmet dome - brown leather */}
            <path d="M12 5C9.5 5 7.5 6.5 7.5 9V12.5C7.5 14 8.5 15.5 10 15.5H14C15.5 15.5 16.5 14 16.5 12.5V9C16.5 6.5 14.5 5 12 5Z" fill="#8b4513" stroke="#654321" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Metallic brow guard */}
            <rect x="7.5" y="8.5" width="9" height="2" rx="0.5" fill="#708090" stroke="#556b2f" strokeWidth="0.5"/>
            {/* Vertical metallic strip */}
            <rect x="11.5" y="5" width="1" height="4" rx="0.3" fill="#708090" stroke="#556b2f" strokeWidth="0.3"/>
            {/* Rivets on brow guard */}
            <circle cx="9" cy="9.5" r="0.7" fill="#2f2f2f"/>
            <circle cx="12" cy="9.5" r="0.7" fill="#2f2f2f"/>
            <circle cx="15" cy="9.5" r="0.7" fill="#2f2f2f"/>
            {/* Rivet on vertical strip */}
            <circle cx="12" cy="6.5" r="0.5" fill="#2f2f2f"/>
            {/* Left horn - tan/cream, curved upward and outward */}
            <path d="M5.5 10.5C4.5 9 3.5 7.5 3 6.5C2.5 5.5 3 4.5 4 4C5 3.5 6 4.5 6.5 6C7 7.5 6.5 9.5 5.5 10.5Z" fill="#d2b48c" stroke="#8b7355" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4 5.5C4.5 6.5 5 7.5 5.5 8.5" stroke="#8b7355" strokeWidth="1" strokeLinecap="round" fill="none"/>
            {/* Right horn - tan/cream, curved upward and outward */}
            <path d="M18.5 10.5C19.5 9 20.5 7.5 21 6.5C21.5 5.5 21 4.5 20 4C19 3.5 18 4.5 17.5 6C17 7.5 17.5 9.5 18.5 10.5Z" fill="#d2b48c" stroke="#8b7355" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20 5.5C19.5 6.5 19 7.5 18.5 8.5" stroke="#8b7355" strokeWidth="1" strokeLinecap="round" fill="none"/>
            {/* Face guard/nose piece */}
            <path d="M10 15.5V17.5C10 18.5 10.5 19.5 11.5 19.5H12.5C13.5 19.5 14 18.5 14 17.5V15.5" stroke="#654321" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </div>
      );
    } else {
      // Golden crown with gems - unique design
      return (
        <div style={{
          width: circleSize,
          height: circleSize,
          borderRadius: "50%",
          background: "white",
          border: "5px solid #667eea",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 20px rgba(102, 126, 234, 0.25)",
        }}>
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Crown base - golden */}
            <path d="M5 16L3 9L7 11L12 5L17 11L21 9L19 16H5Z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Left peak */}
            <path d="M7 11L5 16" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
            {/* Center peak - tallest */}
            <path d="M12 5L12 16" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
            {/* Right peak */}
            <path d="M17 11L19 16" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
            {/* Gems - left */}
            <circle cx="6.5" cy="11.5" r="1.8" fill="#c41e3a" stroke="#8b0000" strokeWidth="1"/>
            <circle cx="6.5" cy="11.5" r="0.8" fill="#ff6b6b" opacity="0.7"/>
            {/* Gem - center (largest) */}
            <circle cx="12" cy="6" r="2.2" fill="#4169e1" stroke="#00008b" strokeWidth="1"/>
            <circle cx="12" cy="6" r="1" fill="#87ceeb" opacity="0.6"/>
            {/* Gem - right */}
            <circle cx="17.5" cy="11.5" r="1.8" fill="#c41e3a" stroke="#8b0000" strokeWidth="1"/>
            <circle cx="17.5" cy="11.5" r="0.8" fill="#ff6b6b" opacity="0.7"/>
            {/* Crown band */}
            <path d="M5 16V20H19V16" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            {/* Decorative dots on band */}
            <circle cx="7" cy="18" r="0.8" fill="#f59e0b"/>
            <circle cx="12" cy="18" r="0.8" fill="#f59e0b"/>
            <circle cx="17" cy="18" r="0.8" fill="#f59e0b"/>
          </svg>
        </div>
      );
    }
  };

  return (
    <>
      <LoadingSpinner isLoading={false} />
      <FloatingHeader />
      <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        paddingTop: "clamp(80px, 12vw, 100px)",
        paddingBottom: "clamp(40px, 8vw, 80px)",
      }}
      >
        <div
          style={{
            maxWidth: "min(100%, 1200px)",
            margin: "0 auto",
            padding: "0 clamp(16px, 4vw, 24px)",
            width: "100%",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "clamp(40px, 8vw, 64px)" }}>
            <h1
              style={{
                fontSize: "clamp(32px, 6vw, 52px)",
                fontWeight: 700,
                marginBottom: 20,
                color: "#ffffff",
                lineHeight: 1.2,
                fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                textShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
              }}
            >
              {t("public.pricing.title")}
            </h1>
            <p
              style={{
                fontSize: "clamp(18px, 2.5vw, 22px)",
                color: "rgba(255, 255, 255, 0.95)",
                maxWidth: 700,
                margin: "0 auto",
                lineHeight: 1.6,
                padding: "0 16px",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontWeight: 400,
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
                  background: "#ffffff",
                  borderRadius: 20,
                  padding: "clamp(28px, 4vw, 36px)",
                  boxShadow: plan.highlight
                    ? "0 20px 50px rgba(0, 0, 0, 0.25)"
                    : "0 8px 24px rgba(0, 0, 0, 0.15)",
                  border: plan.highlight ? "3px solid #667eea" : "2px solid rgba(255, 255, 255, 0.3)",
                  position: "relative",
                  transform: plan.highlight ? "scale(1.05)" : "scale(1)",
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                }}
                onMouseEnter={(e) => {
                  if (!plan.highlight && window.innerWidth >= 768) {
                    e.currentTarget.style.transform = "translateY(-6px)";
                    e.currentTarget.style.boxShadow = "0 12px 32px rgba(0, 0, 0, 0.2)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!plan.highlight) {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.15)";
                  }
                }}
              >
                {plan.highlight && (
                  <div
                    style={{
                      position: "absolute",
                      top: -14,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "#22c55e",
                      color: "white",
                      padding: "6px 20px",
                      borderRadius: 24,
                      fontSize: "clamp(12px, 1.5vw, 14px)",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      boxShadow: "0 4px 12px rgba(34, 197, 94, 0.4)",
                    }}
                  >
                    {t("public.pricing.popular")}
                  </div>
                )}
                <div style={{ marginBottom: 20 }}>
                  <PlanIcon tier={plan.tier} />
                </div>
                <h3
                  style={{
                    fontSize: "clamp(24px, 3.5vw, 32px)",
                    fontWeight: 700,
                    marginBottom: 12,
                    color: "#1a1a1a",
                    fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {plan.name}
                </h3>
                <p
                  style={{
                    fontSize: "clamp(15px, 2vw, 18px)",
                    color: "#4b5563",
                    marginBottom: 0,
                    lineHeight: 1.6,
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
              border: "2px solid rgba(255, 255, 255, 0.3)",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              maxWidth: "min(100%, 1000px)",
              margin: "0 auto",
            }}
          >
            {/* Table Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(200px, 2.5fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr)",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                padding: "clamp(20px, 3vw, 28px) clamp(20px, 3vw, 32px)",
                gap: "clamp(16px, 2.5vw, 24px)",
                alignItems: "center",
                minWidth: "min(100%, 700px)",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: "#ffffff",
                  fontSize: "clamp(16px, 2.5vw, 20px)",
                  fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("public.pricing.featureMatrix.feature")}
              </div>
              {plans.map((plan) => (
                <div
                  key={plan.tier}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <PlanIcon tier={plan.tier} />
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#ffffff",
                      fontSize: "clamp(18px, 2.8vw, 22px)",
                      textAlign: "center",
                      fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    {plan.name}
                  </div>
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
                    padding: "clamp(16px, 2.5vw, 20px) clamp(20px, 3vw, 32px)",
                    borderTop: "1px solid rgba(0, 0, 0, 0.08)",
                    borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
                  }}
                >
                  <h4
                    style={{
                      fontSize: "clamp(16px, 2.5vw, 20px)",
                      fontWeight: 700,
                      color: "#1a1a1a",
                      margin: 0,
                      fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                      gridTemplateColumns: "minmax(200px, 2.5fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr)",
                      padding: "clamp(16px, 2.5vw, 20px) clamp(20px, 3vw, 32px)",
                      gap: "clamp(16px, 2.5vw, 24px)",
                      alignItems: "center",
                      borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                      transition: "background 0.2s",
                      minWidth: "min(100%, 700px)",
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
                        fontSize: "clamp(15px, 2.2vw, 18px)",
                        color: "#374151",
                        fontWeight: 500,
                        lineHeight: 1.6,
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
              marginTop: "clamp(40px, 6vw, 56px)",
              padding: "clamp(24px, 3.5vw, 32px)",
              background: "rgba(255, 255, 255, 0.95)",
              borderRadius: 16,
              textAlign: "center",
              maxWidth: "min(100%, 800px)",
              marginLeft: "auto",
              marginRight: "auto",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
            }}
          >
            <p
              style={{
                fontSize: "clamp(15px, 2.2vw, 18px)",
                color: "#4b5563",
                margin: 0,
                lineHeight: 1.7,
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontWeight: 400,
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
