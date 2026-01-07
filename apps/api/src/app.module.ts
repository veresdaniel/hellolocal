import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { PlacesModule } from "./places/places.module";
import { EventsModule } from "./events/events.module";
import { LegalModule } from "./legal/legal.module";
import { SlugModule } from "./slug/slug.module";
import { TenantModule } from "./tenant/tenant.module";
import { AuthModule } from "./auth/auth.module";
import { AdminModule } from "./admin/admin.module";
import { AppSettingsModule } from "./app-settings/app-settings.module";
import { TwoFactorModule } from "./two-factor/two-factor.module";
import { SeoModule } from "./seo/seo.module";
import { NotificationsModule } from "./notifications/notifications.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    TenantModule,
    SlugModule,
    AuthModule,
    TwoFactorModule,
    AppSettingsModule, // Public app settings (no auth required)
    AdminModule, // AdminModule must be imported before PlacesModule to ensure /api/admin routes take precedence
    PlacesModule,
    EventsModule,
    LegalModule,
    SeoModule, // SEO metadata for SSR
    NotificationsModule, // Push notifications
  ],
  controllers: [HealthController],
})
export class AppModule {}
