export const UI_COPY_NAMESPACES = ["public", "common", "cookieConsent", "error", "offline", "validation"] as const;

export function flattenMessages(source: unknown, prefix: string, out: Record<string, string>) {
  if (typeof source === "string") {
    if (prefix) out[prefix] = source;
    return;
  }
  if (!source || typeof source !== "object" || Array.isArray(source)) return;
  for (const [key, value] of Object.entries(source)) {
    flattenMessages(value, prefix ? `${prefix}.${key}` : key, out);
  }
}

export function unflattenMessages(flat: Record<string, string>): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(".").filter(Boolean);
    if (!parts.length) continue;
    let node = root;
    for (let index = 0; index < parts.length - 1; index += 1) {
      const part = parts[index];
      const next = node[part];
      if (!next || typeof next !== "object") node[part] = {};
      node = node[part] as Record<string, unknown>;
    }
    node[parts[parts.length - 1]] = value;
  }
  return root;
}
