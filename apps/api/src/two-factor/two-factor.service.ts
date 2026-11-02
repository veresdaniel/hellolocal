import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { ERROR_MESSAGES } from "../common/constants/error-messages";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";

// Dynamically import speakeasy and qrcode to handle cases where packages are not installed
let speakeasy: any;
let QRCode: any;

async function loadTwoFactorDependencies() {
  if (!speakeasy || !QRCode) {
    try {
      speakeasy = await import("speakeasy").then((m) => m.default || m);
      QRCode = await import("qrcode").then((m) => m.default || m);
    } catch (error) {
      console.warn("speakeasy or qrcode packages not installed. 2FA features will be limited.");
      speakeasy = null;
      QRCode = null;
    }
  }
}

/**
 * Service for handling Two-Factor Authentication (2FA) using TOTP.
 * Supports QR code generation for easy setup with authenticator apps.
 */
@Injectable()
export class TwoFactorService {
  private readonly appName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {
    this.appName = this.configService.get<string>("APP_NAME") ?? "HelloLocal";
    // Load dependencies asynchronously, but don't block constructor
    loadTwoFactorDependencies().catch((err) => {
      console.warn("Failed to load 2FA dependencies:", err);
    });
  }

  private async ensureDependencies() {
    await loadTwoFactorDependencies();
    if (!speakeasy || !QRCode) {
      throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST_2FA_DEPENDENCIES_NOT_INSTALLED);
    }
  }

  /**
   * Generates a TOTP secret for a user and returns QR code data URL.
   * The secret is stored in the database but 2FA is not enabled until verified.
   */
  async setupTwoFactor(
    userId: string
  ): Promise<{ secret: string; qrCodeUrl: string; manualEntryKey: string }> {
    await this.ensureDependencies();

    if (!userId) {
      throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST_USER_ID_REQUIRED);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, isTwoFactorEnabled: true },
    });

    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND_USER);
    }

    // Opt-in only: do not replace an already-enabled secret via setup (disable first)
    if (user.isTwoFactorEnabled) {
      throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST_2FA_ALREADY_ENABLED);
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `${this.appName} (${user.email})`,
      length: 32,
    });

    // Store pending secret; 2FA stays disabled until /verify succeeds
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpSecret: secret.base32,
        isTwoFactorEnabled: false,
      },
    });

    if (!QRCode) {
      throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST_2FA_QR_CODE_NOT_AVAILABLE);
    }
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32!,
      qrCodeUrl,
      manualEntryKey: secret.base32!,
    };
  }

  /**
   * Verifies a TOTP code and enables 2FA if verification succeeds.
   */
  async verifyAndEnableTwoFactor(
    userId: string,
    token: string
  ): Promise<{ verified: boolean; message: string }> {
    await this.ensureDependencies();

    const normalizedToken = String(token ?? "").replace(/\s/g, "");

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, totpSecret: true, isTwoFactorEnabled: true },
    });

    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND_USER);
    }

    if (!user.totpSecret) {
      throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST_2FA_NOT_SETUP);
    }

    let verified = false;
    try {
      verified = speakeasy.totp.verify({
        secret: user.totpSecret,
        encoding: "base32",
        token: normalizedToken,
        window: 2, // Allow 2 time steps (60 seconds) of tolerance
      });
    } catch (error) {
      console.error("2FA verification error:", error);
      return {
        verified: false,
        message: "Invalid verification code. Please try again.",
      };
    }

    if (!verified) {
      return {
        verified: false,
        message: "Invalid verification code. Please try again.",
      };
    }

    // Opt-in enable for this user only
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isTwoFactorEnabled: true,
      },
    });

    return {
      verified: true,
      message: "2FA has been enabled successfully.",
    };
  }

  /**
   * Verifies a TOTP code during login.
   */
  async verifyTwoFactorCode(userId: string, token: string): Promise<boolean> {
    try {
      await this.ensureDependencies();
    } catch (error) {
      console.warn("2FA dependencies not available, 2FA verification failed:", error);
      return false;
    }

    const normalizedToken = String(token ?? "").replace(/\s/g, "");

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, totpSecret: true, isTwoFactorEnabled: true },
    });

    if (!user || !user.isTwoFactorEnabled || !user.totpSecret) {
      return false;
    }

    try {
      return speakeasy.totp.verify({
        secret: user.totpSecret,
        encoding: "base32",
        token: normalizedToken,
        window: 2, // Allow 2 time steps (60 seconds) of tolerance
      });
    } catch (error) {
      console.error("2FA verification error:", error);
      return false;
    }
  }

  /**
   * Disables 2FA for a user (admin or self). Caller must already pass step-up checks.
   */
  async disableTwoFactor(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND_USER);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isTwoFactorEnabled: false,
        totpSecret: null,
      },
    });
  }

  /** Loads password hash for step-up verification. */
  async getPasswordHash(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    return user?.passwordHash ?? null;
  }

  /**
   * Checks if 2FA is enabled for a user (default false = optional / off).
   */
  async isTwoFactorEnabled(userId: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isTwoFactorEnabled: true },
      });

      return user?.isTwoFactorEnabled === true;
    } catch (error) {
      console.error("Error checking 2FA status:", error);
      return false;
    }
  }
}
