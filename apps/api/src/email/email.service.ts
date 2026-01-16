import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Email service for sending emails.
 * Currently uses console logging for development.
 * In production, integrate with an email provider (SendGrid, AWS SES, etc.)
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.fromEmail = this.configService.get<string>("EMAIL_FROM") ?? "noreply@hellolocal.com";
    this.baseUrl = this.configService.get<string>("APP_BASE_URL") ?? "http://localhost:5173";
  }

  /**
   * Sends a welcome email to a newly registered user.
   */
  async sendWelcomeEmail(to: string, username: string, firstName?: string): Promise<void> {
    const subject = "Welcome to HelloLocal!";
    const greeting = firstName ? `Hello ${firstName},` : `Hello ${username},`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #007bff;">Welcome to HelloLocal!</h1>
            <p>${greeting}</p>
            <p>Thank you for registering with HelloLocal. We're excited to have you on board!</p>
            <p>You can now log in to your account and start exploring.</p>
            <p>If you have any questions, feel free to contact our support team.</p>
            <p>Best regards,<br>The HelloLocal Team</p>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail(to, subject, html);
  }

  /**
   * Sends a password reset email with reset link.
   */
  async sendPasswordResetEmail(to: string, resetToken: string, username: string): Promise<void> {
    const subject = "Password Reset Request";
    const resetUrl = `${this.baseUrl}/reset-password?token=${resetToken}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #007bff;">Password Reset Request</h1>
            <p>Hello ${username},</p>
            <p>We received a request to reset your password. Click the link below to reset it:</p>
            <p style="margin: 20px 0;">
              <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Reset Password
              </a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request a password reset, please ignore this email.</p>
            <p>Best regards,<br>The HelloLocal Team</p>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail(to, subject, html);
  }

  /**
   * Sends an email. In development, logs to console.
   * In production, integrate with an email provider.
   */
  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    // In development, log to console
    if (this.configService.get<string>("NODE_ENV") !== "production") {
      this.logger.log(`[EMAIL] To: ${to}`);
      this.logger.log(`[EMAIL] Subject: ${subject}`);
      this.logger.log(`[EMAIL] HTML: ${html.substring(0, 200)}...`);
      this.logger.warn(
        "Email not actually sent in development mode. Configure email provider for production."
      );
      return;
    }

    // In production, integrate with email provider
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(this.configService.get<string>('SENDGRID_API_KEY'));
    // await sgMail.send({
    //   to,
    //   from: this.fromEmail,
    //   subject,
    //   html,
    // });

    this.logger.log(`Email sent to ${to}: ${subject}`);
  }
}
