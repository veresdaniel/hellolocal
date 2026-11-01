import { Controller, Get, Header, NotFoundException, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { RobotsService } from "./robots.service";
import { SitemapService, type SitemapChunk } from "./sitemap.service";

/**
 * Crawl governance endpoints used by the frontend server (proxied to /robots.txt
 * and /sitemap*.xml on the public host). Also reachable at /api/seo/* for debugging.
 */
@Controller("/api/seo")
export class SeoCrawlController {
  constructor(
    private readonly robotsService: RobotsService,
    private readonly sitemapService: SitemapService
  ) {}

  @Get("robots.txt")
  @Header("Content-Type", "text/plain; charset=utf-8")
  @Header("Cache-Control", "public, max-age=3600")
  async robots(): Promise<string> {
    return this.robotsService.buildRobotsTxt();
  }

  @Get("sitemap.xml")
  @Header("Content-Type", "application/xml; charset=utf-8")
  @Header("Cache-Control", "public, max-age=1800")
  async sitemapIndex(): Promise<string> {
    return this.sitemapService.buildIndexXml();
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
    const match = req.path.match(/sitemap-([a-z]+)\.xml$/);
    const chunk = match?.[1] as SitemapChunk | undefined;
    if (!chunk || !this.sitemapService.chunks().includes(chunk)) {
      throw new NotFoundException(`Unknown sitemap chunk`);
    }
    const xml = await this.sitemapService.buildChunkXml(chunk);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=1800");
    res.send(xml);
  }
}
