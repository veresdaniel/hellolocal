import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global exception filter for consistent error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  // later: add validation pipe, logging, etc.
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3002);
  // eslint-disable-next-line no-console
  console.log(`✅ API listening on http://localhost:${process.env.PORT ?? 3002}`);
}
bootstrap();
