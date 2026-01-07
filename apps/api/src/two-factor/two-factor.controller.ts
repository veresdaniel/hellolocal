import { Body, Controller, Post, UseGuards, HttpCode, HttpStatus, Get, Query, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { TwoFactorService } from "./two-factor.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "@prisma/client";

export class SetupTwoFactorDto {
  userId?: string; // Optional: for admin to setup 2FA for other users
}

export class VerifyTwoFactorDto {
  token!: string; // 6-digit TOTP code
  userId?: string; // Optional: for admin to verify 2FA for other users
}

export class DisableTwoFactorDto {
  userId?: string; // Optional: if not provided, uses current user's ID
}

/**
 * Controller for Two-Factor Authentication (2FA) operations.
 * Users can set up and manage their own 2FA, admins can manage 2FA for any user.
 */
@Controller("/api/two-factor")
@UseGuards(JwtAuthGuard)
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  /**
   * Sets up 2FA for a user (generates secret and QR code).
   * Users can set up their own 2FA, admins can set up 2FA for any user.
   */
  @Post("/setup")
  @HttpCode(HttpStatus.OK)
  async setupTwoFactor(@CurrentUser() user: any, @Body() dto: SetupTwoFactorDto) {
    // If userId is provided and user is admin/superadmin, allow setting up for other users
    // The user object from JWT strategy contains 'id' field, not 'sub'
    const targetUserId = dto.userId && (user.role === UserRole.admin || user.role === UserRole.superadmin) 
      ? dto.userId 
      : user?.id || user?.sub;

    if (!targetUserId) {
      throw new BadRequestException("User ID is required. Please ensure you are authenticated.");
    }

    return this.twoFactorService.setupTwoFactor(targetUserId);
  }

  /**
   * Verifies a TOTP code and enables 2FA.
   * Users can verify their own 2FA, admins can verify 2FA for any user.
   */
  @Post("/verify")
  @HttpCode(HttpStatus.OK)
  async verifyAndEnableTwoFactor(@CurrentUser() user: any, @Body() dto: VerifyTwoFactorDto) {
    // If userId is provided and user is admin/superadmin, allow verifying for other users
    // The user object from JWT strategy contains 'id' field, not 'sub'
    const targetUserId = dto.userId && (user.role === UserRole.admin || user.role === UserRole.superadmin)
      ? dto.userId
      : user?.id || user?.sub;

    if (!targetUserId) {
      throw new BadRequestException("User ID is required. Please ensure you are authenticated.");
    }

    return this.twoFactorService.verifyAndEnableTwoFactor(targetUserId, dto.token);
  }

  /**
   * Disables 2FA for a user.
   * Users can disable their own 2FA, admins can disable 2FA for any user.
   */
  @Post("/disable")
  @HttpCode(HttpStatus.OK)
  async disableTwoFactor(@CurrentUser() user: any, @Body() dto: DisableTwoFactorDto) {
    // If userId is not provided, use current user's ID
    const targetUserId = dto.userId || user?.id || user?.sub;
    
    if (!targetUserId) {
      throw new BadRequestException("User ID is required. Please ensure you are authenticated.");
    }

    // Users can only disable their own 2FA, admins can disable for any user
    const currentUserId = user?.id || user?.sub;
    if (currentUserId !== targetUserId && user.role !== UserRole.admin && user.role !== UserRole.superadmin) {
      throw new UnauthorizedException("You can only disable your own 2FA");
    }

    await this.twoFactorService.disableTwoFactor(targetUserId);
    return { message: "2FA has been disabled successfully." };
  }

  /**
   * Checks if 2FA is enabled for a user.
   * If userId query param is provided and user is admin/superadmin, checks for that user.
   * Otherwise, checks for the current user.
   */
  @Get("/status")
  async getTwoFactorStatus(@CurrentUser() user: any, @Query("userId") userId?: string) {
    try {
      // If userId is provided and user is admin/superadmin, allow checking for other users
      // The user object from JWT strategy contains 'id' field, not 'sub'
      const targetUserId = userId && (user.role === UserRole.admin || user.role === UserRole.superadmin)
        ? userId
        : user?.id || user?.sub;

      if (!targetUserId) {
        return { isEnabled: false };
      }

      const isEnabled = await this.twoFactorService.isTwoFactorEnabled(targetUserId);
      return { isEnabled };
    } catch (error) {
      // If 2FA service is not available or there's an error, return false
      // This allows the frontend to still work even if 2FA is not fully set up
      console.warn("Error checking 2FA status:", error);
      return { isEnabled: false };
    }
  }
}

