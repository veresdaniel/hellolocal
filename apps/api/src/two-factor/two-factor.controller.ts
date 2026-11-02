import {
  Body,
  Controller,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import * as bcrypt from "bcryptjs";
import { TwoFactorService } from "./two-factor.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UserRole } from "@prisma/client";
import { API_TWO_FACTOR_BASE } from "@hellolocal/shared";
import { ERROR_MESSAGES } from "../common/constants/error-messages";
import {
  SetupTwoFactorDto,
  VerifyTwoFactorDto,
  DisableTwoFactorDto,
} from "./dto/two-factor.dto";

/**
 * Optional per-user TOTP 2FA.
 * Users enable/disable for themselves; login only challenges when that user has 2FA on.
 * Superadmins may manage 2FA for other users with password confirmation (step-up).
 */
@Controller(API_TWO_FACTOR_BASE)
@UseGuards(JwtAuthGuard)
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  private currentUserId(user: { id?: string; sub?: string }): string {
    const id = user?.id || user?.sub;
    if (!id) {
      throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST_USER_ID_REQUIRED);
    }
    return id;
  }

  private async assertPassword(userId: string, password: string | undefined): Promise<void> {
    if (!password) {
      throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST_2FA_STEP_UP_REQUIRED);
    }
    const hash = await this.twoFactorService.getPasswordHash(userId);
    if (!hash || !(await bcrypt.compare(password, hash))) {
      throw new UnauthorizedException(ERROR_MESSAGES.UNAUTHORIZED_2FA_STEP_UP);
    }
  }

  /**
   * Target resolution for setup/verify:
   * - Default: self
   * - Another userId: superadmin only + confirmPassword step-up
   */
  private async resolveManagedUserId(
    currentUser: { id?: string; sub?: string; role?: UserRole },
    requestedUserId: string | undefined,
    confirmPassword: string | undefined
  ): Promise<string> {
    const currentUserId = this.currentUserId(currentUser);
    if (!requestedUserId || requestedUserId === currentUserId) {
      return currentUserId;
    }
    if (currentUser.role !== UserRole.superadmin) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN_2FA_MANAGE_OTHERS);
    }
    await this.assertPassword(currentUserId, confirmPassword);
    return requestedUserId;
  }

  /**
   * Generates a TOTP secret + QR code. Does not enable 2FA until /verify succeeds.
   */
  @Post("/setup")
  @HttpCode(HttpStatus.OK)
  async setupTwoFactor(@CurrentUser() user: any, @Body() dto: SetupTwoFactorDto) {
    const targetUserId = await this.resolveManagedUserId(user, dto.userId, dto.confirmPassword);
    return this.twoFactorService.setupTwoFactor(targetUserId);
  }

  /**
   * Verifies a TOTP code and enables 2FA for that user only.
   */
  @Post("/verify")
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 10, ttl: 60000 } })
  async verifyAndEnableTwoFactor(@CurrentUser() user: any, @Body() dto: VerifyTwoFactorDto) {
    const targetUserId = await this.resolveManagedUserId(user, dto.userId, dto.confirmPassword);
    return this.twoFactorService.verifyAndEnableTwoFactor(targetUserId, dto.token);
  }

  /**
   * Disables 2FA. Requires step-up: password and/or current TOTP.
   */
  @Post("/disable")
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 10, ttl: 60000 } })
  async disableTwoFactor(@CurrentUser() user: any, @Body() dto: DisableTwoFactorDto) {
    const currentUserId = this.currentUserId(user);
    const targetUserId = dto.userId || currentUserId;

    if (
      currentUserId !== targetUserId &&
      user.role !== UserRole.admin &&
      user.role !== UserRole.superadmin
    ) {
      throw new UnauthorizedException(ERROR_MESSAGES.UNAUTHORIZED_DISABLE_OWN_2FA);
    }

    const isSelf = currentUserId === targetUserId;
    const hasPassword = Boolean(dto.password?.trim());
    const hasToken = Boolean(dto.token?.trim());

    if (!hasPassword && !hasToken) {
      throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST_2FA_STEP_UP_REQUIRED);
    }

    if (isSelf) {
      let ok = false;
      if (hasToken) {
        ok = await this.twoFactorService.verifyTwoFactorCode(currentUserId, dto.token!);
      }
      if (!ok && hasPassword) {
        const hash = await this.twoFactorService.getPasswordHash(currentUserId);
        ok = Boolean(hash && (await bcrypt.compare(dto.password!, hash)));
      }
      if (!ok) {
        throw new UnauthorizedException(ERROR_MESSAGES.UNAUTHORIZED_2FA_STEP_UP);
      }
    } else {
      // Admin/superadmin disabling another user: require the actor's password.
      await this.assertPassword(currentUserId, dto.password);
    }

    await this.twoFactorService.disableTwoFactor(targetUserId);
    return { message: "2FA has been disabled successfully." };
  }

  /**
   * Returns whether 2FA is enabled for the current user (or another user if admin).
   */
  @Get("/status")
  async getTwoFactorStatus(@CurrentUser() user: any, @Query("userId") userId?: string) {
    try {
      const currentUserId = this.currentUserId(user);
      const isAdmin =
        user.role === UserRole.admin || user.role === UserRole.superadmin;
      const targetUserId =
        userId && isAdmin ? userId : currentUserId;
      const isEnabled = await this.twoFactorService.isTwoFactorEnabled(targetUserId);
      return { isEnabled };
    } catch (error) {
      console.warn("Error checking 2FA status:", error);
      return { isEnabled: false };
    }
  }
}
