import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { frontendOrigin, asPublicLang } from "./public-path.util";

const GRAPH_VERSION = "v21.0";
const MAX_URLS = 10;

export type FacebookScrapeStatus = "not_configured" | "success" | "error" | "invalid_url";

export type FacebookScrapeItemResult = {
  url: string;
  status: FacebookScrapeStatus;
  message: string;
  /** Raw Graph API body when Facebook responded (success or error). */
  facebook?: unknown;
};

export type FacebookScrapeBatchResult = {
  configured: boolean;
  /** True only when every requested URL scraped successfully. */
  ok: boolean;
  results: FacebookScrapeItemResult[];
};

/**
 * Best-effort Facebook Open Graph cache refresh via Graph API
 * `POST /?id={url}&scrape=true` (requires an access token; app token is enough).
 * @see https://developers.facebook.com/docs/graph-api/reference/url/
 */
@Injectable()
export class FacebookOgScrapeService {
  private readonly logger = new Logger(FacebookOgScrapeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** True when FACEBOOK_APP_ID and FACEBOOK_APP_SECRET are both set. */
  isConfigured(): boolean {
    return Boolean(this.appId() && this.appSecret());
  }

  /** Admin UI probe — never exposes secret values. */
  status(): { configured: boolean; appIdPresent: boolean; appSecretPresent: boolean } {
    return {
      configured: this.isConfigured(),
      appIdPresent: Boolean(this.appId()),
      appSecretPresent: Boolean(this.appSecret()),
    };
  }

  /**
   * Scrape one or more public URLs (max {@link MAX_URLS}).
   * Side effect: outbound POSTs to Graph API. Never reports `ok` when credentials are missing.
   * @param rawUrls Absolute http(s) URLs; http is upgraded to https except localhost.
   */
  async scrapeUrls(rawUrls: string[]): Promise<FacebookScrapeBatchResult> {
    const urls = this.normalizeUrls(rawUrls);
    if (!urls.length) {
      return {
        configured: this.isConfigured(),
        ok: false,
        results: [
          {
            url: "",
            status: "invalid_url",
            message: "No valid https URL provided",
          },
        ],
      };
    }

    if (!this.isConfigured()) {
      return {
        configured: false,
        ok: false,
        results: urls.map((url) => ({
          url,
          status: "not_configured" as const,
          message:
            "Facebook scrape skipped: set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET on the API. Use Sharing Debugger manually until then.",
        })),
      };
    }

    const token = `${this.appId()}|${this.appSecret()}`;
    const results: FacebookScrapeItemResult[] = [];
    for (const url of urls) {
      results.push(await this.scrapeOne(url, token));
    }
    return {
      configured: true,
      ok: results.every((r) => r.status === "success"),
      results,
    };
  }

  /**
   * Public homepage URL(s) for a site (one per active translation language).
   * Prefers custom/primary domain (`https://{host}/{lang}`); else platform path `/{lang}/{slug}`.
   */
  async urlsForSite(siteId: string): Promise<string[]> {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: {
        slug: true,
        primaryDomain: true,
        siteDomains: { select: { domain: true, isPrimary: true }, take: 20 },
        translations: { select: { lang: true }, take: 20 },
      },
    });
    if (!site) return [];

    const domain =
      site.primaryDomain ||
      site.siteDomains.find((row) => row.isPrimary)?.domain ||
      site.siteDomains[0]?.domain ||
      null;
    const langs = site.translations.map((t) => asPublicLang(t.lang));
    const uniqueLangs = [...new Set(langs.length ? langs : ["hu" as const])];

    if (domain) {
      const host = domain.replace(/^https?:\/\//i, "").split("/")[0]?.toLowerCase();
      if (!host) return [];
      return uniqueLangs.map((lang) => `https://${host}/${lang}`);
    }

    const origin = frontendOrigin().replace(/\/$/, "");
    return uniqueLangs.map((lang) => `${origin}/${lang}/${site.slug}`);
  }

  /**
   * Resolve public homepage URLs for `siteId` then scrape each (best-effort).
   * Auth: caller must already be an admin controller; this service does not check roles.
   * Missing Graph credentials → `not_configured` results (never fake success).
   */
  async scrapeSite(siteId: string): Promise<FacebookScrapeBatchResult> {
    const urls = await this.urlsForSite(siteId);
    if (!urls.length) {
      return {
        configured: this.isConfigured(),
        ok: false,
        results: [
          {
            url: "",
            status: "invalid_url",
            message: "Site not found or has no public URL",
          },
        ],
      };
    }
    return this.scrapeUrls(urls);
  }

  private appId(): string {
    return String(process.env.FACEBOOK_APP_ID || "").trim();
  }

  private appSecret(): string {
    return String(process.env.FACEBOOK_APP_SECRET || "").trim();
  }

  /** Dedupe, prefer https, cap at {@link MAX_URLS}. Invalid / non-http(s) entries are dropped. */
  private normalizeUrls(rawUrls: string[]): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const raw of rawUrls) {
      const cleaned = String(raw || "").trim();
      if (!cleaned) continue;
      let parsed: URL;
      try {
        parsed = new URL(cleaned);
      } catch {
        continue;
      }
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") continue;
      // Prefer https for public OG URLs
      if (parsed.protocol === "http:" && !/^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname)) {
        parsed.protocol = "https:";
      }
      const href = parsed.toString().replace(/\/$/, "") || parsed.origin;
      if (seen.has(href)) continue;
      seen.add(href);
      out.push(href);
      if (out.length >= MAX_URLS) break;
    }
    return out;
  }

  /**
   * Single Graph `scrape=true` POST (15s timeout). Treats HTTP errors and Graph `error` bodies as failure.
   */
  private async scrapeOne(url: string, accessToken: string): Promise<FacebookScrapeItemResult> {
    const endpoint = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/`);
    endpoint.searchParams.set("id", url);
    endpoint.searchParams.set("scrape", "true");
    endpoint.searchParams.set("access_token", accessToken);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(endpoint.toString(), {
        method: "POST",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        const message = graphErrorMessage(body) || `Facebook scrape HTTP ${response.status}`;
        this.logger.warn(`Facebook scrape failed for ${url}: ${message}`);
        return { url, status: "error", message, facebook: body ?? undefined };
      }
      // Graph may return 200 with an error object
      if (body && typeof body === "object" && "error" in (body as object)) {
        const message = graphErrorMessage(body) || "Facebook scrape rejected the URL";
        this.logger.warn(`Facebook scrape error for ${url}: ${message}`);
        return { url, status: "error", message, facebook: body };
      }
      return {
        url,
        status: "success",
        message: "Facebook re-scraped the URL",
        facebook: body ?? undefined,
      };
    } catch (error) {
      const message =
        error instanceof Error && error.name === "AbortError"
          ? "Facebook scrape timed out"
          : error instanceof Error
            ? error.message
            : String(error);
      this.logger.warn(`Facebook scrape exception for ${url}: ${message}`);
      return { url, status: "error", message };
    } finally {
      clearTimeout(timer);
    }
  }
}

function graphErrorMessage(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const err = (body as { error?: { message?: string; type?: string; code?: number } }).error;
  if (!err) return "";
  const parts = [err.message, err.type ? `(${err.type})` : "", err.code != null ? `[${err.code}]` : ""]
    .filter(Boolean)
    .join(" ");
  return parts.trim();
}
