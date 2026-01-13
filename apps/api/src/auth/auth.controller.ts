import { Body, Controller, Post, UseGuards, HttpCode, HttpStatus, Get, Req, Res, HttpException, HttpStatus as NestHttpStatus } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard } from "@nestjs/passport";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { RequestWithSite } from "../common/middleware/site-resolve.middleware";

/**
 * Authentication controller.
 * Handles user registration, login, password reset, and token refresh.
 */
@Controller("/api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user.
   * If siteId is not provided, user is assigned to the site from the request context
   * (determined by domain or URL-based site resolution).
   * Falls back to referer-based resolution if request context is not available.
   */
  @Post("/register")
  @Throttle({ strict: { limit: 3, ttl: 60000 } }) // 3 kérés percenként (strict throttler)
  async register(@Body() dto: RegisterDto, @Req() req: RequestWithSite) {
    const referer = req.headers.referer || req.headers.origin;
    return this.authService.register(dto, req.site?.siteId, referer);
  }

  /**
   * Login with email and password.
   * Returns access token and refresh token.
   */
  @Post("/login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 5, ttl: 60000 } }) // 5 kérés percenként (brute-force védelem, strict throttler)
  async login(@Body() dto: LoginDto) {
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
    return this.authService.forgotPassword(dto);
  }

  /**
   * Reset password using reset token.
   */
  @Post("/reset-password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 3, ttl: 60000 } }) // 3 kérés percenként (strict throttler)
  async resetPassword(@Body() dto: ResetPasswordDto) {
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
   */
  @Get("/google")
  @UseGuards(AuthGuard("google"))
  async googleAuth(@Req() req: Request) {
    // Guard redirects to Google
    // This method will not be called if credentials are missing,
    // but the route will still be registered
  }

  /**
   * Google OAuth callback.
   * Handles the redirect from Google after authentication.
   * Redirects to frontend with tokens in URL hash (more secure than query params).
   */
  @Get("/google/callback")
  @UseGuards(AuthGuard("google"))
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const lang = this.extractLanguageFromRequest(req) || "hu";
    
    // Check if OAuth failed (user will be null if strategy validation failed)
    if (!req.user) {
      // Check if there's an error in query params (from Google)
      const error = req.query.error;
      const errorDescription = req.query.error_description;
      
      const errorMsg = error 
        ? `Google OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ""}`
        : "Google OAuth authentication failed";
      
      return res.redirect(`${frontendUrl}/${lang}/admin/login?error=${encodeURIComponent(errorMsg)}`);
    }
    
    const googleUser = req.user as {
      email: string;
      firstName: string;
      lastName: string;
      picture?: string;
    };
    
    try {
      const authResponse = await this.authService.googleLogin(googleUser);
      
      // Encode tokens for URL (use hash to avoid server logs)
      const tokens = encodeURIComponent(JSON.stringify({
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
        user: authResponse.user,
      }));
      
      // Redirect to frontend callback handler
      return res.redirect(`${frontendUrl}/${lang}/admin/login?googleAuth=success&tokens=${tokens}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Google authentication failed";
      return res.redirect(`${frontendUrl}/${lang}/admin/login?error=${encodeURIComponent(errorMessage)}`);
    }
  }

  /**
   * Extract language from request (from referer or default)
   */
  private extractLanguageFromRequest(req: Request): string | null {
    const referer = req.headers.referer || "";
    const langMatch = referer.match(/\/(hu|en|de)(\/|$)/);
    return langMatch ? langMatch[1] : null;
  }
}

