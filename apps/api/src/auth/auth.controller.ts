import { Body, Controller, Post, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";

/**
 * Authentication controller.
 * Handles user registration, login, password reset, and token refresh.
 */
@Controller("/api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user.
   * If tenantId is not provided, user is assigned to default tenant.
   */
  @Post("/register")
  @Throttle({ strict: { limit: 3, ttl: 60000 } }) // 3 kérés percenként (strict throttler)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
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
  async logout(@CurrentUser() user: { id: string; tenantIds?: string[] }) {
    return this.authService.logout(user.id, user.tenantIds);
  }
}

