// src/admin/event-log.helper.ts
import { AdminEventLogService } from "../event-log/admin-eventlog.service";
import { Lang } from "@prisma/client";

/**
 * Helper function to log admin actions with detailed descriptions
 * This should be called after successful create/update/delete operations
 */
export async function logAdminAction(
  eventLogService: AdminEventLogService | undefined,
  siteId: string,
  userId: string,
  action: "create" | "update" | "delete",
  entityType: string,
  entityId: string,
  description?: string,
  metadata?: any
): Promise<void> {
  if (!eventLogService) {
    return; // Service not available, skip logging
  }

  try {
    await eventLogService.create({
      siteId,
      userId,
      action,
      entityType,
      entityId,
      description: description || `${action} ${entityType} ${entityId}`,
      metadata,
    });
  } catch (error) {
    // Don't fail the main operation if logging fails
    console.error("Failed to log admin action:", error);
  }
}

/**
 * Extract entity name from translations (supports multiple languages)
 */
export function getEntityName(
  translations?: Array<{ lang: Lang | string; name: string }> | null,
  defaultName?: string
): string {
  if (!translations || translations.length === 0) {
    return defaultName || "Unknown";
  }

  // Try to get Hungarian first, then English, then German, then any
  const langPriority = [Lang.hu, Lang.en, Lang.de];
  for (const lang of langPriority) {
    const translation = translations.find((t) => t.lang === lang);
    if (translation?.name) {
      return translation.name;
    }
  }

  // Fallback to first available translation
  return translations[0]?.name || defaultName || "Unknown";
}

/**
 * Format entity name with languages
 */
export function formatEntityNameWithLanguages(
  translations?: Array<{ lang: Lang | string; name: string }> | null,
  defaultName?: string
): string {
  if (!translations || translations.length === 0) {
    return defaultName || "Unknown";
  }

  const parts: string[] = [];
  const langPriority = [Lang.hu, Lang.en, Lang.de];

  for (const lang of langPriority) {
    const translation = translations.find((t) => t.lang === lang);
    if (translation?.name) {
      parts.push(`'${translation.name}' (${lang.toUpperCase()})`);
    }
  }

  if (parts.length === 0) {
    return defaultName || "Unknown";
  }

  return parts.join(", ");
}

/**
 * Generate detailed description for create action
 */
export function generateCreateDescription(
  entityType: string,
  translations?: Array<{ lang: Lang | string; name: string }> | null,
  additionalInfo?: Record<string, any>
): string {
  let name: string;
  if (translations && translations.length > 0) {
    name = formatEntityNameWithLanguages(translations);
  } else if (additionalInfo?.username || additionalInfo?.email) {
    // For users without translations
    const userParts: string[] = [];
    if (additionalInfo.username) userParts.push(additionalInfo.username);
    if (additionalInfo.email) userParts.push(`(${additionalInfo.email})`);
    if (additionalInfo.firstName || additionalInfo.lastName) {
      userParts.push(`${additionalInfo.firstName || ""} ${additionalInfo.lastName || ""}`.trim());
    }
    name = userParts.length > 0 ? userParts.join(" ") : "Unknown";
  } else {
    name = additionalInfo?.name || "Unknown";
  }

  const parts = [`Created ${entityType} ${name}`];

  if (additionalInfo) {
    const infoParts: string[] = [];
    if (additionalInfo.isActive !== undefined && entityType !== "user") {
      infoParts.push(`active: ${additionalInfo.isActive}`);
    }
    if (additionalInfo.plan) {
      infoParts.push(`plan: ${additionalInfo.plan}`);
    }
    if (additionalInfo.role) {
      infoParts.push(`role: ${additionalInfo.role}`);
    }
    if (additionalInfo.category) {
      infoParts.push(`category: ${additionalInfo.category}`);
    }
    if (additionalInfo.pageKey) {
      infoParts.push(`key: ${additionalInfo.pageKey}`);
    }
    // Feature subscription specific fields
    if (entityType === "featureSubscription") {
      if (additionalInfo.featureKey) {
        infoParts.push(`feature: ${additionalInfo.featureKey}`);
      }
      if (additionalInfo.planKey) {
        infoParts.push(`plan: ${additionalInfo.planKey}`);
      }
      if (additionalInfo.scope) {
        infoParts.push(`scope: ${additionalInfo.scope}`);
      }
      if (additionalInfo.billingPeriod) {
        infoParts.push(`billing: ${additionalInfo.billingPeriod}`);
      }
    }
    if (infoParts.length > 0) {
      parts.push(`(${infoParts.join(", ")})`);
    }
  }

  return parts.join(" ");
}

/**
 * Generate detailed description for update action
 */
export function generateUpdateDescription(
  entityType: string,
  translations?: Array<{ lang: Lang | string; name: string }> | null,
  oldData?: any,
  newData?: any,
  explicitChanges?: Record<string, { from: any; to: any }>
): string {
  let name: string;
  if (translations && translations.length > 0) {
    name = formatEntityNameWithLanguages(translations);
  } else if (oldData?.username || oldData?.email || newData?.username || newData?.email) {
    // For users without translations
    const userData = newData || oldData;
    const userParts: string[] = [];
    if (userData.username) userParts.push(userData.username);
    if (userData.email) userParts.push(`(${userData.email})`);
    if (userData.firstName || userData.lastName) {
      userParts.push(`${userData.firstName || ""} ${userData.lastName || ""}`.trim());
    }
    name = userParts.length > 0 ? userParts.join(" ") : "Unknown";
  } else {
    name = (newData || oldData)?.name || "Unknown";
  }

  const changes: string[] = [];

  // Compare translations/names
  if (oldData?.translations && newData?.translations) {
    const oldNames = formatEntityNameWithLanguages(oldData.translations);
    const newNames = formatEntityNameWithLanguages(newData.translations);
    if (oldNames !== newNames) {
      changes.push(`name: ${oldNames} → ${newNames}`);
    }
  }

  // Compare user-specific fields
  if (entityType === "user") {
    const userFields = ["firstName", "lastName", "email", "username", "role", "isActive"];
    for (const field of userFields) {
      if (oldData?.[field] !== undefined && newData?.[field] !== undefined) {
        const oldValue = oldData[field];
        const newValue = newData[field];
        if (oldValue !== newValue) {
          changes.push(`${field}: ${formatValue(oldValue)} → ${formatValue(newValue)}`);
        }
      }
    }
  }

  // Compare simple fields
  const fieldsToCompare = [
    "isActive",
    "isFeatured",
    "plan",
    "categoryId",
    "townId",
    "priceBandId",
    "color",
    "order",
    "category",
    "isPublished",
    "placeId",
    "startDate",
    "endDate",
  ];

  for (const field of fieldsToCompare) {
    if (oldData?.[field] !== undefined && newData?.[field] !== undefined) {
      const oldValue = oldData[field];
      const newValue = newData[field];
      if (oldValue !== newValue) {
        changes.push(`${field}: ${formatValue(oldValue)} → ${formatValue(newValue)}`);
      }
    }
  }

  // Handle feature subscription specific fields
  if (entityType === "featureSubscription") {
    const featureFields = ["planKey", "billingPeriod", "status", "scope", "featureKey"];
    for (const field of featureFields) {
      if (oldData?.[field] !== undefined && newData?.[field] !== undefined) {
        const oldValue = oldData[field];
        const newValue = newData[field];
        if (oldValue !== newValue) {
          changes.push(`${field}: ${formatValue(oldValue)} → ${formatValue(newValue)}`);
        }
      }
    }
  }

  // Add explicit changes if provided (for complex changes like scope)
  if (explicitChanges) {
    for (const [field, change] of Object.entries(explicitChanges)) {
      changes.push(`${field}: ${formatValue(change.from)} → ${formatValue(change.to)}`);
    }
  }

  if (changes.length === 0) {
    return `Updated ${entityType} ${name || "subscription"}`;
  }

  return `Updated ${entityType} ${name || "subscription"}: ${changes.join(", ")}`;
}

/**
 * Generate detailed description for delete action
 */
export function generateDeleteDescription(
  entityType: string,
  translations?: Array<{ lang: Lang | string; name: string }> | null,
  additionalInfo?: Record<string, any>
): string {
  let name: string;
  if (translations && translations.length > 0) {
    name = formatEntityNameWithLanguages(translations);
  } else if (additionalInfo?.username || additionalInfo?.email) {
    // For users without translations
    const userParts: string[] = [];
    if (additionalInfo.username) userParts.push(additionalInfo.username);
    if (additionalInfo.email) userParts.push(`(${additionalInfo.email})`);
    if (additionalInfo.firstName || additionalInfo.lastName) {
      userParts.push(`${additionalInfo.firstName || ""} ${additionalInfo.lastName || ""}`.trim());
    }
    name = userParts.length > 0 ? userParts.join(" ") : "Unknown";
  } else {
    name = additionalInfo?.name || "Unknown";
  }
  return `Deleted ${entityType} ${name}`;
}

/**
 * Format value for display in logs
 */
function formatValue(value: any): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "boolean") return value.toString();
  if (typeof value === "number") return value.toString();
  if (typeof value === "string") return `'${value}'`;
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
