// src/notifications/notifications.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import * as webpush from "web-push";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {
    // Configure web-push with VAPID keys
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    } else {
      this.logger.warn("VAPID keys not configured - push notifications will not work");
    }
  }

  /**
   * Subscribe a user to push notifications
   */
  async subscribe(
    siteId: string,
    subscription: {
      endpoint: string;
      keys: {
        p256dh: string;
        auth: string;
      };
      userAgent?: string;
    }
  ) {
    try {
      // Upsert subscription (update if exists, create if not)
      return await this.prisma.pushSubscription.upsert({
        where: { siteId_endpoint: { siteId, endpoint: subscription.endpoint } },
        update: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent: subscription.userAgent,
          isActive: true,
        },
        create: {
          siteId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent: subscription.userAgent,
          isActive: true,
        },
      });
    } catch (error) {
      this.logger.error("Error saving push subscription:", error);
      throw error;
    }
  }

  /**
   * Unsubscribe a user from push notifications
   */
  async unsubscribe(endpoint: string) {
    try {
      // Find subscription by endpoint (endpoint should be unique enough in practice)
      const subscription = await this.prisma.pushSubscription.findFirst({
        where: { endpoint, isActive: true },
      });

      if (subscription) {
        await this.prisma.pushSubscription.update({
          where: { id: subscription.id },
          data: { isActive: false },
        });
      }
    } catch (error) {
      this.logger.error("Error unsubscribing:", error);
      throw error;
    }
  }

  /**
   * Send notification to all subscribers of a site
   */
  async sendToSite(
    siteId: string,
    notification: {
      title: string;
      body: string;
      icon?: string;
      data?: any;
    }
  ) {
    try {
      const subscriptions = await this.prisma.pushSubscription.findMany({
        where: {
          siteId,
          isActive: true,
        },
      });

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || "/vite.svg",
        data: notification.data,
      });

      const promises = subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload
          );
          this.logger.log(`Notification sent to ${sub.endpoint}`);
        } catch (error: any) {
          this.logger.error(`Failed to send notification to ${sub.endpoint}:`, error);
          // If subscription is invalid, mark as inactive
          if (error.statusCode === 410 || error.statusCode === 404) {
            await this.prisma.pushSubscription.update({
              where: { id: sub.id },
              data: { isActive: false },
            });
          }
        }
      });

      await Promise.allSettled(promises);
      this.logger.log(`Sent notifications to ${subscriptions.length} subscribers`);
    } catch (error) {
      this.logger.error("Error sending notifications:", error);
      throw error;
    }
  }

  /**
   * Send notification about a new event
   */
  async notifyNewEvent(eventId: string) {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        include: {
          translations: true,
        },
      });

      if (!event) {
        this.logger.warn(`Event ${eventId} not found`);
        return;
      }

      // Use Hungarian translation by default, or first available
      const translation = event.translations.find((t) => t.lang === "hu") || event.translations[0];
      if (!translation) {
        this.logger.warn(`No translation found for event ${eventId}`);
        return;
      }

      await this.sendToSite(event.siteId, {
        title: "Új esemény! 🎉",
        body: translation.title,
        icon: event.heroImage || undefined,
        data: {
          type: "new_event",
          eventId: event.id,
        },
      });

      this.logger.log(`Sent new event notification for event ${eventId}`);
    } catch (error) {
      this.logger.error(`Error notifying new event ${eventId}:`, error);
    }
  }

  /**
   * Cron job to check for upcoming events and send reminders
   * Runs every 15 minutes
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkUpcomingEvents() {
    this.logger.log("Checking for upcoming events...");

    try {
      const now = new Date();
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const twoHoursAndFifteenFromNow = new Date(
        now.getTime() + 2 * 60 * 60 * 1000 + 15 * 60 * 1000
      );

      // Find events starting in 2 hours (within a 15-minute window)
      const upcomingEvents = await this.prisma.event.findMany({
        where: {
          startDate: {
            gte: twoHoursFromNow,
            lte: twoHoursAndFifteenFromNow,
          },
          isActive: true,
        },
        include: {
          translations: true,
        },
      });

      this.logger.log(`Found ${upcomingEvents.length} upcoming events`);

      for (const event of upcomingEvents) {
        // Use Hungarian translation by default, or first available
        const translation =
          event.translations.find((t) => t.lang === "hu") || event.translations[0];
        if (!translation) {
          this.logger.warn(`No translation found for event ${event.id}`);
          continue;
        }

        await this.sendToSite(event.siteId, {
          title: "Esemény hamarosan kezdődik! ⏰",
          body: `${translation.title} - 2 óra múlva`,
          icon: event.heroImage || undefined,
          data: {
            type: "event_reminder",
            eventId: event.id,
          },
        });

        this.logger.log(`Sent reminder for event ${event.id}: ${translation.title}`);
      }
    } catch (error) {
      this.logger.error("Error checking upcoming events:", error);
    }
  }
}
