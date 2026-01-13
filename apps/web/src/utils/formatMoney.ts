// src/utils/formatMoney.ts
/**
 * Format money amount using platform settings
 */
export function formatMoney(
  amount: number | null | undefined,
  settings: {
    locale: string;
    currency: string;
  }
): string {
  if (amount === null || amount === undefined) {
    return "";
  }

  try {
    return new Intl.NumberFormat(settings.locale, {
      style: "currency",
      currency: settings.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback formatting
    return `${amount} ${settings.currency}`;
  }
}
