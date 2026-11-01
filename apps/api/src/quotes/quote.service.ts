import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { AdminAppSettingsService } from "../admin/admin-app-settings.service";

export type QuoteRequestInput = {
  organization?: unknown;
  contactName?: unknown;
  email?: unknown;
  message?: unknown;
  plan?: unknown;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

@Injectable()
export class QuoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly settings: AdminAppSettingsService
  ) {}

  async create(input: QuoteRequestInput) {
    const organization = text(input.organization, 160);
    const contactName = text(input.contactName, 120);
    const email = text(input.email, 180);
    const message = text(input.message, 2000);
    const plan = text(input.plan, 40) || "municipal";

    if (!organization || !contactName || !email || !message) {
      throw new BadRequestException("Töltsd ki a szervezetet, a nevet, az emailt és az üzenetet.");
    }
    if (!EMAIL_RE.test(email)) {
      throw new BadRequestException("Ez nem tűnik email címnek.");
    }
    if (plan !== "municipal") {
      throw new BadRequestException("Egyedi ajánlatot az önkormányzati csomaghoz lehet kérni.");
    }

    const recipient = await this.settings.ensureQuoteRecipient();
    const lead = await this.prisma.quoteRequest.create({
      data: {
        organization,
        contactName,
        email,
        message,
        plan,
        emailed: false,
      },
    });

    const subject = "Önkormányzati ajánlatkérés";
    const body = [
      `Szervezet: ${organization}`,
      `Kapcsolattartó: ${contactName}`,
      `Email: ${email}`,
      `Csomag: ${plan}`,
      "",
      message,
    ].join("\n");

    const emailed = recipient
      ? await this.email.deliverIfConfigured(recipient, subject, body)
      : false;
    if (emailed) {
      await this.prisma.quoteRequest.update({
        where: { id: lead.id },
        data: { emailed: true },
      });
    }

    const reason = emailed ? "sent" : recipient ? "no_smtp" : "no_recipient";
    return { id: lead.id, stored: true, emailed, reason };
  }
}
