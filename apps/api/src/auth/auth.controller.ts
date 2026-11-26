import {
  Body,
  Controller,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { RequestWithSite } from "../common/middleware/site-resolve.middleware";
import { langFromPath, langOrDefault } from "../common/lang";
import { assertPublicFormShield } from "../common/public-form-shield";
import { API_AUTH_BASE } from "@hellolocal/shared";
import {
  decodeOAuthReturnState,
  defaultOAuthFrontendOrigin,
  oauthLoginPath,
  type OAuthReturnMode,
} from "./oauth-return.util";

/**
 * Authentication controller.
 * Handles user registration, login, password reset, and token refresh.
 */
@Controller(API_AUTH_BASE)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user.
   * If siteId is not provided, user is assigned to the site from the request context
   * (determined by domain or URL-based site resolution).
   * Falls back to referer-based resolution if request context is not available.
   */
  @Get("/username-available")
  @Throttle({ strict: { limit: 30, ttl: 60000 } })
  async usernameAvailable(@Query("username") username = "") {
    return this.authService.usernameAvailable(username);
  }

  @Post("/register")
  @Throttle({ strict: { limit: 3, ttl: 60000 } }) // 3 kérés percenként (strict throttler)
  async register(@Body() dto: RegisterDto, @Req() req: RequestWithSite) {
    await assertPublicFormShield(dto);
    const referer = req.headers.referer || req.headers.origin;
    const forwarded = req.headers["x-forwarded-for"];
    const ip =
      req.ip ||
      (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : undefined) ||
      req.socket?.remoteAddress;
    const userAgent = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null;
    return this.authService.register(dto, req.site?.siteId, referer, { ip, userAgent });
  }

  /**
   * Login with email and password.
   * Returns access token and refresh token.
   */
  @Post("/login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 5, ttl: 60000 } }) // 5 kérés percenként (brute-force védelem, strict throttler)
  async login(@Body() dto: LoginDto) {
    // Captcha optional: a misconfigured site-key domain must not lock admins out.
    await assertPublicFormShield(dto, { captcha: "optional" });
    return this.authService.login(dto);
  }

  /**
   * Request password reset.
   * Generates reset token (in production, would send email).
   */
  @Post("/forgot-password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 3, ttl: 60000 } }) // 3 kérés percenként (strict throttler)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await assertPublicFormShield(dto, { captcha: "optional" });
    return this.authService.forgotPassword(dto);
  }

  /**
   * Reset password using reset token.
   */
  @Post("/reset-password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 3, ttl: 60000 } }) // 3 kérés percenként (strict throttler)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await assertPublicFormShield(dto, { captcha: "optional" });
    return this.authService.resetPassword(dto);
  }

  /**
   * Refresh access token using refresh token.
   */
  @Post("/refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 10, ttl: 60000 } }) // 10 kérés percenként (normál használat, strict throttler)
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  /**
   * Logout current user.
   * Invalidates refresh token.
   */
  @Post("/logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: { id: string; siteIds?: string[] }) {
    return this.authService.logout(user.id, user.siteIds);
  }

  /**
   * Initiate Google OAuth login.
   * Redirects to Google OAuth consent screen.
   * Query: `returnOrigin`, `lang`, `mode` (`admin`|`visitor`) → packed into OAuth `state`.
   */
  @Get("/google")
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Guard redirects to Google
  }

  /**
   * Google OAuth callback.
   * Handles the redirect from Google after authentication.
   * Redirects to the originating frontend host with tokens in the URL hash.
   */
  @Get("/google/callback")
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const returnCtx = await this.resolveOAuthReturn(req);
    const loginPath = oauthLoginPath(returnCtx.lang, returnCtx.mode);
    const loginBase = `${returnCtx.origin}${loginPath}`;

    if (!req.user) {
      const error = req.query.error;
      const errorDescription = req.query.error_description;
      const errorMsg = error
        ? `Google OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ""}`
        : "Google OAuth authentication failed";
      return res.redirect(`${loginBase}?error=${encodeURIComponent(errorMsg)}`);
    }

    const googleUser = req.user as {
      email: string;
      firstName: string;
      lastName: string;
      picture?: string;
    };

    try {
      const authResponse = await this.authService.googleLogin(googleUser);
      const tokens = encodeURIComponent(
        JSON.stringify({
          accessToken: authResponse.accessToken,
          refreshToken: authResponse.refreshToken,
          user: authResponse.user,
        })
      );
      return res.redirect(`${loginBase}#googleAuth=success&tokens=${tokens}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Google authentication failed";
      return res.redirect(`${loginBase}?error=${encodeURIComponent(errorMessage)}`);
    }
  }

  /**
   * Prefer OAuth `state` (return origin from the login page). Fall back to FRONTEND_URL.
   */
  private async resolveOAuthReturn(req: Request): Promise<{
    origin: string;
    lang: ReturnType<typeof langOrDefault>;
    mode: OAuthReturnMode;
  }> {
    const fallbackOrigin = defaultOAuthFrontendOrigin();
    const fromState = decodeOAuthReturnState(req.query.state);
    const lang =
      fromState?.lang ||
      langFromPath(typeof req.headers.referer === "string" ? req.headers.referer : "") ||
      langOrDefault(undefined);
    const mode: OAuthReturnMode = fromState?.mode === "visitor" ? "visitor" : "admin";

    if (fromState?.origin && (await this.authService.isAllowedOAuthReturnOrigin(fromState.origin))) {
      return { origin: fromState.origin.replace(/\/$/, ""), lang, mode };
    }
    return { origin: fallbackOrigin.replace(/\/$/, ""), lang, mode };
  }
}
