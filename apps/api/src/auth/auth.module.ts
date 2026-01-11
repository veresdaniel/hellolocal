import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PrismaModule } from "../prisma/prisma.module";
import { EmailModule } from "../email/email.module";
import { TwoFactorModule } from "../two-factor/two-factor.module";
import { EventLogModule } from "../event-log/event-log.module";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    TwoFactorModule,
    EventLogModule, // Import EventLogModule to access AdminEventLogService (avoids circular dependency)
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const jwtSecret = configService.get<string>("JWT_SECRET");
        
        // Productionban kötelező JWT_SECRET
        if (!jwtSecret) {
          if (process.env.NODE_ENV === "production") {
            throw new Error(
              "JWT_SECRET must be set in production! " +
                'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
            );
          }
          console.warn("⚠️  WARNING: JWT_SECRET not set, using weak default. Only for development!");
        }

        return {
          secret: jwtSecret || "dev-secret-key-change-in-production",
          signOptions: {
            expiresIn: configService.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "15m",
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

