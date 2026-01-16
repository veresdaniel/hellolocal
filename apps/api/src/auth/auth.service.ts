import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { TwoFactorService } from "../two-factor/two-factor.service";
import { AdminEventLogService } from "../event-log/admin-eventlog.service";
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
  siteIds: string[]; // Array of site IDs the user belongs to
  activeSiteId?: string | null; // Active site ID (null = visitor)
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
    siteIds: string[];
    activeSiteId?: string | null;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    @Optional() private readonly twoFactorService?: TwoFactorService,
    @Optional() private readonly eventLogService?: AdminEventLogService
  ) {}

  private getDefaultSiteSlug(): string {
    return this.configService.get<string>("DEFAULT_SITE_SLUG") ?? "etyek-budai";
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
        // Log the full error for debugging
        if (updateError instanceof Error) {
          console.error("Update error details:", {
            message: updateError.message,
            stack: updateError.stack,
            userId: payload.sub,
          });
        }
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
   * If siteId is not provided, assigns user to the site from the request context
   * (determined by domain or URL-based site resolution).
   * Falls back to default site if no site context is available.
   */
  async register(dto: RegisterDto, requestSiteId?: string, referer?: string): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });

    if (existingUser) {
      throw new BadRequestException("User with this email or username already exists");
    }

    // Get site ID (priority: DTO > request context > referer-based resolution > default site)
    let siteId: string | undefined;
    if (dto.siteId) {
      const site = await this.prisma.site.findUnique({
        where: { id: dto.siteId },
      });
      if (!site) {
        throw new NotFoundException("Site not found");
      }
      siteId = dto.siteId;
    } else if (requestSiteId) {
      // Use site from request context (domain or URL-based resolution)
      const site = await this.prisma.site.findUnique({
        where: { id: requestSiteId },
      });
      if (!site) {
        throw new NotFoundException("Site from request context not found");
      }
      siteId = requestSiteId;
    } else if (referer) {
      // Try to extract siteKey and lang from referer URL
      // Format: /:lang/:siteKey/... or /:lang/admin/...
      const refererMatch = referer.match(/\/(hu|en|de)\/([^\/]+)/);
      if (refererMatch) {
        const lang = refererMatch[1];
        const siteKey = refererMatch[2];
        
        // Skip if siteKey is "admin" (admin routes don't have siteKey)
        if (siteKey !== "admin") {
          try {
            // Try to resolve site from siteKey + lang
            const siteKeyRecord = await this.prisma.siteKey.findFirst({
              where: {
                lang: lang as any,
                slug: siteKey,
                isActive: true,
              },
              orderBy: [
                { isPrimary: 'desc' },
                { createdAt: 'asc' },
              ],
              select: { siteId: true },
            });
            
            if (siteKeyRecord) {
              const site = await this.prisma.site.findUnique({
                where: { id: siteKeyRecord.siteId },
              });
              if (site) {
                siteId = site.id;
              }
            }
          } catch (err) {
            // If resolution fails, fall through to default site
          }
        }
      }
    }
    
    // Fallback to default site if still not resolved
    if (!siteId) {
      const defaultSite = await this.prisma.site.findUnique({
        where: { slug: this.getDefaultSiteSlug() },
      });
      if (!defaultSite) {
        throw new NotFoundException("Default site not found");
      }
      siteId = defaultSite.id;
    }

    // Check if public registration is allowed for this site
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: { 
        id: true, 
        plan: true, 
        allowPublicRegistration: true 
      },
    });

    if (!site) {
      throw new NotFoundException("Site not found");
    }

    // For pro/business plans, check if public registration is enabled
    // Basic plan always allows public registration
    if ((site.plan === "pro" || site.plan === "business") && !site.allowPublicRegistration) {
      throw new BadRequestException("Public registration is disabled for this site. Please contact the site administrator.");
    }

    // Hash password
    const passwordHash = await this.hashPassword(dto.password);

    // Create user (as visitor - activeSiteId is null by default)
    // User will become active when they activate a site
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        bio: dto.bio,
        role: UserRole.viewer, // Default role
        activeSiteId: null, // Visitor by default
        sites: {
          create: {
            siteId,
            isPrimary: true,
          },
        },
      },
      include: {
        sites: {
          select: { siteId: true },
        },
      },
    });

    const siteIds = user.sites.map((s) => s.siteId);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      siteIds,
      activeSiteId: user.activeSiteId,
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
        siteIds,
        activeSiteId: user.activeSiteId,
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
          sites: {
            select: { siteId: true },
          },
        },
      });

      if (!user) {
        // Log for debugging (not exposed to client for security)
        throw new UnauthorizedException("Invalid credentials");
      }

      if (!user.isActive) {
        // Log for debugging (not exposed to client for security)
        throw new UnauthorizedException("Invalid credentials");
      }

      const isPasswordValid = await this.comparePassword(dto.password, user.passwordHash);
      if (!isPasswordValid) {
        // Log for debugging (not exposed to client for security)
        throw new UnauthorizedException("Invalid credentials");
      }

      // Check if 2FA is enabled for this user
      if (user.isTwoFactorEnabled) {
        if (!this.twoFactorService) {
          console.error("2FA is enabled for user but TwoFactorService is not available");
          throw new UnauthorizedException("2FA service is not available");
        }
        
        if (!dto.twoFactorToken) {
          throw new BadRequestException("2FA verification required. Please provide a 2FA token.");
        }

        try {
          const isValid = await this.twoFactorService.verifyTwoFactorCode(user.id, dto.twoFactorToken);
          if (!isValid) {
            throw new UnauthorizedException("Invalid 2FA token");
          }
        } catch (error) {
          // If it's already a known exception, re-throw it
          if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
            throw error;
          }
          // Otherwise, log and throw a generic error
          console.error("2FA verification error:", error);
          throw new UnauthorizedException("2FA verification failed");
        }
      }

      const siteIds = user.sites?.map((s) => s.siteId) || [];

      // Ensure siteIds is always an array (even if empty)
      if (!Array.isArray(siteIds)) {
        console.error("Invalid siteIds format:", siteIds);
        throw new UnauthorizedException("User site configuration is invalid");
      }

      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        username: user.username,
        role: user.role as UserRole,
        siteIds,
        activeSiteId: user.activeSiteId,
      };

      const { accessToken, refreshToken } = await this.generateTokens(payload);

      // Log login event (use first site if available)
      // Add a small delay to prevent duplicate logs in development (React StrictMode)
      if (this.eventLogService && siteIds.length > 0) {
        // Check if we already logged this login in the last 2 seconds to prevent duplicates
        try {
          const recentLogin = await this.prisma.eventLog.findFirst({
            where: {
              siteId: siteIds[0],
              userId: user.id,
              action: 'login',
              createdAt: {
                gte: new Date(Date.now() - 2000), // Last 2 seconds
              },
            },
          });

          if (!recentLogin) {
            this.eventLogService
              .create({
                siteId: siteIds[0],
                userId: user.id,
                action: "login",
                description: `User logged in`,
                metadata: {
                  email: user.email,
                  username: user.username,
                },
              })
              .then(() => {})
              .catch((err) => {
                console.error("Failed to log login event:", err);
                // Don't fail login if logging fails
              });
          } else {
          }
        } catch (err) {
          // If event log check fails, log error but don't fail login
          console.error("Failed to check for recent login log:", err);
          // Still try to create the log entry
          if (this.eventLogService) {
            this.eventLogService
              .create({
                siteId: siteIds[0],
                userId: user.id,
                action: "login",
                description: `User logged in`,
                metadata: {
                  email: user.email,
                  username: user.username,
                },
              })
              .catch((logErr) => {
                console.error("Failed to log login event:", logErr);
                // Don't fail login if logging fails
              });
          }
        }
      }

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
          siteIds,
          activeSiteId: user.activeSiteId,
        },
      };
    } catch (error) {
      // Log error for debugging with more details
      console.error("Login error:", error);
      if (error instanceof Error) {
        console.error("Login error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
      }
      // Re-throw BadRequestException (for 2FA requirement) and UnauthorizedException
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      // For other errors, throw a generic error but log the original
      console.error("Unexpected login error:", error);
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
          sites: {
            select: { siteId: true },
          },
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException("Invalid refresh token");
      }

      const siteIds = user.sites.map((s) => s.siteId);

      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        siteIds,
      };

      return await this.generateTokens(newPayload);
    } catch (error) {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  /**
   * Logs out user by invalidating refresh token.
   */
  async logout(userId: string, siteIds?: string[]): Promise<{ message: string }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
        refreshTokenExpiresAt: null,
      },
    });

    // Log logout event (use first site if available)
    if (this.eventLogService && siteIds && siteIds.length > 0) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, username: true },
      });

      this.eventLogService
        .create({
          siteId: siteIds[0],
          userId,
          action: "logout",
          description: `User logged out`,
          metadata: {
            email: user?.email,
            username: user?.username,
          },
        })
        .catch((err) => {
          console.error("Failed to log logout event:", err);
          // Don't fail logout if logging fails
        });
    }

    return { message: "Logged out successfully" };
  }

  /**
   * Validates JWT payload (used by JWT strategy).
   */
  async validateUser(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        sites: {
          select: { siteId: true },
        },
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const siteIds = user.sites.map((s) => s.siteId);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role as UserRole,
      siteIds,
      activeSiteId: user.activeSiteId,
    };
  }

  /**
   * Handles Google OAuth authentication/registration.
   * Creates user as visitor (activeSiteId: null) if they don't exist.
   */
  async googleLogin(googleUser: {
    email: string;
    firstName: string;
    lastName: string;
    picture?: string;
  }): Promise<AuthResponse> {
    // Check if user already exists
    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
      include: {
        sites: {
          select: { siteId: true },
        },
      },
    });

    // If user doesn't exist, create as visitor
    if (!user) {
      // Get default site ID
      const defaultSite = await this.prisma.site.findUnique({
        where: { slug: this.getDefaultSiteSlug() },
      });

      if (!defaultSite) {
        throw new NotFoundException("Default site not found");
      }

      // Generate username from email (first part before @)
      const emailPrefix = googleUser.email.split("@")[0];
      const baseUsername = emailPrefix.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      
      // Ensure unique username
      let username = baseUsername;
      let counter = 1;
      while (await this.prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}-${counter}`;
        counter++;
      }

      // Create user as visitor (activeSiteId: null)
      user = await this.prisma.user.create({
        data: {
          username,
          email: googleUser.email,
          passwordHash: "", // No password for OAuth users
          firstName: googleUser.firstName,
          lastName: googleUser.lastName,
          role: UserRole.viewer,
          activeSiteId: null, // Visitor by default
          sites: {
            create: {
              siteId: defaultSite.id,
              isPrimary: true,
            },
          },
        },
        include: {
          sites: {
            select: { siteId: true },
          },
        },
      });
    }

    const siteIds = user.sites?.map((s) => s.siteId) || [];

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      siteIds,
      activeSiteId: user.activeSiteId,
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
        role: user.role,
        siteIds,
        activeSiteId: user.activeSiteId,
      },
    };
  }
}

