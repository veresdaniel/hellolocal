import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
    })
  );

  // CORS konfiguráció - productionban csak megbízható domain-ek
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
      "   Please set CORS_ORIGIN environment variable (e.g., CORS_ORIGIN=https://hellolocal-frontend.onrender.com)"
    );
  }

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Type", "Authorization"],
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
  await app.listen(port, "0.0.0.0"); // Listen on all interfaces for Render.com
}
bootstrap();
