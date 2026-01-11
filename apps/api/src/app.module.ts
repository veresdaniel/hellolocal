import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { PlacesModule } from "./places/places.module";
import { TenantsModule } from "./tenants/tenants.module";
import { EventsModule } from "./events/events.module";
import { LegalModule } from "./legal/legal.module";
import { StaticPagesModule } from "./static-pages/static-pages.module";
import { SlugModule } from "./slug/slug.module";
import { TenantModule } from "./tenant/tenant.module";
import { AuthModule } from "./auth/auth.module";
import { AdminModule } from "./admin/admin.module";
import { AppSettingsModule } from "./app-settings/app-settings.module";
import { TwoFactorModule } from "./two-factor/two-factor.module";
import { SeoModule } from "./seo/seo.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { SeoInjectorMiddleware } from "./common/middleware/seo-injector.middleware";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 perc (milliszekundumban)
        limit: 10, // 10 kérés percenként (globális limit)
      },
    ]),
    PrismaModule,
    TenantModule,
    SlugModule,
    AuthModule,
    TwoFactorModule,
    AppSettingsModule, // Public app settings (no auth required)
    AdminModule, // AdminModule must be imported before PlacesModule to ensure /api/admin routes take precedence
    PlacesModule,
    TenantsModule,
    EventsModule,
    LegalModule,
    StaticPagesModule,
    SeoModule, // SEO metadata for SSR
    NotificationsModule, // Push notifications
  ],
  controllers: [HealthController],
  providers: [
    SeoInjectorMiddleware,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply SEO injector middleware to all routes except API and admin
    consumer
      .apply(SeoInjectorMiddleware)
      .forRoutes("*");
  }
}
