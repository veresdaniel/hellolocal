import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { AuthService, JwtPayload } from "../auth.service";

/**
 * Passport strategy: Bearer JWT → {@link AuthService.validateUser}.
 * Requires `JWT_SECRET` in production; uses a weak default only in development.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService
  ) {
    const jwtSecret = configService.get<string>("JWT_SECRET");

    // Productionban kötelező JWT_SECRET
    if (!jwtSecret) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "JWT_SECRET must be set in production! " +
            "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
        );
      }
      console.warn("⚠️  WARNING: JWT_SECRET not set, using weak default. Only for development!");
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret || "dev-secret-key-change-in-production",
    });
  }

  /**
   * Attach the DB user to `req.user` after signature verification.
   * @throws UnauthorizedException when the user no longer exists or is inactive
   */
  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
