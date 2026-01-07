// src/notifications/notifications.controller.ts
import { Controller, Post, Body, Delete, Param } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";

export interface SubscribeDto {
  tenantId: string;
  subscription: {
    endpoint: string;
    expirationTime?: number | null;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  userAgent?: string;
}

@Controller("/api/notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post("/subscribe")
  async subscribe(@Body() dto: SubscribeDto) {
    return this.notificationsService.subscribe(dto.tenantId, {
      endpoint: dto.subscription.endpoint,
      keys: dto.subscription.keys,
      userAgent: dto.userAgent,
    });
  }

  @Delete("/unsubscribe/:endpoint")
  async unsubscribe(@Param("endpoint") endpoint: string) {
    const decodedEndpoint = decodeURIComponent(endpoint);
    return this.notificationsService.unsubscribe(decodedEndpoint);
  }
}

