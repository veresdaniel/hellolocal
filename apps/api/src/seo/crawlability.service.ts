/**
 * Injectable wrapper around AppSetting `globalCrawlability` + {@link allowsCrawl}.
 * Prefer this in Nest services; pure helper stays in `./crawlability`.
 */
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { allowsCrawl } from "./crawlability";

@Injectable()
export class CrawlabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /** Master crawl switch; default true when unset. */
  async isGlobalOn(): Promise<boolean> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: "globalCrawlability" },
    });
    if (setting && setting.type === "boolean") {
      return setting.value === "true";
    }
    return true;
  }

  /**
   * Whether content may be indexed: global on AND entity `own` is not explicitly false.
   * @param own Per-entity/site crawl flag (`null`/`undefined` = allowed when global on)
   */
  async allows(own?: boolean | null): Promise<boolean> {
    return allowsCrawl(await this.isGlobalOn(), own);
  }
}
