// src/pages/PricingPage.tsx
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useRouteCtx } from "../app/useRouteCtx";
import { getPlatformSettings } from "../api/places.api";
import { getFeatureMatrix, type FeatureMatrix } from "../api/admin.api";
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
  const [searchParams] = useSearchParams();
  const { lang, siteKey } = useRouteCtx();
  
  const safeLang = lang ?? "hu";
  const pricingType = searchParams.get("type") || "site"; // "site" or "place"
  const placeId = searchParams.get("placeId") || null;

  // Load site settings for SEO (only if siteKey is available)
  const { data: platformSettings } = useQuery({
    queryKey: ["platformSettings", safeLang, siteKey],
    queryFn: () => getPlatformSettings(safeLang, siteKey),
    staleTime: 5 * 60 * 1000,
    enabled: !!siteKey, // Only fetch if siteKey is available
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

  // Helper function to get value with override support
  const getValueWithOverride = (
    plan: "FREE" | "BASIC" | "PRO" | "free" | "basic" | "pro",
    defaultValue: any,
    overrides?: any,
    path?: string[]
  ): any => {
    if (!overrides) return defaultValue;
    
    const planOverride = overrides[plan];
    if (!planOverride) return defaultValue;
    
    if (path && path.length > 0) {
      let current: any = planOverride;
      for (const key of path) {
        if (current === undefined || current === null) return defaultValue;
        current = current[key];
      }
      if (current !== undefined) {
        // Handle Infinity values
        if (current === Infinity || current === "∞") {
          return "∞";
        }
        return current;
      }
      return defaultValue;
    }
    
    if (planOverride !== undefined) {
      // Handle Infinity values
      if (planOverride === Infinity || planOverride === "∞") {
        return "∞";
      }
      return planOverride;
    }
    
    return defaultValue;
  };

  // Feature matrix data - different for site vs place plans
  // Merge with overrides from platformSettings
  const featureMatrix = platformSettings?.featureMatrix;
  
  const features: Feature[] = pricingType === "place" ? [
    // Place-specific features
    {
      category: t("public.pricing.categories.place") || "Helyszín",
      name: t("public.pricing.features.placeImages") || "Képek száma",
      free: getValueWithOverride("free", 3, featureMatrix?.placePlanOverrides, ["images"]) ?? 3,
      basic: getValueWithOverride("basic", 15, featureMatrix?.placePlanOverrides, ["images"]) ?? 15,
      pro: getValueWithOverride("pro", Infinity, featureMatrix?.placePlanOverrides, ["images"]) ?? "∞",
    },
    {
      category: t("public.pricing.categories.place") || "Helyszín",
      name: t("public.pricing.features.heroImage") || "Hero kép",
      free: true,
      basic: true,
      pro: true,
    },
    {
      category: t("public.pricing.categories.place") || "Helyszín",
      name: t("public.pricing.features.contacts") || "Kapcsolatok",
      free: true,
      basic: true,
      pro: true,
    },
    {
      category: t("public.pricing.categories.place") || "Helyszín",
      name: t("public.pricing.features.extraFields") || "Extra mezők",
      free: false,
      basic: true,
      pro: true,
    },
    {
      category: t("public.pricing.categories.place") || "Helyszín",
      name: t("public.pricing.features.featuredPlacement") || "Kiemelt megjelenés",
      free: getValueWithOverride("free", false, featureMatrix?.placePlanOverrides, ["featured"]) ?? false,
      basic: getValueWithOverride("basic", false, featureMatrix?.placePlanOverrides, ["featured"]) ?? false,
      pro: getValueWithOverride("pro", true, featureMatrix?.placePlanOverrides, ["featured"]) ?? true,
    },
    {
      category: t("public.pricing.categories.place") || "Helyszín",
      name: t("public.pricing.features.placeSeo") || "SEO beállítások",
      free: false,
      basic: true,
      pro: true,
    },
  ] : [
    // Site-specific features (existing)
    {
      category: t("public.pricing.categories.places"),
      name: t("public.pricing.features.placesCount"),
      free: getValueWithOverride("FREE", 3, featureMatrix?.planOverrides, ["limits", "placesMax"]) ?? 3,
      basic: getValueWithOverride("BASIC", 30, featureMatrix?.planOverrides, ["limits", "placesMax"]) ?? 30,
      pro: getValueWithOverride("PRO", 150, featureMatrix?.planOverrides, ["limits", "placesMax"]) ?? 150,
    },
    {
      category: t("public.pricing.categories.places"),
      name: t("public.pricing.features.imagesPerPlace"),
      free: getValueWithOverride("FREE", 3, featureMatrix?.planOverrides, ["limits", "galleryImagesPerPlaceMax"]) ?? 3,
      basic: getValueWithOverride("BASIC", 10, featureMatrix?.planOverrides, ["limits", "galleryImagesPerPlaceMax"]) ?? 10,
      pro: getValueWithOverride("PRO", 30, featureMatrix?.planOverrides, ["limits", "galleryImagesPerPlaceMax"]) ?? 30,
    },
    {
      category: t("public.pricing.categories.places"),
      name: t("public.pricing.features.heroImage"),
      free: getValueWithOverride("FREE", true, featureMatrix?.planOverrides, ["features", "heroImage"]) ?? true,
      basic: getValueWithOverride("BASIC", true, featureMatrix?.planOverrides, ["features", "heroImage"]) ?? true,
      pro: getValueWithOverride("PRO", true, featureMatrix?.planOverrides, ["features", "heroImage"]) ?? true,
    },
    {
      category: t("public.pricing.categories.places"),
      name: t("public.pricing.features.contacts"),
      free: getValueWithOverride("FREE", true, featureMatrix?.planOverrides, ["features", "contacts"]) ?? true,
      basic: getValueWithOverride("BASIC", true, featureMatrix?.planOverrides, ["features", "contacts"]) ?? true,
      pro: getValueWithOverride("PRO", true, featureMatrix?.planOverrides, ["features", "contacts"]) ?? true,
    },
    {
      category: t("public.pricing.categories.places"),
      name: t("public.pricing.features.extraFields"),
      free: getValueWithOverride("FREE", false, featureMatrix?.planOverrides, ["features", "extrasEnabled"]) ?? false,
      basic: getValueWithOverride("BASIC", true, featureMatrix?.planOverrides, ["features", "extrasEnabled"]) ?? true,
      pro: getValueWithOverride("PRO", true, featureMatrix?.planOverrides, ["features", "extrasEnabled"]) ?? true,
    },
    // Galleries
    {
      category: t("public.pricing.categories.places"),
      name: t("public.pricing.features.galleriesMax"),
      free: getValueWithOverride("FREE", 5, featureMatrix?.planOverrides, ["limits", "galleriesMax"]) ?? 5,
      basic: getValueWithOverride("BASIC", 20, featureMatrix?.planOverrides, ["limits", "galleriesMax"]) ?? 20,
      pro: getValueWithOverride("PRO", Infinity, featureMatrix?.planOverrides, ["limits", "galleriesMax"]) ?? "∞",
    },
    {
      category: t("public.pricing.categories.places"),
      name: t("public.pricing.features.imagesPerGalleryMax"),
      free: getValueWithOverride("FREE", 10, featureMatrix?.planOverrides, ["limits", "imagesPerGalleryMax"]) ?? 10,
      basic: getValueWithOverride("BASIC", 30, featureMatrix?.planOverrides, ["limits", "imagesPerGalleryMax"]) ?? 30,
      pro: getValueWithOverride("PRO", 100, featureMatrix?.planOverrides, ["limits", "imagesPerGalleryMax"]) ?? 100,
    },
    {
      category: t("public.pricing.categories.places"),
      name: t("public.pricing.features.galleriesPerPlaceMax"),
      free: getValueWithOverride("FREE", 1, featureMatrix?.planOverrides, ["limits", "galleriesPerPlaceMax"]) ?? 1,
      basic: getValueWithOverride("BASIC", 3, featureMatrix?.planOverrides, ["limits", "galleriesPerPlaceMax"]) ?? 3,
      pro: getValueWithOverride("PRO", Infinity, featureMatrix?.planOverrides, ["limits", "galleriesPerPlaceMax"]) ?? "∞",
    },
    {
      category: t("public.pricing.categories.places"),
      name: t("public.pricing.features.galleriesPerEventMax"),
      free: getValueWithOverride("FREE", 1, featureMatrix?.planOverrides, ["limits", "galleriesPerEventMax"]) ?? 1,
      basic: getValueWithOverride("BASIC", 2, featureMatrix?.planOverrides, ["limits", "galleriesPerEventMax"]) ?? 2,
      pro: getValueWithOverride("PRO", Infinity, featureMatrix?.planOverrides, ["limits", "galleriesPerEventMax"]) ?? "∞",
    },
    // Visibility
    {
      category: t("public.pricing.categories.visibility"),
      name: t("public.pricing.features.featuredPlaces"),
      free: getValueWithOverride("FREE", 0, featureMatrix?.planOverrides, ["limits", "featuredPlacesMax"]) ?? 0,
      basic: getValueWithOverride("BASIC", 3, featureMatrix?.planOverrides, ["limits", "featuredPlacesMax"]) ?? 3,
      pro: getValueWithOverride("PRO", 15, featureMatrix?.planOverrides, ["limits", "featuredPlacesMax"]) ?? 15,
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
      free: getValueWithOverride("FREE", false, featureMatrix?.planOverrides, ["features", "eventsEnabled"]) ?? false,
      basic: getValueWithOverride("BASIC", true, featureMatrix?.planOverrides, ["features", "eventsEnabled"]) ?? true,
      pro: getValueWithOverride("PRO", true, featureMatrix?.planOverrides, ["features", "eventsEnabled"]) ?? true,
    },
    {
      category: t("public.pricing.categories.events"),
      name: t("public.pricing.features.eventsPerMonth"),
      free: getValueWithOverride("FREE", 0, featureMatrix?.planOverrides, ["limits", "eventsPerMonthMax"]) ?? 0,
      basic: getValueWithOverride("BASIC", 30, featureMatrix?.planOverrides, ["limits", "eventsPerMonthMax"]) ?? 30,
      pro: getValueWithOverride("PRO", 200, featureMatrix?.planOverrides, ["limits", "eventsPerMonthMax"]) ?? 200,
    },
    // SEO
    {
      category: t("public.pricing.categories.seo"),
      name: t("public.pricing.features.siteSeo"),
      free: getValueWithOverride("FREE", true, featureMatrix?.planOverrides, ["features", "siteSeo"]) ?? true,
      basic: getValueWithOverride("BASIC", true, featureMatrix?.planOverrides, ["features", "siteSeo"]) ?? true,
      pro: getValueWithOverride("PRO", true, featureMatrix?.planOverrides, ["features", "siteSeo"]) ?? true,
    },
    {
      category: t("public.pricing.categories.seo"),
      name: t("public.pricing.features.placeSeo"),
      free: getValueWithOverride("FREE", false, featureMatrix?.planOverrides, ["features", "placeSeoEnabled"]) ?? false,
      basic: getValueWithOverride("BASIC", true, featureMatrix?.planOverrides, ["features", "placeSeoEnabled"]) ?? true,
      pro: getValueWithOverride("PRO", true, featureMatrix?.planOverrides, ["features", "placeSeoEnabled"]) ?? true,
    },
    {
      category: t("public.pricing.categories.seo"),
      name: t("public.pricing.features.canonicalSupport"),
      free: getValueWithOverride("FREE", true, featureMatrix?.planOverrides, ["features", "canonicalSupport"]) ?? true,
      basic: getValueWithOverride("BASIC", true, featureMatrix?.planOverrides, ["features", "canonicalSupport"]) ?? true,
      pro: getValueWithOverride("PRO", true, featureMatrix?.planOverrides, ["features", "canonicalSupport"]) ?? true,
    },
    // Domain
    {
      category: t("public.pricing.categories.domain"),
      name: t("public.pricing.features.customDomain"),
      free: getValueWithOverride("FREE", false, featureMatrix?.planOverrides, ["features", "customDomainEnabled"]) ?? false,
      basic: getValueWithOverride("BASIC", false, featureMatrix?.planOverrides, ["features", "customDomainEnabled"]) ?? false,
      pro: getValueWithOverride("PRO", true, featureMatrix?.planOverrides, ["features", "customDomainEnabled"]) ?? true,
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
      free: getValueWithOverride("FREE", 1, featureMatrix?.planOverrides, ["limits", "languagesMax"]) ?? 1,
      basic: getValueWithOverride("BASIC", 2, featureMatrix?.planOverrides, ["limits", "languagesMax"]) ?? 2,
      pro: getValueWithOverride("PRO", 3, featureMatrix?.planOverrides, ["limits", "languagesMax"]) ?? 3,
    },
    // Permissions
    {
      category: t("public.pricing.categories.permissions"),
      name: t("public.pricing.features.siteMembers"),
      free: getValueWithOverride("FREE", 2, featureMatrix?.planOverrides, ["limits", "siteMembersMax"]) ?? 2,
      basic: getValueWithOverride("BASIC", 5, featureMatrix?.planOverrides, ["limits", "siteMembersMax"]) ?? 5,
      pro: getValueWithOverride("PRO", 20, featureMatrix?.planOverrides, ["limits", "siteMembersMax"]) ?? 20,
    },
    // Admin
    {
      category: t("public.pricing.categories.admin"),
      name: t("public.pricing.features.eventLog"),
      free: getValueWithOverride("FREE", false, featureMatrix?.planOverrides, ["features", "eventLogEnabled"]) ?? false,
      basic: getValueWithOverride("BASIC", true, featureMatrix?.planOverrides, ["features", "eventLogEnabled"]) ?? true,
      pro: getValueWithOverride("PRO", true, featureMatrix?.planOverrides, ["features", "eventLogEnabled"]) ?? true,
    },
    // Push
    {
      category: t("public.pricing.categories.push"),
      name: t("public.pricing.features.pushSubscription"),
      free: getValueWithOverride("FREE", false, featureMatrix?.planOverrides, ["features", "pushSubscription"]) ?? false,
      basic: getValueWithOverride("BASIC", false, featureMatrix?.planOverrides, ["features", "pushSubscription"]) ?? false,
      pro: getValueWithOverride("PRO", t("public.pricing.features.optionalAddon"), featureMatrix?.planOverrides, ["features", "pushSubscription"]) ?? t("public.pricing.features.optionalAddon"),
    },
  ];

  const renderFeatureValue = (value: string | number | boolean): React.ReactNode => {
    if (typeof value === "boolean") {
      return value ? (
        <span style={{ 
          color: "#22c55e", 
          fontSize: "clamp(20px, 3vw, 24px)", 
          fontWeight: 700,
          fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          display: "inline-block",
        }}>✓</span>
      ) : (
        <span style={{ 
          color: "#9ca3af", 
          fontSize: "clamp(18px, 2.5vw, 20px)",
          fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          display: "inline-block",
        }}>–</span>
      );
    }
    if (typeof value === "number") {
      return <span style={{ 
        fontWeight: 700, 
        color: "#1a1a1a", 
        fontSize: "clamp(16px, 2.5vw, 20px)",
        fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display: "inline-block",
      }}>{value}</span>;
    }
    return <span style={{ 
      fontWeight: 600, 
      color: "#1a1a1a", 
      fontSize: "clamp(15px, 2.2vw, 18px)",
      fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display: "inline-block",
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
      // Enhanced Viking helmet with detailed design
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
            {/* Helmet dome - improved shape with better curves */}
            <path d="M12 3.5C8.5 3.5 5.5 5.5 5.5 8.5V12.5C5.5 14.5 6.5 16.5 8.5 17.5H15.5C17.5 16.5 18.5 14.5 18.5 12.5V8.5C18.5 5.5 15.5 3.5 12 3.5Z" fill="#8b4513" stroke="#654321" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Helmet highlight/shine */}
            <ellipse cx="12" cy="7" rx="4" ry="3" fill="#a0522d" opacity="0.4"/>
            {/* Helmet rim/brim - more defined */}
            <path d="M5.5 12.5L18.5 12.5" stroke="#654321" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M5.5 13L18.5 13" stroke="#8b4513" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
            
            {/* Enhanced metallic brow guard with gradient effect */}
            <rect x="6.5" y="7.5" width="11" height="3" rx="0.8" fill="#9ca3af" stroke="#6b7280" strokeWidth="0.8"/>
            <rect x="6.5" y="7.5" width="11" height="1.5" rx="0.8" fill="#d1d5db" opacity="0.7"/>
            {/* Decorative pattern on brow guard */}
            <path d="M8 8.5H16" stroke="#6b7280" strokeWidth="0.4" strokeLinecap="round"/>
            
            {/* Enhanced vertical metallic strip with decorative elements */}
            <rect x="11" y="3.5" width="2" height="6" rx="0.5" fill="#9ca3af" stroke="#6b7280" strokeWidth="0.5"/>
            <rect x="11" y="3.5" width="2" height="3" rx="0.5" fill="#d1d5db" opacity="0.6"/>
            
            {/* Enhanced rivets on brow guard with depth */}
            <circle cx="7.5" cy="9" r="0.9" fill="#1f2937" stroke="#111827" strokeWidth="0.3"/>
            <circle cx="7.5" cy="9" r="0.4" fill="#4b5563" opacity="0.6"/>
            <circle cx="12" cy="9" r="0.9" fill="#1f2937" stroke="#111827" strokeWidth="0.3"/>
            <circle cx="12" cy="9" r="0.4" fill="#4b5563" opacity="0.6"/>
            <circle cx="16.5" cy="9" r="0.9" fill="#1f2937" stroke="#111827" strokeWidth="0.3"/>
            <circle cx="16.5" cy="9" r="0.4" fill="#4b5563" opacity="0.6"/>
            
            {/* Rivet on vertical strip */}
            <circle cx="12" cy="6" r="0.7" fill="#1f2937" stroke="#111827" strokeWidth="0.3"/>
            <circle cx="12" cy="6" r="0.3" fill="#4b5563" opacity="0.6"/>
            
            {/* Enhanced left deer antler - more realistic with better proportions */}
            <path d="M4.5 10.5L3.5 7.5L3 5L4 3.5L5.5 4.5L6 6.5L6.5 8.5L6 10.5L5 11.5L4.5 10.5Z" fill="#a0826d" stroke="#654321" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Left antler main branch */}
            <path d="M3.5 7.5L2.5 5.5L3 4" stroke="#654321" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            {/* Left antler secondary branches */}
            <path d="M5 9.5L4.5 7.5L4 5.5" stroke="#654321" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M6 8.5L6.5 6L7 4" stroke="#654321" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M5.5 10L5.5 8L5.5 6" stroke="#654321" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            
            {/* Enhanced right deer antler - more realistic */}
            <path d="M19.5 10.5L20.5 7.5L21 5L20 3.5L18.5 4.5L18 6.5L17.5 8.5L18 10.5L19 11.5L19.5 10.5Z" fill="#a0826d" stroke="#654321" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Right antler main branch */}
            <path d="M20.5 7.5L21.5 5.5L21 4" stroke="#654321" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            {/* Right antler secondary branches */}
            <path d="M19 9.5L19.5 7.5L20 5.5" stroke="#654321" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M18 8.5L17.5 6L17 4" stroke="#654321" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M18.5 10L18.5 8L18.5 6" stroke="#654321" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            
            {/* Enhanced face guard/nose piece with better definition */}
            <path d="M9 17.5V19.5C9 20.5 9.5 21.5 10.5 21.5H13.5C14.5 21.5 15 20.5 15 19.5V17.5" stroke="#654321" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M10 17.5L10.5 19.5" stroke="#654321" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M14 17.5L13.5 19.5" stroke="#654321" strokeWidth="1.5" strokeLinecap="round"/>
            
            {/* Enhanced cheek guards with better shape */}
            <path d="M5.5 12.5L5 14.5L6 15.5L6.5 14.5" stroke="#654321" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M5.5 12.5L6 13.5" stroke="#654321" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M18.5 12.5L19 14.5L18 15.5L17.5 14.5" stroke="#654321" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M18.5 12.5L18 13.5" stroke="#654321" strokeWidth="1.5" strokeLinecap="round"/>
            
            {/* Additional decorative metalwork - side reinforcements */}
            <path d="M6.5 10L6.5 12" stroke="#6b7280" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
            <path d="M17.5 10L17.5 12" stroke="#6b7280" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
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
        position: "relative",
        overflow: "hidden",
      }}
      >
        {/* Animated background elements */}
        <div
          style={{
            position: "absolute",
            top: "-50%",
            left: "-50%",
            width: "200%",
            height: "200%",
            background: "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
            animation: "float 20s infinite linear",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "20%",
            right: "10%",
            width: "300px",
            height: "300px",
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "50%",
            filter: "blur(40px)",
            animation: "pulse 4s infinite ease-in-out",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            left: "10%",
            width: "200px",
            height: "200px",
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "50%",
            filter: "blur(30px)",
            animation: "pulse 6s infinite ease-in-out",
            animationDelay: "2s",
            pointerEvents: "none",
          }}
        />

        <style>
          {`
            @keyframes float {
              0% { transform: translate(0, 0) rotate(0deg); }
              100% { transform: translate(-50px, -50px) rotate(360deg); }
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 0.5; }
              50% { transform: scale(1.2); opacity: 0.8; }
            }
          `}
        </style>
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
                fontFamily: "Poppins, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                textShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
              }}
            >
              {pricingType === "place" 
                ? (t("public.pricing.features.placeTitle") || "Helyszín csomagok")
                : t("public.pricing.title")}
            </h1>
            <p
              style={{
                fontSize: "clamp(18px, 2.5vw, 22px)",
                color: "rgba(255, 255, 255, 0.95)",
                maxWidth: 700,
                margin: "0 auto",
                lineHeight: 1.6,
                padding: "0 16px",
                fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontWeight: 400,
              }}
            >
              {pricingType === "place"
                ? (t("public.pricing.features.placeSubtitle") || "Válassz egy csomagot a helyszíned számára")
                : t("public.pricing.subtitle")}
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
                      fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                    fontFamily: "Poppins, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                  fontFamily: "Poppins, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                      fontFamily: "Poppins, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                      fontFamily: "Poppins, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                        fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                        minHeight: "40px",
                        fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                        minHeight: "40px",
                        fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                        minHeight: "40px",
                        fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
