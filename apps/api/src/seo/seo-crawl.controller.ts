import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { RobotsService } from "./robots.service";
import { SitemapService, type SitemapChunk } from "./sitemap.service";
import { SitemapScopeResolver } from "./sitemap-scope";
import { isProductionSeoEnvironment, SEO_CACHE_TTL_SECONDS } from "./public-path.util";

/**
 * Crawl governance endpoints used by the frontend server (proxied to /robots.txt
 * and /sitemap*.xml on the public host). Also reachable at /api/seo/* for debugging.
 *
 * Host scope is resolved at request time from Host / X-Forwarded-Host against admin
 * SiteDomain / customDomain rows — new domains work without redeploy.
 */
@Controller("/api/seo")
export class SeoCrawlController {
  constructor(
    private readonly robotsService: RobotsService,
    private readonly sitemapService: SitemapService,
    private readonly scopeResolver: SitemapScopeResolver
  ) {}

  @Get("robots.txt")
  @Header("Content-Type", "text/plain; charset=utf-8")
  @Header("Cache-Control", `public, max-age=${SEO_CACHE_TTL_SECONDS}`)
  async robots(@Req() req: Request): Promise<string> {
    const scope = await this.scopeResolver.resolveFromHeaders(req.headers);
    return this.robotsService.buildRobotsTxt(scope);
  }

  @Get("sitemap.xml")
  async sitemapIndex(@Req() req: Request, @Res() res: Response): Promise<void> {
    if (!isProductionSeoEnvironment()) {
      res.status(404).type("text/plain").send("Sitemap is only available in production");
      return;
    }
    const scope = await this.scopeResolver.resolveFromHeaders(req.headers);
    const xml = await this.sitemapService.buildIndexXml(scope);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", `public, max-age=${SEO_CACHE_TTL_SECONDS}`);
    res.send(xml);
  }

  @Get([
    "sitemap-static.xml",
    "sitemap-sites.xml",
    "sitemap-places.xml",
    "sitemap-events.xml",
    "sitemap-towns.xml",
    "sitemap-pages.xml",
    "sitemap-collections.xml",
  ])
  async sitemapChunk(@Req() req: Request, @Res() res: Response): Promise<void> {
    if (!isProductionSeoEnvironment()) {
      res.status(404).type("text/plain").send("Sitemap is only available in production");
      return;
    }
    const match = req.path.match(/sitemap-([a-z]+)\.xml$/);
    const chunk = match?.[1] as SitemapChunk | undefined;
    if (!chunk || !this.sitemapService.chunks().includes(chunk)) {
      throw new NotFoundException(`Unknown sitemap chunk`);
    }
    const scope = await this.scopeResolver.resolveFromHeaders(req.headers);
    const xml = await this.sitemapService.buildChunkXml(scope, chunk);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", `public, max-age=${SEO_CACHE_TTL_SECONDS}`);
    res.send(xml);
  }
}
