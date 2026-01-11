// src/components/OpeningHoursEditor.tsx
import { useTranslation } from "react-i18next";

export interface OpeningHour {
  dayOfWeek: number; // 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
  isClosed: boolean;
  openTime: string;
  closeTime: string;
}

interface OpeningHoursEditorProps {
  value: OpeningHour[];
  onChange: (hours: OpeningHour[]) => void;
}

const defaultHours: OpeningHour[] = [
  { dayOfWeek: 0, isClosed: false, openTime: "09:00", closeTime: "17:00" },
  { dayOfWeek: 1, isClosed: false, openTime: "09:00", closeTime: "17:00" },
  { dayOfWeek: 2, isClosed: false, openTime: "09:00", closeTime: "17:00" },
  { dayOfWeek: 3, isClosed: false, openTime: "09:00", closeTime: "17:00" },
  { dayOfWeek: 4, isClosed: false, openTime: "09:00", closeTime: "17:00" },
  { dayOfWeek: 5, isClosed: true, openTime: "", closeTime: "" },
  { dayOfWeek: 6, isClosed: true, openTime: "", closeTime: "" },
];

export function OpeningHoursEditor({ value, onChange }: OpeningHoursEditorProps) {
  const { t } = useTranslation();

  // Initialize with default hours if value is empty
  const hours = value.length === 7 ? value : defaultHours;

  // Helper function to get day name translation
  const getDayName = (dayOfWeek: number): string => {
    const dayNames: Record<number, string> = {
      0: t("common.dayOfWeek.0"),
      1: t("common.dayOfWeek.1"),
      2: t("common.dayOfWeek.2"),
      3: t("common.dayOfWeek.3"),
      4: t("common.dayOfWeek.4"),
      5: t("common.dayOfWeek.5"),
      6: t("common.dayOfWeek.6"),
    };
    return dayNames[dayOfWeek] || `Day ${dayOfWeek}`;
  };

  const handleDayChange = (dayIndex: number, field: "isClosed" | "openTime" | "closeTime", newValue: boolean | string) => {
    const newHours = [...hours];
    if (field === "isClosed") {
      newHours[dayIndex].isClosed = newValue as boolean;
      if (newValue) {
        // Clear times when closed
        newHours[dayIndex].openTime = "";
        newHours[dayIndex].closeTime = "";
      }
    } else {
      newHours[dayIndex][field] = newValue as string;
    }
    onChange(newHours);
  };

  const inputStyle: React.CSSProperties = {
    padding: "clamp(10px, 2vw, 12px)",
    fontSize: "clamp(13px, 3vw, 14px)",
    border: "1px solid #4c4f69",
    borderRadius: "8px",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    color: "#f0f0ff",
    outline: "none",
    transition: "all 0.3s ease",
    width: "100%",
    boxSizing: "border-box",
  };

  const checkboxStyle: React.CSSProperties = {
    width: "18px",
    height: "18px",
    cursor: "pointer",
    accentColor: "#667eea",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "clamp(13px, 3vw, 14px)",
    fontWeight: 600,
    color: "#333",
    minWidth: "clamp(70px, 15vw, 100px)",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "clamp(12px, 2vw, 16px)",
        padding: "clamp(16px, 3vw, 20px)",
        background: "rgba(255, 255, 255, 0.03)",
        borderRadius: "12px",
        border: "1px solid rgba(102, 126, 234, 0.2)",
      }}
    >
      <div
        style={{
          fontSize: "clamp(13px, 3vw, 14px)",
          color: "#666",
          marginBottom: "8px",
        }}
      >
        {t("common.openingHoursHint")}
      </div>
      
      {hours.map((hour, index) => (
        <div
          key={hour.dayOfWeek}
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "clamp(8px, 2vw, 12px)",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <label style={labelStyle}>
            {getDayName(hour.dayOfWeek)}:
          </label>
          
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flex: "1",
              minWidth: "200px",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "clamp(12px, 2.5vw, 13px)",
                color: "#333",
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontWeight: 500,
              }}
            >
              <input
                type="checkbox"
                checked={hour.isClosed}
                onChange={(e) => handleDayChange(index, "isClosed", e.target.checked)}
                style={checkboxStyle}
              />
              {t("common.closed")}
            </label>
            
            {!hour.isClosed && (
              <>
                <input
                  type="time"
                  value={hour.openTime}
                  onChange={(e) => handleDayChange(index, "openTime", e.target.value)}
                  style={{ ...inputStyle, maxWidth: "120px" }}
                  placeholder={t("common.openTime")}
                />
                <span style={{ color: "#666", fontSize: "14px", fontWeight: 500 }}>-</span>
                <input
                  type="time"
                  value={hour.closeTime}
                  onChange={(e) => handleDayChange(index, "closeTime", e.target.value)}
                  style={{ ...inputStyle, maxWidth: "120px" }}
                  placeholder={t("common.closeTime")}
                />
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
