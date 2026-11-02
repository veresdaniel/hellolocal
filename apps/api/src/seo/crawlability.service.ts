import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { allowsCrawl } from "./crawlability";

@Injectable()
export class CrawlabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async isGlobalOn(): Promise<boolean> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: "globalCrawlability" },
    });
    if (setting && setting.type === "boolean") {
      return setting.value === "true";
    }
    return true;
  }

  async allows(own?: boolean | null): Promise<boolean> {
    return allowsCrawl(await this.isGlobalOn(), own);
  }
}
