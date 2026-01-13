// src/utils/formatTime.ts
/**
 * Format time string (HH:mm) using platform settings
 */
export function formatTime(
  time: string | null | undefined,
  settings: {
    locale: string;
    timeFormat: "24h" | "12h";
  }
): string {
  if (!time) {
    return "";
  }

  // Parse HH:mm format
  const [hours, minutes] = time.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    return time; // Return as-is if invalid
  }

  if (settings.timeFormat === "12h") {
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);

    try {
      return new Intl.DateTimeFormat(settings.locale, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(date);
    } catch (error) {
      // Fallback formatting
      const period = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
    }
  } else {
    // 24h format - return as-is (already in HH:mm format)
    return time;
  }
}
