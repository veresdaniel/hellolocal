// subscription.controller.ts
import { Controller, Get, Put, Param, Body } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("/api/:lang/admin/sites")
export class AdminSiteSubscriptionController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(":siteId/subscription")
  async get(@Param("siteId") siteId: string) {
    return (
      (await this.prisma.siteSubscription.findUnique({ 
        where: { siteId } 
      })) ?? {
        plan: "FREE",
        status: "ACTIVE",
        validUntil: null,
        note: null,
      }
    );
  }

  @Put(":siteId/subscription")
  async update(
    @Param("siteId") siteId: string,
    @Body() body: { 
      plan: "FREE" | "BASIC" | "PRO"; 
      status: "ACTIVE" | "SUSPENDED" | "EXPIRED"; 
      validUntil?: string | null; 
      note?: string | null;
    }
  ) {
    return this.prisma.siteSubscription.upsert({
      where: { siteId },
      create: {
        siteId,
        plan: body.plan,
        status: body.status,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        note: body.note ?? null,
      },
      update: {
        plan: body.plan,
        status: body.status,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        note: body.note ?? null,
      },
    });
  }
}
