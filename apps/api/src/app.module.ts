import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { PlacesModule } from "./places/places.module";
import { LegalModule } from "./legal/legal.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    PlacesModule,
    LegalModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
