import { existsSync } from "fs";
import { isAbsolute, resolve } from "path";
import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { PlacesModule } from "./places/places.module";
import { TownsModule } from "./towns/towns.module";
import { SitesModule } from "./sites/sites.module";
import { EventsModule } from "./events/events.module";
import { LegalModule } from "./legal/legal.module";
import { StaticPagesModule } from "./static-pages/static-pages.module";
import { CollectionsModule } from "./collections/collections.module";
import { ProductsModule } from "./products/products.module";
import { SlugModule } from "./slug/slug.module";
import { SiteModule } from "./site/site.module";
import { AuthModule } from "./auth/auth.module";
import { AdminModule } from "./admin/admin.module";
import { AppSettingsModule } from "./app-settings/app-settings.module";
import { TwoFactorModule } from "./two-factor/two-factor.module";
import { SeoModule } from "./seo/seo.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PlatformSettingsModule } from "./platform-settings/platform-settings.module";
import { UnderConstructionModule } from "./under-construction/under-construction.module";
import { UiCopyModule } from "./ui-copy/ui-copy.module";
import { TasksModule } from "./tasks/tasks.module";
import { BillingModule } from "./billing/billing.module";
import { EntitlementsModule } from "./entitlements/entitlements.module";
import { SubscriptionModule } from "./subscription/subscription.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { QuoteModule } from "./quotes/quote.module";
import { SeoInjectorMiddleware } from "./common/middleware/seo-injector.middleware";
import { SiteResolveMiddleware } from "./common/middleware/site-resolve.middleware";
import { CanonicalRedirectInterceptor } from "./common/interceptors/canonical-redirect.interceptor";

// start:dev keeps the default .env. Staging sets ENV_FILE and must not fall through to .env.
function configEnvFilePath(): string | undefined {
  const requested = process.env.ENV_FILE?.trim();
  if (!requested) {
    return undefined;
  }
  const envFilePath = isAbsolute(requested) ? requested : resolve(process.cwd(), requested);
  if (!existsSync(envFilePath)) {
    throw new Error(
      "Cannot read ENV_FILE. For staging, copy apps/api/env.staging.example to apps/api/.env.staging and set DATABASE_URL to the beta Postgres URL."
    );
  }
  return envFilePath;
}

const envFilePath = configEnvFilePath();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ...(envFilePath ? { envFilePath } : {}),
    }),
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60000, // 1 perc (milliszekundumban)
        // Fejlesztésben sokkal lazább limit, productionban szigorúbb
        limit: process.env.NODE_ENV === "production" ? 400 : 10000, // 200 kérés/perc production, 10000 fejlesztés
      },
      {
        name: "strict",
        ttl: 60000, // 1 perc
        // Auth endpoint-ok: fejlesztésben lazább, productionban szigorúbb
        limit: process.env.NODE_ENV === "production" ? 200 : 1000, // 10 kérés/perc production, 1000 fejlesztés
      },
    ]),
    PrismaModule,
    SlugModule,
    AuthModule,
    TwoFactorModule,
    AppSettingsModule, // Public app settings (no auth required)
    UnderConstructionModule, // Public under-development gate + admin token/copy settings
    AdminModule, // AdminModule must be imported before PlacesModule to ensure /api/admin routes take precedence
    PlacesModule,
    TownsModule,
    SitesModule,
    EventsModule,
    LegalModule,
    StaticPagesModule,
    CollectionsModule, // Curated collections (public)
    ProductsModule,
    SeoModule, // SEO metadata + crawl (robots/sitemap) for SSR
    NotificationsModule, // Push notifications
    PlatformSettingsModule, // Platform settings API (Brand + Site + SiteInstance merged)
    UiCopyModule, // Public interface strings, stored per language
    SiteModule, // Site resolver and public endpoints
    TasksModule, // Scheduled tasks (expired featured cleanup, etc.)
    BillingModule, // Billing and subscription management
    EntitlementsModule, // Entitlements and subscription management
    SubscriptionModule, // Subscription lifecycle management (cancel, expire)
    AnalyticsModule,
    QuoteModule, // Analytics tracking and dashboard
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
    consumer.apply(SiteResolveMiddleware).forRoutes("*");

    // Apply SEO injector middleware to all routes except API and admin
    consumer.apply(SeoInjectorMiddleware).forRoutes("*");
  }
}
