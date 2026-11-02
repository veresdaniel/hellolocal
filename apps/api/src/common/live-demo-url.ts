/** AppSetting key. Empty keeps the region list as the “see it live” target. */
export const LIVE_DEMO_URL_KEY = "platform.liveDemoUrl";

/** A full https address, or a site path such as /hu/regiok. */
export function normalizeLiveDemoUrl(raw: string): { url: string } | { error: string } {
  const value = raw.trim();
  if (!value) return { url: "" };
  if (value.startsWith("/") && !value.startsWith("//") && !/[\s\\]/.test(value)) {
    return { url: value };
  }
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { error: value };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { error: value };
  if (!url.hostname.includes(".")) return { error: value };
  return { url: url.toString() };
}
