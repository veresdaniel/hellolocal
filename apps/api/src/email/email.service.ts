import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type AccountCredentialsMail = {
  to: string;
  username: string;
  email: string;
  password: string;
  firstName?: string;
  /** Absolute login URL shown in the email. */
  loginUrl: string;
  /** Admin-created vs self-registration copy. */
  source: "register" | "admin";
};

/**
 * Email service for sending emails via SMTP when configured (Resend etc.).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.fromEmail = this.configService.get<string>("EMAIL_FROM") ?? "noreply@hellolocal.com";
    this.baseUrl =
      this.configService.get<string>("FRONTEND_URL")?.trim() ||
      this.configService.get<string>("APP_BASE_URL")?.trim() ||
      "http://localhost:5173";
  }

  /** Public site / admin login base without trailing slash. */
  frontendBaseUrl(): string {
    return this.baseUrl.replace(/\/$/, "");
  }

  /**
   * Welcome / account-created email with login credentials (as requested for register + admin create).
   */
  async sendAccountCredentialsEmail(mail: AccountCredentialsMail): Promise<void> {
    const greeting = mail.firstName
      ? `Szia ${mail.firstName}!`
      : `Szia ${mail.username}!`;
    const intro =
      mail.source === "admin"
        ? "Létrehoztunk neked egy HelloLocal fiókot. Az alábbi adatokkal tudsz belépni:"
        : "Sikeresen regisztráltál a HelloLocalra. Az alábbi adatokkal tudsz belépni:";
    const subject =
      mail.source === "admin"
        ? "HelloLocal fiók létrehozva"
        : "Sikeres HelloLocal regisztráció";
    const text = [
      greeting,
      "",
      intro,
      "",
      `Felhasználónév: ${mail.username}`,
      `Email: ${mail.email}`,
      `Jelszó: ${mail.password}`,
      "",
      `Belépés: ${mail.loginUrl}`,
      "",
      "Biztonságból érdemes belépés után jelszót cserélned.",
      "",
      "HelloLocal",
    ].join("\n");
    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><title>${subject}</title></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1b1730;">${subject}</h1>
            <p>${greeting}</p>
            <p>${intro}</p>
            <ul>
              <li><strong>Felhasználónév:</strong> ${escapeHtml(mail.username)}</li>
              <li><strong>Email:</strong> ${escapeHtml(mail.email)}</li>
              <li><strong>Jelszó:</strong> ${escapeHtml(mail.password)}</li>
            </ul>
            <p style="margin: 24px 0;">
              <a href="${escapeHtml(mail.loginUrl)}"
                 style="background:#1b1730;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;display:inline-block;">
                Belépés
              </a>
            </p>
            <p style="color:#666;font-size:14px;">Biztonságból érdemes belépés után jelszót cserélned.</p>
            <p>HelloLocal</p>
          </div>
        </body>
      </html>
    `;
    await this.sendEmail(mail.to, subject, html, text);
  }

  /** @deprecated Prefer sendAccountCredentialsEmail */
  async sendWelcomeEmail(to: string, username: string, firstName?: string): Promise<void> {
    await this.sendAccountCredentialsEmail({
      to,
      username,
      email: to,
      password: "(a regisztrációnál megadott jelszó)",
      firstName,
      loginUrl: `${this.frontendBaseUrl()}/hu/admin/login`,
      source: "register",
    });
  }

  /**
   * Sends a password reset email with reset link.
   */
  async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    username: string,
    lang = "hu"
  ): Promise<void> {
    const subject = "Password Reset Request";
    const resetUrl = `${this.frontendBaseUrl()}/${lang}/reset-password?token=${resetToken}`;
    const text = `Hello ${username},\n\nReset your password: ${resetUrl}\n\nThis link expires in 1 hour.`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><title>${subject}</title></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1b1730;">Password Reset Request</h1>
            <p>Hello ${escapeHtml(username)},</p>
            <p>We received a request to reset your password. Click the link below:</p>
            <p style="margin: 20px 0;">
              <a href="${escapeHtml(resetUrl)}" style="background-color: #1b1730; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Reset Password
              </a>
            </p>
            <p style="word-break: break-all; color: #666;">${escapeHtml(resetUrl)}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
          </div>
        </body>
      </html>
    `;
    await this.sendEmail(to, subject, html, text);
  }

  /**
   * Real delivery only when SMTP_HOST and EMAIL_FROM are set and nodemailer is installed.
   */
  async deliverIfConfigured(
    to: string,
    subject: string,
    text: string,
    html?: string
  ): Promise<boolean> {
    const host = this.configService.get<string>("SMTP_HOST")?.trim();
    const from = this.configService.get<string>("EMAIL_FROM")?.trim() || this.fromEmail;
    const recipient = to.trim();
    if (!host || !from || !recipient) return false;

    try {
      const nodemailer = await import("nodemailer");
      const port = Number(this.configService.get<string>("SMTP_PORT") || 587);
      const user = this.configService.get<string>("SMTP_USER")?.trim();
      const pass = this.configService.get<string>("SMTP_PASS");
      const transport = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user ? { user, pass: pass ?? "" } : undefined,
      });
      await transport.sendMail({
        from,
        to: recipient,
        subject,
        text,
        ...(html ? { html } : {}),
      });
      return true;
    } catch (err) {
      this.logger.warn(
        `SMTP send failed: ${err instanceof Error ? err.message : String(err)}`
      );
      return false;
    }
  }

  async sendNotice(to: string, subject: string, html: string): Promise<void> {
    await this.sendEmail(to, subject, html);
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string
  ): Promise<void> {
    const plain =
      text ||
      html
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (this.configService.get<string>("NODE_ENV") !== "production") {
      this.logger.log(`[EMAIL] To: ${to}`);
      this.logger.log(`[EMAIL] Subject: ${subject}`);
      this.logger.log(`[EMAIL] Body: ${plain.substring(0, 200)}...`);
    }

    const sent = await this.deliverIfConfigured(to, subject, plain, html);
    if (!sent) {
      this.logger.warn(`Email not delivered (SMTP not configured or failed): ${subject}`);
      return;
    }
    this.logger.log(`Email sent to ${to}: ${subject}`);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
