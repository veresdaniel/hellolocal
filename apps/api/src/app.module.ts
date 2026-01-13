import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { PlacesModule } from "./places/places.module";
import { SitesModule } from "./tenants/sites.module";
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
import { PlatformSettingsModule } from "./platform-settings/platform-settings.module";
import { SiteModule } from "./site/site.module";
import { TasksModule } from "./tasks/tasks.module";
import { BillingModule } from "./billing/billing.module";
import { SeoInjectorMiddleware } from "./common/middleware/seo-injector.middleware";
import { SiteResolveMiddleware } from "./common/middleware/site-resolve.middleware";
import { CanonicalRedirectInterceptor } from "./common/interceptors/canonical-redirect.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60000, // 1 perc (milliszekundumban)
        // Fejlesztésben sokkal lazább limit, productionban szigorúbb
        limit: process.env.NODE_ENV === "production" ? 100 : 10000, // 100 kérés/perc production, 10000 fejlesztés
      },
      {
        name: "strict",
        ttl: 60000, // 1 perc
        // Auth endpoint-ok: fejlesztésben lazább, productionban szigorúbb
        limit: process.env.NODE_ENV === "production" ? 5 : 1000, // 5 kérés/perc production, 1000 fejlesztés
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
    SitesModule,
    EventsModule,
    LegalModule,
    StaticPagesModule,
    SeoModule, // SEO metadata for SSR
    NotificationsModule, // Push notifications
    PlatformSettingsModule, // Platform settings API (Brand + Site + SiteInstance merged)
    SiteModule, // Site resolver and public endpoints
    TasksModule, // Scheduled tasks (expired featured cleanup, etc.)
    BillingModule, // Billing and subscription management
  ],
  controllers: [HealthController],
  providers: [
    SeoInjectorMiddleware,
    SiteResolveMiddleware, // Site resolve middleware (canonical flow)
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CanonicalRedirectInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply site resolve middleware first (canonical flow for /:lang/:siteKey/* routes)
    // This is the core of the Site-based architecture
    consumer
      .apply(SiteResolveMiddleware)
      .forRoutes("*");
    
    // Apply SEO injector middleware to all routes except API and admin
    consumer
      .apply(SeoInjectorMiddleware)
      .forRoutes("*");
  }
}
