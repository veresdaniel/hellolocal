import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { PrismaService } from "./prisma/prisma.service";
import { isKnownPublicHostname } from "./common/is-known-public-hostname";

const CUSTOM_ORIGIN_CACHE_TTL_MS = 60_000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Caddy is one hop. req.ip then is the visitor, so the rate limit is not one bucket for the whole site.
  app.getHttpAdapter().getInstance().set("trust proxy", 1);
  const prisma = app.get(PrismaService);
  const customOriginCache = new Map<string, { ok: boolean; exp: number }>();

  // Security headers (Helmet.js)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false, // Disabled for CORS compatibility
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );

  // CORS: static env list + admin-configured custom domains (SiteDomain / customDomain).
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
    : process.env.FRONTEND_URL
      ? [process.env.FRONTEND_URL.trim()] // Fallback: használjuk FRONTEND_URL-t ha CORS_ORIGIN nincs beállítva
      : process.env.NODE_ENV === "production"
        ? [] // Productionban NINCS default, kötelező beállítani CORS_ORIGIN vagy FRONTEND_URL!
        : ["http://localhost:5173", "http://localhost:3000"]; // Dev default

  // Figyelmeztetés ha production módban nincs beállítva CORS_ORIGIN
  if (process.env.NODE_ENV === "production" && allowedOrigins.length === 0) {
    console.warn(
      "⚠️  WARNING: CORS_ORIGIN and FRONTEND_URL are not set! CORS will be disabled and frontend requests will fail!"
    );
    console.warn(
      "   Please set CORS_ORIGIN environment variable (e.g., CORS_ORIGIN=https://hello-local.io)"
    );
  }

  const isStaticAllowed = (origin: string): boolean =>
    allowedOrigins.some((allowedOrigin) => {
      if (origin === allowedOrigin) return true;
      if (allowedOrigin.startsWith("*.")) {
        const domain = allowedOrigin.substring(2);
        return (
          origin.endsWith(`.${domain}`) ||
          origin === `https://${domain}` ||
          origin === `http://${domain}`
        );
      }
      return false;
    });

  const isCustomDomainOrigin = async (origin: string): Promise<boolean> => {
    let hostname: string;
    try {
      hostname = new URL(origin).hostname;
    } catch {
      return false;
    }
    const cached = customOriginCache.get(hostname);
    if (cached && cached.exp > Date.now()) return cached.ok;
    const ok = await isKnownPublicHostname(prisma, hostname);
    customOriginCache.set(hostname, { ok, exp: Date.now() + CUSTOM_ORIGIN_CACHE_TTL_MS });
    return ok;
  };

  const originValidator = (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.length === 0) {
      console.warn(`❌ CORS blocked: Origin "${origin}" not allowed (CORS_ORIGIN not set)`);
      return callback(null, false);
    }

    if (isStaticAllowed(origin)) {
      return callback(null, true);
    }

    void isCustomDomainOrigin(origin).then(
      (ok) => {
        if (!ok) {
          console.warn(
            `❌ CORS blocked: Origin "${origin}" not in env list or admin custom domains`
          );
        }
        callback(null, ok);
      },
      () => callback(null, false)
    );
  };

  app.enableCors({
    origin: allowedOrigins.length > 0 ? originValidator : false,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Cache-Control", // Allow cache-control header for version.json requests
      "Pragma", // Allow pragma header (browser may send this)
      "Expires", // Allow expires header (browser may send this)
      "Accept", // Allow accept header (browser may send this)
      "x-uc-access", // Under-construction preview token (api.* host; cookie is host-only on web)
    ],
    exposedHeaders: ["Content-Type", "Authorization"],
    preflightContinue: false,
    optionsSuccessStatus: 204, // Some legacy browsers (IE11, various SmartTVs) choke on 204
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Throw error on unknown properties
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Auto-convert types
      },
    })
  );

  // Global exception filter for consistent error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT ? Number(process.env.PORT) : 3002;
  await app.listen(port, "0.0.0.0"); // Listen on all interfaces (Docker / reverse proxy)
}
bootstrap();
