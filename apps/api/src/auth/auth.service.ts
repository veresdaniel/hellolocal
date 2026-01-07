import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { TwoFactorService } from "../two-factor/two-factor.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { UserRole } from "@prisma/client";
import { randomBytes } from "crypto";

export interface JwtPayload {
  sub: string; // user id
  email: string;
  username: string;
  role: UserRole;
  tenantIds: string[]; // Array of tenant IDs the user belongs to
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    tenantIds: string[];
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly twoFactorService: TwoFactorService
  ) {}

  private getDefaultTenantSlug(): string {
    return this.configService.get<string>("DEFAULT_TENANT_SLUG") ?? "etyek-budai";
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  private async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private generateToken(): string {
    return randomBytes(32).toString("hex");
  }

  private async generateTokens(payload: JwtPayload): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const accessTokenExpiresIn = this.configService.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "15m";
      const refreshTokenExpiresIn = this.configService.get<string>("JWT_REFRESH_EXPIRES_IN") ?? "7d";

      const accessToken = this.jwtService.sign(payload, {
        expiresIn: accessTokenExpiresIn,
      });

      const refreshToken = this.jwtService.sign(payload, {
        expiresIn: refreshTokenExpiresIn,
      });

      // Store refresh token in database
      const refreshTokenExpiresAt = new Date();
      refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 7); // 7 days

      try {
        await this.prisma.user.update({
          where: { id: payload.sub },
          data: {
            refreshToken,
            refreshTokenExpiresAt,
          },
        });
      } catch (updateError) {
        console.error("Failed to update refresh token in database:", updateError);
        // Continue even if update fails - tokens are still valid
      }

      return { accessToken, refreshToken };
    } catch (error) {
      console.error("Error generating tokens:", error);
      throw error;
    }
  }

  /**
   * Registers a new user.
   * If tenantId is not provided, assigns user to default tenant.
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });

    if (existingUser) {
      throw new BadRequestException("User with this email or username already exists");
    }

    // Get tenant ID (default or provided)
    let tenantId: string;
    if (dto.tenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: dto.tenantId },
      });
      if (!tenant) {
        throw new NotFoundException("Tenant not found");
      }
      tenantId = dto.tenantId;
    } else {
      const defaultTenant = await this.prisma.tenant.findUnique({
        where: { slug: this.getDefaultTenantSlug() },
      });
      if (!defaultTenant) {
        throw new NotFoundException("Default tenant not found");
      }
      tenantId = defaultTenant.id;
    }

    // Hash password
    const passwordHash = await this.hashPassword(dto.password);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        bio: dto.bio,
        role: UserRole.viewer, // Default role
        tenants: {
          create: {
            tenantId,
            isPrimary: true,
          },
        },
      },
      include: {
        tenants: {
          select: { tenantId: true },
        },
      },
    });

    const tenantIds = user.tenants.map((t) => t.tenantId);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      tenantIds,
    };

    const { accessToken, refreshToken } = await this.generateTokens(payload);

    // Send welcome email (non-blocking)
    this.emailService.sendWelcomeEmail(user.email, user.username, user.firstName).catch((err) => {
      console.error("Failed to send welcome email:", err);
      // Don't fail registration if email fails
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantIds,
      },
    };
  }

  /**
   * Logs in a user and returns JWT tokens.
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
        include: {
          tenants: {
            select: { tenantId: true },
          },
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException("Invalid credentials");
      }

      const isPasswordValid = await this.comparePassword(dto.password, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedException("Invalid credentials");
      }

      // Check if 2FA is enabled (safely handle case where field might not exist yet)
      // Only check if TwoFactorService is available and user has 2FA enabled
      const isTwoFactorEnabled = (user as any).isTwoFactorEnabled === true;
      
      // Debug log to check 2FA status
      console.log("Login - 2FA check:", {
        userId: user.id,
        isTwoFactorEnabled,
        hasTwoFactorService: !!this.twoFactorService,
        hasToken: !!dto.twoFactorToken,
      });
      
      if (isTwoFactorEnabled) {
        if (!this.twoFactorService) {
          // If 2FA is enabled but service is not available, log warning but allow login
          console.warn("2FA is enabled but TwoFactorService is not available. Skipping 2FA check.");
        } else {
          // 2FA is enabled and service is available - require token
          if (!dto.twoFactorToken) {
            // Return a special response indicating 2FA is required
            console.log("2FA required but no token provided - throwing BadRequestException");
            throw new BadRequestException("2FA verification required. Please provide a 2FA token.");
          }

          // Verify 2FA token
          const isTwoFactorValid = await this.twoFactorService.verifyTwoFactorCode(user.id, dto.twoFactorToken);
          if (!isTwoFactorValid) {
            throw new UnauthorizedException("Invalid 2FA token");
          }
        }
      }

      const tenantIds = user.tenants.map((t) => t.tenantId);

      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        username: user.username,
        role: user.role as UserRole,
        tenantIds,
      };

      const { accessToken, refreshToken } = await this.generateTokens(payload);

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role as UserRole,
          tenantIds,
        },
      };
    } catch (error) {
      // Log error for debugging
      console.error("Login error:", error);
      // Re-throw BadRequestException (for 2FA requirement) and UnauthorizedException
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("Login failed");
    }
  }

  /**
   * Initiates password reset process.
   * Generates a reset token and sends it (in real app, would send email).
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string; resetToken?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      // Don't reveal if user exists for security
      return { message: "If the email exists, a password reset link has been sent." };
    }

    const resetToken = this.generateToken();
    const resetTokenExpiresAt = new Date();
    resetTokenExpiresAt.setHours(resetTokenExpiresAt.getHours() + 1); // 1 hour expiry

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiresAt,
      },
    });

    // Send password reset email (non-blocking)
    this.emailService.sendPasswordResetEmail(user.email, resetToken, user.username).catch((err) => {
      console.error("Failed to send password reset email:", err);
      // Don't fail if email fails, but log error
    });

    // Don't return reset token in response for security
    return {
      message: "If the email exists, a password reset link has been sent.",
    };
  }

  /**
   * Resets password using reset token.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: dto.token,
        resetTokenExpiresAt: {
          gt: new Date(), // Token not expired
        },
      },
    });

    if (!user) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    const passwordHash = await this.hashPassword(dto.newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });

    return { message: "Password reset successfully" };
  }

  /**
   * Refreshes access token using refresh token.
   */
  async refreshToken(dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(dto.refreshToken);

      const user = await this.prisma.user.findUnique({
        where: {
          id: payload.sub,
          refreshToken: dto.refreshToken,
          refreshTokenExpiresAt: {
            gt: new Date(),
          },
        },
        include: {
          tenants: {
            select: { tenantId: true },
          },
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException("Invalid refresh token");
      }

      const tenantIds = user.tenants.map((t) => t.tenantId);

      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        tenantIds,
      };

      return await this.generateTokens(newPayload);
    } catch (error) {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  /**
   * Logs out user by invalidating refresh token.
   */
  async logout(userId: string): Promise<{ message: string }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
        refreshTokenExpiresAt: null,
      },
    });

    return { message: "Logged out successfully" };
  }

  /**
   * Validates JWT payload (used by JWT strategy).
   */
  async validateUser(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        tenants: {
          select: { tenantId: true },
        },
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const tenantIds = user.tenants.map((t) => t.tenantId);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role as UserRole,
      tenantIds,
    };
  }
}

