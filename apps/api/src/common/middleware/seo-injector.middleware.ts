/**
 * Nest SEO injector for bot/crawler HTML responses.
 *
 * Production public HTML for crawlers is served by apps/web/server.js (Caddy → web),
 * which uses apps/web/ssr/socialMeta.js with host-scoped og:url / og:image.
 * This middleware stays registered for legacy/dev when Nest serves the SPA; keep
 * request-host / publicOrigin behavior aligned with socialMeta.js so a dual path
 * never emits FRONTEND_URL as og:url on a custom domain.
 *
 * If FRONTEND_BUILD_PATH / index.html is missing (typical API-only prod container),
 * the middleware no-ops (next()) and does not invent HTML.
 */
import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  publicOriginFromHeaders,
  rebasePublicUrl,
  requestHostname,
  requestProto,
} from "../../seo/public-path.util";

@Injectable()
export class SeoInjectorMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SeoInjectorMiddleware.name);
  private readonly indexHtmlPath: string;
  private readonly apiUrl: string;
  private readonly indexHtmlAvailable: boolean;

  // Bot/crawler user agents
  private readonly botUserAgents = [
    "facebookexternalhit",
    "Facebot",
    "Twitterbot",
    "LinkedInBot",
    "WhatsApp",
    "TelegramBot",
    "Slackbot",
    "SkypeUriPreview",
    "Googlebot",
    "Bingbot",
    "Slurp",
    "DuckDuckBot",
    "Baiduspider",
    "YandexBot",
    "Sogou",
    "Exabot",
    "ia_archiver",
    "Applebot",
    "facebookexternalhit/1.1",
    "facebookexternalhit/1.0",
    "Twitterbot/1.0",
    "LinkedInBot/1.0",
  ];

  constructor() {
    this.indexHtmlPath =
      process.env.FRONTEND_BUILD_PATH || join(process.cwd(), "../web/dist/index.html");
    this.apiUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 3002}`;
    this.indexHtmlAvailable = existsSync(this.indexHtmlPath);
    if (!this.indexHtmlAvailable) {
      this.logger.log(
        `SEO injector idle: no SPA shell at ${this.indexHtmlPath} (prod crawlers use apps/web/server.js)`
      );
    }
  }

  /**
   * Nest middleware entry: bots only, when SPA shell exists.
   * Prod public crawlers normally hit apps/web/server.js instead.
   */
  use(req: Request, res: Response, next: NextFunction) {
    // Only process GET requests
    if (req.method !== "GET") {
      return next();
    }

    // Skip when Nest is not serving the SPA (production API container).
    if (!this.indexHtmlAvailable) {
      return next();
    }

    // Skip API routes, admin routes, and static assets
    if (
      req.path.startsWith("/api") ||
      req.path.startsWith("/admin") ||
      req.path.startsWith("/_") ||
      req.path.includes(".") // Static files (has extension)
    ) {
      return next();
    }

    // Check if user agent is a bot/crawler
    const userAgent = req.get("user-agent") || "";
    const isBot = this.botUserAgents.some((bot) =>
      userAgent.toLowerCase().includes(bot.toLowerCase())
    );

    if (!isBot) {
      return next();
    }

    this.logger.log(`Bot detected: ${userAgent} - Processing: ${req.path}`);

    // Process the request asynchronously
    this.handleBotRequest(req, res, next).catch((err) => {
      this.logger.error(`Error handling bot request: ${err.message}`, err.stack);
      // Fallback to normal request if SEO injection fails
      return next();
    });
  }

  /**
   * Fetch `/api/seo/...` with forwarded host, rebase og:url/image onto request origin, send HTML.
   * Falls through to `next()` when the shell is missing or injection fails.
   */
  private async handleBotRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const origin = publicOriginFromHeaders({
        host: req.get("host") || undefined,
        "x-forwarded-host": req.get("x-forwarded-host") || undefined,
        "x-forwarded-proto": req.get("x-forwarded-proto") || undefined,
      });
      const forwardHost = requestHostname({
        host: req.get("host") || undefined,
        "x-forwarded-host": req.get("x-forwarded-host") || undefined,
      });
      const forwardProto = requestProto({
        "x-forwarded-proto": req.get("x-forwarded-proto") || undefined,
      });

      // Parse URL to extract lang, tenant, and path
      const urlPath = req.path;
      const pathParts = urlPath.split("/").filter(Boolean);

      // Extract language (first part, should be hu/en/de)
      const lang = pathParts[0]?.match(/^[a-z]{2,3}$/) ? pathParts[0] : "hu";

      // Extract tenant key (second part, if exists and not a known route)
      const knownRoutes = [
        "place",
        "hely",
        "ort",
        "town",
        "telepules",
        "gemeinde",
        "lista",
        "list",
        "liste",
        "terkep",
        "map",
        "karte",
        "event",
        "blog",
        "tudastar",
        "infok",
        "imprint",
        "terms",
        "privacy",
        "impresszum",
        "aszf",
        "adatvedelem",
        "impressum",
        "agb",
        "datenschutz",
        "attekintes",
        "overview",
        "ueberblick",
        "tema",
        "pricing",
        "tarife",
        "preise",
        "admin",
        "teruletek",
        "regiok",
        "regions",
        "regionen",
        "products",
        "collections",
        "static-pages",
        "static-page",
        "offline",
      ];
      const tenantKey =
        pathParts[1] && !knownRoutes.includes(pathParts[1]) ? pathParts[1] : undefined;

      // Extract route type and slug
      const routeIndex = tenantKey ? 2 : 1;
      const routeType = pathParts[routeIndex];
      const slug = pathParts[routeIndex + 1];
      const isPlaceRoute =
        routeType === "place" || routeType === "hely" || routeType === "ort";

      // Fetch SEO metadata
      type SeoData = {
        title: string;
        description: string;
        image: string;
        url: string;
        type: string;
        siteName: string;
        schemaOrg?: unknown;
        imageWidth?: string;
        imageHeight?: string;
      };
      let seoData: SeoData | null = null;

      try {
        let seoUrl: string;
        if (isPlaceRoute && slug) {
          seoUrl = `${this.apiUrl}/api/seo/${lang}/place/${slug}${tenantKey ? `?tenantKey=${encodeURIComponent(tenantKey)}` : ""}`;
        } else if (routeType === "event" && slug) {
          seoUrl = `${this.apiUrl}/api/seo/${lang}/event/${slug}${tenantKey ? `?tenantKey=${encodeURIComponent(tenantKey)}` : ""}`;
        } else {
          seoUrl = `${this.apiUrl}/api/seo/${lang}${tenantKey ? `?tenantKey=${encodeURIComponent(tenantKey)}` : ""}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(seoUrl, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            // Prefer request host over FRONTEND_URL (same as server.js → socialMeta).
            ...(forwardHost
              ? {
                  "X-Forwarded-Host": forwardHost,
                  "X-Forwarded-Proto": forwardProto,
                }
              : {}),
          },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const jsonData = (await response.json()) as unknown;
          if (
            jsonData &&
            typeof jsonData === "object" &&
            "title" in jsonData &&
            "description" in jsonData &&
            "image" in jsonData &&
            "url" in jsonData &&
            "type" in jsonData &&
            "siteName" in jsonData &&
            typeof (jsonData as SeoData).title === "string" &&
            typeof (jsonData as SeoData).description === "string" &&
            typeof (jsonData as SeoData).image === "string" &&
            typeof (jsonData as SeoData).url === "string" &&
            typeof (jsonData as SeoData).type === "string" &&
            typeof (jsonData as SeoData).siteName === "string"
          ) {
            seoData = jsonData as SeoData;
            // Force og:url / relative images onto the request origin (host-scoped OG).
            seoData = {
              ...seoData,
              url: rebasePublicUrl(seoData.url || req.path, origin),
              image: seoData.image
                ? /^https?:\/\//i.test(seoData.image) || seoData.image.startsWith("//")
                  ? seoData.image.startsWith("//")
                    ? `https:${seoData.image}`
                    : seoData.image
                  : rebasePublicUrl(seoData.image, origin)
                : "",
            };
          } else {
            this.logger.warn(`Invalid SEO data structure received for ${req.path}`);
          }
        } else {
          this.logger.warn(
            `Failed to fetch SEO data for ${req.path}: ${response.status} ${response.statusText}`
          );
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          this.logger.warn(`SEO fetch timeout for ${req.path}`);
        } else {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Failed to fetch SEO data for ${req.path}: ${errorMessage}`);
        }
      }

      let html = this.readIndexHtml();
      if (!html) {
        return next();
      }

      if (seoData) {
        html = this.injectMetaTags(html, seoData);
      }

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error in SEO injector: ${errorMessage}`, errorStack);
      next();
    }
  }

  /** Read SPA shell from FRONTEND_BUILD_PATH; null → pass-through (API-only containers). */
  private readIndexHtml(): string | null {
    try {
      return readFileSync(this.indexHtmlPath, "utf-8");
    } catch {
      this.logger.warn(`Could not read index.html from ${this.indexHtmlPath}; passing through`);
      return null;
    }
  }

  /**
   * Inject title/description/OG/Twitter/canonical (+ optional JSON-LD) into `<head>`.
   * Prefer apps/web/ssr/socialMeta.js in production — this path is legacy/dev aligned.
   */
  private injectMetaTags(
    html: string,
    seoData: {
      title: string;
      description: string;
      image: string;
      url: string;
      type: string;
      siteName: string;
      schemaOrg?: unknown;
      imageWidth?: string;
      imageHeight?: string;
    }
  ): string {
    const escapeHtml = (text: string) => {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const title = escapeHtml(seoData.title);
    const description = escapeHtml(seoData.description);
    const image = escapeHtml(seoData.image);
    const url = escapeHtml(seoData.url);
    const siteName = escapeHtml(seoData.siteName);
    const imageWidth = seoData.imageWidth || "1200";
    const imageHeight = seoData.imageHeight || "630";

    const metaTags = `
    <!-- SEO Meta Tags (Nest seo-injector; prefer apps/web/server.js in prod) -->
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="${seoData.type}">
    <meta property="og:url" content="${url}">
    <meta property="og:site_name" content="${siteName}">
    ${image ? `<meta property="og:image" content="${image}">` : ""}
    ${image ? `<meta property="og:image:width" content="${imageWidth}">` : ""}
    ${image ? `<meta property="og:image:height" content="${imageHeight}">` : ""}
    <meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    ${image ? `<meta name="twitter:image" content="${image}">` : ""}
    <link rel="canonical" href="${url}">
    <!-- End SEO Meta Tags -->`;

    let jsonLdScript = "";
    if (seoData.schemaOrg) {
      const jsonLd = JSON.stringify(seoData.schemaOrg, null, 2).replace(/</g, "\\u003c");
      jsonLdScript = `
    <!-- Schema.org JSON-LD (injected by middleware) -->
    <script type="application/ld+json">${jsonLd}</script>
    <!-- End Schema.org JSON-LD -->`;
    }

    const allTags = metaTags + jsonLdScript;
    if (html.includes("<head>")) {
      html = html.replace("<head>", `<head>${allTags}`);
    } else if (html.includes("</head>")) {
      html = html.replace("</head>", `${allTags}</head>`);
    } else {
      html = `<head>${allTags}</head>${html}`;
    }

    html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);

    return html;
  }
}
