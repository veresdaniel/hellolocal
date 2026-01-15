import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { useAnalyticsStore } from "../../stores/analyticsStore";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { COLORS as APP_COLORS, GRADIENTS, BREAKPOINTS } from "../../app/colors";
import { BREAKPOINTS as VIEWPORT_BREAKPOINTS } from "../../utils/viewport";

type Props =
  | { scope: "site" }
  | { scope: "place"; placeId: string }
  | { scope: "event"; eventId: string };

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.08,
      duration: 0.4,
      type: "spring",
      stiffness: 100,
    },
  }),
};

const chartVariants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

// Gradient colors for charts (using centralized constants)
const GRADIENT_COLORS = [
  { start: GRADIENTS.primary.start, end: GRADIENTS.primary.end },
  { start: GRADIENTS.success.start, end: GRADIENTS.success.end },
  { start: GRADIENTS.info.start, end: GRADIENTS.info.end },
  { start: GRADIENTS.warning.start, end: GRADIENTS.warning.end },
];

// Count-up animation component
function AnimatedNumber({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const startValue = display;
    const endValue = value;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const current = Math.round(startValue + (endValue - startValue) * progress);
      setDisplay(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{display}</span>;
}

// Custom tooltip with gradient background
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%)",
          backdropFilter: "blur(10px)",
          border: "none",
          borderRadius: "12px",
          padding: "12px 16px",
          color: "white",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
        }}
      >
        <p style={{ margin: "0 0 8px 0", fontWeight: 600, fontSize: "14px" }}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p
            key={index}
            style={{
              margin: "4px 0",
              fontSize: "13px",
              opacity: 0.9,
            }}
          >
            <span style={{ color: entry.color, fontWeight: 600 }}>●</span> {entry.name}:{" "}
            <span style={{ fontWeight: 600 }}>{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function AnalyticsDashboard(props: Props) {
  const { t } = useTranslation();
  const [range, setRange] = useState<7 | 30 | 90>(7);
  const { loading, error, site, place, event, fetchSite, fetchPlace, fetchEvent } = useAnalyticsStore();
  const params = useParams<{ lang?: string }>();
  const lang = params.lang || "hu";
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < VIEWPORT_BREAKPOINTS.tablet;
  });
  const [isTablet, setIsTablet] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth >= VIEWPORT_BREAKPOINTS.tablet && window.innerWidth < VIEWPORT_BREAKPOINTS.desktop;
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < VIEWPORT_BREAKPOINTS.tablet);
      setIsTablet(width >= VIEWPORT_BREAKPOINTS.tablet && width < VIEWPORT_BREAKPOINTS.desktop);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (props.scope === "site") {
      fetchSite(range, lang);
    } else if (props.scope === "place") {
      fetchPlace(props.placeId, range, lang);
    } else if (props.scope === "event") {
      fetchEvent(props.eventId, range, lang);
    }
  }, [props, range, lang, fetchSite, fetchPlace, fetchEvent]);

  const data = props.scope === "site" ? site : props.scope === "place" ? place : event;
  const isSiteScope = props.scope === "site";

  const kpis = useMemo(() => {
    if (!data) return [];
    if (props.scope === "site") {
      const siteData = data as { summary: { pageViews: number; placeViews: number; ctaPhone: number; ctaEmail: number; ctaWebsite: number; ctaMaps: number } };
      return [
        {
          label: "Page Views",
          value: siteData.summary.pageViews ?? 0,
          icon: "👁️",
          color: APP_COLORS.primary,
          gradient: GRADIENT_COLORS[0],
        },
        {
          label: "Place Views",
          value: siteData.summary.placeViews ?? 0,
          icon: "📍",
          color: APP_COLORS.success,
          gradient: GRADIENT_COLORS[1],
        },
        {
          label: "CTA Clicks",
          value:
            (siteData.summary.ctaPhone +
              siteData.summary.ctaEmail +
              siteData.summary.ctaWebsite +
              siteData.summary.ctaMaps) || 0,
          icon: "🖱️",
          color: APP_COLORS.info,
          gradient: GRADIENT_COLORS[2],
        },
        {
          label: "Unique Visitors",
          value: 0, // TODO: implement unique visitors
          icon: "👥",
          color: APP_COLORS.purple,
          gradient: GRADIENT_COLORS[3],
        },
      ];
    }
    if (props.scope === "place") {
      const placeData = data as { summary: { placeViews: number; ctaTotal: number; conversionPct: number }; days: number };
      return [
        {
          label: "Place Views",
          value: placeData.summary.placeViews ?? 0,
          icon: "📍",
          color: APP_COLORS.primary,
          gradient: GRADIENT_COLORS[0],
        },
        {
          label: "CTA Clicks",
          value: placeData.summary.ctaTotal ?? 0,
          icon: "🖱️",
          color: APP_COLORS.success,
          gradient: GRADIENT_COLORS[1],
        },
        {
          label: "Conversion Rate",
          value: `${placeData.summary.conversionPct ?? 0}%`,
          icon: "📈",
          color: APP_COLORS.info,
          gradient: GRADIENT_COLORS[2],
        },
        {
          label: "Time Range",
          value: `${placeData.days ?? range} days`,
          icon: "📅",
          color: APP_COLORS.purple,
          gradient: GRADIENT_COLORS[3],
        },
      ];
    }
    // Event scope
    const eventData = data as { summary: { eventViews: number; ctaTotal: number; conversionPct: number }; days: number };
    return [
      {
        label: "Event Views",
        value: eventData.summary.eventViews ?? 0,
        icon: "📅",
        color: APP_COLORS.primary,
        gradient: GRADIENT_COLORS[0],
      },
      {
        label: "CTA Clicks",
        value: eventData.summary.ctaTotal ?? 0,
        icon: "🖱️",
        color: APP_COLORS.success,
        gradient: GRADIENT_COLORS[1],
      },
      {
        label: "Conversion Rate",
        value: `${eventData.summary.conversionPct ?? 0}%`,
        icon: "📈",
        color: APP_COLORS.info,
        gradient: GRADIENT_COLORS[2],
      },
      {
        label: "Time Range",
        value: `${eventData.days ?? range} days`,
        icon: "📅",
        color: APP_COLORS.purple,
        gradient: GRADIENT_COLORS[3],
      },
    ];
  }, [data, props.scope, range]);

  const ctaBars = useMemo(() => {
    if (!data) return [];
    const s = data.ctaBreakdown;
    return [
      { name: t("admin.analytics.ctaPhone"), value: s.ctaPhone ?? 0, color: APP_COLORS.success },
      { name: t("admin.analytics.ctaEmail"), value: s.ctaEmail ?? 0, color: APP_COLORS.info },
      { name: t("admin.analytics.ctaWebsite"), value: s.ctaWebsite ?? 0, color: APP_COLORS.primary },
      { name: t("admin.analytics.ctaMaps"), value: s.ctaMaps ?? 0, color: APP_COLORS.warning },
      { name: t("admin.analytics.ctaFloorplan") || "Floorplan", value: s.ctaFloorplan ?? 0, color: APP_COLORS.secondary },
    ];
  }, [data, t]);

  const pieData = useMemo(() => {
    if (!data) return [];
    const total = ctaBars.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return [];
    return ctaBars.map((item) => ({
      name: item.name,
      value: item.value,
      percentage: ((item.value / total) * 100).toFixed(1),
    }));
  }, [ctaBars, data]);

  return (
    <div style={{ padding: "clamp(16px, 4vw, 24px)", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Range selector */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}
      >
        <RangeButton active={range === 7} onClick={() => setRange(7)}>
          7d
        </RangeButton>
        <RangeButton active={range === 30} onClick={() => setRange(30)}>
          30d
        </RangeButton>
        <RangeButton active={range === 90} onClick={() => setRange(90)}>
          90d
        </RangeButton>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
          style={{
            padding: "clamp(16px, 4vw, 20px)",
            background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
            color: "#991b1b",
            borderRadius: "16px",
            border: "2px solid #fca5a5",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontWeight: 500,
            boxShadow: "0 4px 12px rgba(239, 68, 68, 0.15)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: "-8px",
          }}
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            style={{
              fontSize: "24px",
              flexShrink: 0,
            }}
          >
            ⚠️
          </motion.div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: "clamp(15px, 3.5vw, 17px)" }}>
              {t("admin.analytics.failedToLoad")}
            </div>
            <div style={{ opacity: 0.85, fontSize: "clamp(13px, 3vw, 15px)", lineHeight: 1.5 }}>
              {error}
            </div>
          </div>
        </motion.div>
      )}

      {/* KPI Cards with gradient backgrounds */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr"
            : isTablet
            ? "repeat(2, 1fr)"
            : "repeat(4, 1fr)",
          gap: "16px",
        }}
      >
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="show"
            whileHover={{ scale: 1.02, y: -4 }}
            style={{
              background: `linear-gradient(135deg, ${k.gradient.start} 0%, ${k.gradient.end} 100%)`,
              borderRadius: "20px",
              padding: "24px",
              color: "white",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Decorative circle */}
            <div
              style={{
                position: "absolute",
                top: -20,
                right: -20,
                width: "100px",
                height: "100px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.1)",
                filter: "blur(20px)",
              }}
            />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: "28px" }}>{k.icon}</span>
                <div style={{ fontSize: "13px", opacity: 0.9, fontWeight: 500 }}>{k.label}</div>
              </div>
              <div
                style={{
                  fontSize: "clamp(28px, 6vw, 36px)",
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                {loading ? (
                  <span style={{ opacity: 0.7 }}>…</span>
                ) : typeof k.value === "number" ? (
                  <AnimatedNumber value={k.value} />
                ) : (
                  k.value
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main charts grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
          gap: "24px",
        }}
      >
        {/* Area Chart - Trend */}
        <motion.div
          variants={chartVariants}
          initial="hidden"
          animate="show"
          style={{
            background: "white",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
            border: "1px solid rgba(0, 0, 0, 0.05)",
          }}
        >
          <h3 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 20px 0", color: "#1f2937" }}>
            📈 {t("admin.analytics.trafficTrend")}
          </h3>
          {(!data?.timeseries || data.timeseries.length === 0) ? (
            <div
              style={{
                height: "320px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9ca3af",
                fontSize: "14px",
              }}
            >
              {t("admin.analytics.noDataYet")}
            </div>
          ) : (
            <div style={{ height: "320px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.timeseries}>
                <defs>
                  <linearGradient id="colorPageViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={APP_COLORS.primary} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={APP_COLORS.primary} stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="colorPlaceViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={APP_COLORS.success} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={APP_COLORS.success} stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                <XAxis
                  dataKey="day"
                  stroke="#9ca3af"
                  style={{ fontSize: "12px" }}
                  tick={{ fill: "#6b7280" }}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: "12px" }} tick={{ fill: "#6b7280" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: "20px" }}
                  iconType="circle"
                  formatter={(value) => <span style={{ color: "#374151" }}>{value}</span>}
                />
                {props.scope === "site" ? (
                  <>
                    <Area
                      type="monotone"
                      dataKey="pageViews"
                      stroke={APP_COLORS.primary}
                      strokeWidth={3}
                      fill="url(#colorPageViews)"
                      name={t("admin.analytics.pageViews")}
                      animationDuration={1000}
                    />
                    <Area
                      type="monotone"
                      dataKey="placeViews"
                      stroke={APP_COLORS.success}
                      strokeWidth={3}
                      fill="url(#colorPlaceViews)"
                      name={t("admin.analytics.placeViews")}
                      animationDuration={1000}
                    />
                  </>
                ) : props.scope === "place" ? (
                  <>
                    <Area
                      type="monotone"
                      dataKey="placeViews"
                      stroke={APP_COLORS.primary}
                      strokeWidth={3}
                      fill="url(#colorPageViews)"
                      name={t("admin.analytics.placeViews")}
                      animationDuration={1000}
                    />
                    <Area
                      type="monotone"
                      dataKey="ctaTotal"
                      stroke={APP_COLORS.success}
                      strokeWidth={3}
                      fill="url(#colorPlaceViews)"
                      name={t("admin.analytics.ctaClicks")}
                      animationDuration={1000}
                    />
                  </>
                ) : (
                  <>
                    <Area
                      type="monotone"
                      dataKey="eventViews"
                      stroke={APP_COLORS.primary}
                      strokeWidth={3}
                      fill="url(#colorPageViews)"
                      name={t("admin.analytics.eventViews") || "Event Views"}
                      animationDuration={1000}
                    />
                    <Area
                      type="monotone"
                      dataKey="ctaTotal"
                      stroke={APP_COLORS.success}
                      strokeWidth={3}
                      fill="url(#colorPlaceViews)"
                      name={t("admin.analytics.ctaClicks")}
                      animationDuration={1000}
                    />
                  </>
                )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Pie Chart - CTA Distribution */}
        <motion.div
          variants={chartVariants}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.1 }}
          style={{
            background: "white",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
            border: "1px solid rgba(0, 0, 0, 0.05)",
          }}
        >
          <h3 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 20px 0", color: "#1f2937" }}>
            🎯 {t("admin.analytics.ctaDistribution")}
          </h3>
          {pieData.length > 0 ? (
            <div style={{ height: "320px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    animationDuration={1000}
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={ctaBars[index]?.color || APP_COLORS.primary}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div
              style={{
                height: "320px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9ca3af",
                fontSize: "14px",
              }}
            >
              {t("admin.analytics.noDataYet")}
            </div>
          )}
        </motion.div>
      </div>

      {/* Bottom row: Bar chart and Top places */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
          gap: "24px",
        }}
      >
        {/* Bar Chart - CTA Breakdown */}
        <motion.div
          variants={chartVariants}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.15 }}
          style={{
            background: "white",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
            border: "1px solid rgba(0, 0, 0, 0.05)",
          }}
        >
          <h3 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 20px 0", color: "#1f2937" }}>
            📊 {t("admin.analytics.ctaBreakdown")}
          </h3>
          {ctaBars.length === 0 || ctaBars.every((bar) => bar.value === 0) ? (
            <div
              style={{
                height: "280px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9ca3af",
                fontSize: "14px",
              }}
            >
              {t("admin.analytics.noDataYet")}
            </div>
          ) : (
            <div style={{ height: "280px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ctaBars} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                <XAxis type="number" stroke="#9ca3af" style={{ fontSize: "12px" }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#9ca3af"
                  style={{ fontSize: "12px" }}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="value"
                  radius={[0, 12, 12, 0]}
                  animationDuration={1000}
                >
                  {ctaBars.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Top Places */}
        <motion.div
          variants={chartVariants}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.2 }}
          style={{
            background: "white",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
            border: "1px solid rgba(0, 0, 0, 0.05)",
          }}
        >
          <h3 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 20px 0", color: "#1f2937" }}>
            🏆 {t("admin.analytics.topPlaces")}
          </h3>
          {props.scope !== "site" ? (
            <div
              style={{
                color: "#9ca3af",
                fontSize: "14px",
                textAlign: "center",
                padding: "40px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "280px",
              }}
            >
              {t("admin.analytics.onlyAvailableOnSite")}
            </div>
          ) : (
            <div style={{ maxHeight: "280px", overflowY: "auto" }}>
              {(site?.topPlaces ?? []).length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {(site?.topPlaces ?? []).slice(0, 10).map((p, index) => (
                    <motion.a
                      key={p.placeId}
                      href={`/${lang}/admin/places/${p.placeId}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + index * 0.05 }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      style={{
                        display: "block",
                        background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
                        borderRadius: "12px",
                        padding: "16px",
                        border: "1px solid #e5e7eb",
                        textDecoration: "none",
                        color: "inherit",
                        transition: "all 0.2s",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#1f2937",
                          marginBottom: "6px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.name}
                      </div>
                      <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#6b7280" }}>
                        <span>
                          👁️ <strong>{p.placeViews}</strong> {t("admin.analytics.placeViews").toLowerCase()}
                        </span>
                        <span>
                          🖱️ <strong>{p.ctaTotal}</strong> {t("admin.analytics.ctaClicks").toLowerCase()}
                        </span>
                      </div>
                    </motion.a>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    color: "#9ca3af",
                    fontSize: "14px",
                    textAlign: "center",
                    padding: "40px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "280px",
                  }}
                >
                  {t("admin.analytics.noDataYet")}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function RangeButton(props: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      onClick={props.onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        padding: "10px 20px",
        borderRadius: "12px",
        border: "none",
        fontSize: "14px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s",
        ...(props.active
          ? {
              background: GRADIENTS.primary.css,
              color: "white",
              boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)",
            }
          : {
              background: "white",
              color: "#6b7280",
              border: "1px solid #e5e7eb",
            }),
      }}
    >
      {props.children}
    </motion.button>
  );
}
