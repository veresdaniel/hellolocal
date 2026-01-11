// src/common/middleware/seo-injector.middleware.ts
import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { readFileSync } from "fs";
import { join } from "path";

@Injectable()
export class SeoInjectorMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SeoInjectorMiddleware.name);
  private readonly indexHtmlPath: string;
  private readonly frontendUrl: string;
  private readonly apiUrl: string;

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
    // Path to the built frontend index.html
    // Adjust this path based on your deployment structure
    this.indexHtmlPath = process.env.FRONTEND_BUILD_PATH || 
      join(process.cwd(), "../web/dist/index.html");
    
    this.frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    this.apiUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 3002}`;
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Only process GET requests
    if (req.method !== "GET") {
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

  private async handleBotRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Parse URL to extract lang, tenant, and path
      const urlPath = req.path;
      const pathParts = urlPath.split("/").filter(Boolean);

      // Extract language (first part, should be hu/en/de)
      const lang = pathParts[0] && ["hu", "en", "de"].includes(pathParts[0])
        ? pathParts[0]
        : "hu";

      // Extract tenant key (second part, if exists and not a known route)
      const knownRoutes = ["place", "event", "blog", "tudastar", "infok", "imprint", "terms", "privacy"];
      const tenantKey = pathParts[1] && !knownRoutes.includes(pathParts[1])
        ? pathParts[1]
        : undefined;

      // Extract route type and slug
      const routeIndex = tenantKey ? 2 : 1;
      const routeType = pathParts[routeIndex];
      const slug = pathParts[routeIndex + 1];

      // Fetch SEO metadata
      type SeoData = {
        title: string;
        description: string;
        image: string;
        url: string;
        type: string;
        siteName: string;
      };
      let seoData: SeoData | null = null;

      try {
        let seoUrl: string;
        if (routeType === "place" && slug) {
          // Place detail page
          seoUrl = `${this.apiUrl}/api/seo/${lang}/place/${slug}${tenantKey ? `?tenantKey=${encodeURIComponent(tenantKey)}` : ""}`;
        } else if (routeType === "event" && slug) {
          // Event detail page
          seoUrl = `${this.apiUrl}/api/seo/${lang}/event/${slug}${tenantKey ? `?tenantKey=${encodeURIComponent(tenantKey)}` : ""}`;
        } else {
          // Homepage or other pages
          seoUrl = `${this.apiUrl}/api/seo/${lang}${tenantKey ? `?tenantKey=${encodeURIComponent(tenantKey)}` : ""}`;
        }

        // Use fetch with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(seoUrl, {
          signal: controller.signal,
          headers: {
            "Accept": "application/json",
          },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const jsonData = await response.json() as unknown;
          // Type guard to validate the response structure
          if (
            jsonData &&
            typeof jsonData === "object" &&
            "title" in jsonData &&
            "description" in jsonData &&
            "image" in jsonData &&
            "url" in jsonData &&
            "type" in jsonData &&
            "siteName" in jsonData &&
            typeof (jsonData as any).title === "string" &&
            typeof (jsonData as any).description === "string" &&
            typeof (jsonData as any).image === "string" &&
            typeof (jsonData as any).url === "string" &&
            typeof (jsonData as any).type === "string" &&
            typeof (jsonData as any).siteName === "string"
          ) {
            seoData = jsonData as SeoData;
          } else {
            this.logger.warn(
              `Invalid SEO data structure received for ${req.path}`
            );
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
          this.logger.warn(
            `Failed to fetch SEO data for ${req.path}: ${errorMessage}`
          );
        }
        // Continue with default HTML if SEO fetch fails
      }

      // Read and inject meta tags into index.html
      let html = this.readIndexHtml();

      if (seoData) {
        html = this.injectMetaTags(html, seoData);
      }

      // Send the modified HTML
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error in SEO injector: ${errorMessage}`, errorStack);
      // Fallback to normal request
      next();
    }
  }

  private readIndexHtml(): string {
    try {
      return readFileSync(this.indexHtmlPath, "utf-8");
    } catch (error) {
      this.logger.warn(
        `Could not read index.html from ${this.indexHtmlPath}, using fallback`
      );
      // Return a minimal HTML fallback
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HelloLocal</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;
    }
  }

  private injectMetaTags(html: string, seoData: {
    title: string;
    description: string;
    image: string;
    url: string;
    type: string;
    siteName: string;
  }): string {
    // Escape HTML entities
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

    // Default image dimensions (Facebook recommended: 1200x630px)
    // If image dimensions are provided in seoData, use them; otherwise use defaults
    const imageWidth = (seoData as any).imageWidth || "1200";
    const imageHeight = (seoData as any).imageHeight || "630";

    // Build meta tags
    const metaTags = `
    <!-- SEO Meta Tags (injected by middleware) -->
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

    // Inject meta tags into <head>
    // Try to find existing <head> tag
    if (html.includes("<head>")) {
      // Insert after <head>
      html = html.replace("<head>", `<head>${metaTags}`);
    } else if (html.includes("</head>")) {
      // Insert before </head>
      html = html.replace("</head>", `${metaTags}</head>`);
    } else {
      // No head tag found, prepend to HTML
      html = `<head>${metaTags}</head>${html}`;
    }

    // Also update existing title if present
    html = html.replace(
      /<title>.*?<\/title>/i,
      `<title>${title}</title>`
    );

    return html;
  }
}
