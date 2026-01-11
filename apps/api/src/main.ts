import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend access
  app.enableCors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  });

  // Global exception filter for consistent error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  // later: add validation pipe, logging, etc.
  const port = process.env.PORT ? Number(process.env.PORT) : 3002;
  await app.listen(port, "0.0.0.0"); // Listen on all interfaces for Render.com
}
bootstrap();
