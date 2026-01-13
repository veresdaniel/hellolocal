// google.strategy.ts
import { Injectable, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    private readonly configService: ConfigService
  ) {
    const clientID = configService.get<string>("GOOGLE_CLIENT_ID") || "";
    const clientSecret = configService.get<string>("GOOGLE_CLIENT_SECRET") || "";
    
    // Get API URL from environment or construct from PORT
    const apiPort = configService.get<string>("PORT") || "3002";
    const apiUrl = configService.get<string>("API_URL") || `http://localhost:${apiPort}`;
    const callbackURL = configService.get<string>("GOOGLE_CALLBACK_URL") || `${apiUrl}/api/auth/google/callback`;

    super({
      clientID: clientID || "dummy-client-id",
      clientSecret: clientSecret || "dummy-client-secret",
      callbackURL,
      scope: ["email", "profile"],
    });

    // Log callback URL for debugging
    this.logger.log(`Google OAuth callback URL: ${callbackURL}`);

    // Warn if credentials are missing but don't prevent route registration
    if (!clientID || !clientSecret) {
      this.logger.warn(
        "⚠️  Google OAuth credentials not configured. " +
        "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables to enable Google login."
      );
    } else {
      this.logger.log("Google OAuth credentials configured");
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback
  ): Promise<any> {
    try {
      if (!profile || !profile.emails || !profile.emails[0]) {
        this.logger.error("Google OAuth profile missing email");
        return done(new Error("Google profile missing email"), undefined);
      }

      const { name, emails, photos } = profile;
      const user = {
        email: emails[0].value,
        firstName: name?.givenName || "",
        lastName: name?.familyName || "",
        picture: photos?.[0]?.value,
        accessToken,
      };
      
      this.logger.log(`Google OAuth successful for user: ${user.email}`);
      done(null, user);
    } catch (error) {
      this.logger.error("Error in Google OAuth validate", error);
      done(error instanceof Error ? error : new Error("Google OAuth validation failed"), undefined);
    }
  }
}
