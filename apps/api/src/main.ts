import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // later: add validation pipe, logging, etc.
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3002);
  // eslint-disable-next-line no-console
  console.log(`✅ API listening on http://localhost:${process.env.PORT ?? 3002}`);
}
bootstrap();
