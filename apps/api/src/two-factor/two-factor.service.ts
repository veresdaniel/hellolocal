import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
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
      throw new BadRequestException("2FA dependencies are not installed. Please install speakeasy and qrcode.");
    }
  }

  /**
   * Generates a TOTP secret for a user and returns QR code data URL.
   * The secret is stored in the database but 2FA is not enabled until verified.
   */
  async setupTwoFactor(userId: string): Promise<{ secret: string; qrCodeUrl: string; manualEntryKey: string }> {
    await this.ensureDependencies();

    if (!userId) {
      throw new BadRequestException("User ID is required");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `${this.appName} (${user.email})`,
      length: 32,
    });

    // Store secret in database (but don't enable 2FA yet)
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpSecret: secret.base32,
        isTwoFactorEnabled: false, // Will be enabled after verification
      } as any, // Use 'as any' to handle case where fields might not exist in Prisma Client yet
    });

    // Generate QR code
    if (!QRCode) {
      throw new BadRequestException("QR code generation is not available. Please install qrcode package.");
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
  async verifyAndEnableTwoFactor(userId: string, token: string): Promise<{ verified: boolean; message: string }> {
    await this.ensureDependencies();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, totpSecret: true, isTwoFactorEnabled: true } as any,
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (!(user as any).totpSecret) {
      throw new BadRequestException("2FA is not set up. Please set it up first.");
    }

    // Verify the token
    let verified = false;
    try {
      const totpSecret = (user as any).totpSecret as string | null;
      if (!totpSecret) {
        return {
          verified: false,
          message: "Invalid verification code. Please try again.",
        };
      }
      verified = speakeasy.totp.verify({
        secret: totpSecret,
        encoding: "base32",
        token,
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

    // Enable 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isTwoFactorEnabled: true,
      } as any, // Use 'as any' to handle case where fields might not exist in Prisma Client yet
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

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, totpSecret: true, isTwoFactorEnabled: true } as any,
    });

    if (!user || !(user as any).isTwoFactorEnabled || !(user as any).totpSecret) {
      return false;
    }

    // Verify the token
    try {
      const totpSecret = (user as any).totpSecret as string | null;
      if (!totpSecret) {
        return false;
      }
      return speakeasy.totp.verify({
        secret: totpSecret,
        encoding: "base32",
        token,
        window: 2, // Allow 2 time steps (60 seconds) of tolerance
      });
    } catch (error) {
      console.error("2FA verification error:", error);
      return false;
    }
  }

  /**
   * Disables 2FA for a user (admin or self).
   */
  async disableTwoFactor(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isTwoFactorEnabled: false,
        totpSecret: null, // Optionally clear the secret
      } as any, // Use 'as any' to handle case where fields might not exist in Prisma Client yet
    });
  }

  /**
   * Checks if 2FA is enabled for a user.
   */
  async isTwoFactorEnabled(userId: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isTwoFactorEnabled: true } as any,
      });

      return (user as any)?.isTwoFactorEnabled === true;
    } catch (error) {
      console.error("Error checking 2FA status:", error);
      return false;
    }
  }
}

