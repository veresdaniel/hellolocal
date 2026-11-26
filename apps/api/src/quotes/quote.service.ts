import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { isValidPhoneNumber } from "libphonenumber-js";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { AdminAppSettingsService } from "../admin/admin-app-settings.service";

export type QuoteRequestInput = {
  organization?: unknown;
  contactName?: unknown;
  email?: unknown;
  phone?: unknown;
  message?: unknown;
  plan?: unknown;
  companyWebsite?: unknown;
  formStartedAt?: unknown;
  recaptchaToken?: unknown;
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
    const phone = text(input.phone, 32);
    const message = text(input.message, 2000);
    const plan = text(input.plan, 40) || "municipal";

    if (plan !== "municipal" && plan !== "demo") {
      throw new BadRequestException("Egyedi ajánlatot az önkormányzati csomaghoz lehet kérni.");
    }
    if (plan === "demo") {
      if (!contactName || !email) {
        throw new BadRequestException("Töltsd ki a nevet és az emailt.");
      }
      if (!phone || !isValidPhoneNumber(phone)) {
        throw new BadRequestException("Adj meg egy érvényes telefonszámot országkóddal.");
      }
    } else if (!organization || !contactName || !email || message.length < 12) {
      throw new BadRequestException("Töltsd ki a szervezetet, a nevet, az emailt és egy legalább 12 karakteres üzenetet.");
    }
    if (!EMAIL_RE.test(email)) {
      throw new BadRequestException("Ez nem tűnik email címnek.");
    }

    const recipient = await this.settings.ensureQuoteRecipient();
    const lead = await this.prisma.quoteRequest.create({
      data: {
        organization,
        contactName,
        email,
        phone: phone || null,
        message,
        plan,
        emailed: false,
      },
    });

    const subject = plan === "demo" ? "Demó kérés" : "Önkormányzati ajánlatkérés";
    const demoLines = [`Név: ${contactName}`, `Email: ${email}`, `Telefon: ${phone}`];
    if (organization) demoLines.unshift(`Szervezet: ${organization}`);
    if (message) demoLines.push("", message);
    const body =
      plan === "demo"
        ? demoLines.join("\n")
        : [
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

  async listForAdmin(opts: {
    plan?: string;
    take?: number;
    skip?: number;
    contacted?: boolean;
  }) {
    const plan =
      opts.plan === "demo" || opts.plan === "municipal" ? opts.plan : undefined;
    const take = Math.min(Math.max(opts.take ?? 50, 1), 200);
    const skip = Math.max(opts.skip ?? 0, 0);
    const where: { plan?: string; contactedAt?: null | { not: null } } = {};
    if (plan) where.plan = plan;
    if (opts.contacted === false) where.contactedAt = null;
    else if (opts.contacted === true) where.contactedAt = { not: null };
    const [items, total] = await Promise.all([
      this.prisma.quoteRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      this.prisma.quoteRequest.count({ where }),
    ]);
    return { items, total, take, skip };
  }

  async setContacted(id: string, contacted: boolean) {
    const existing = await this.prisma.quoteRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Lead not found");
    return this.prisma.quoteRequest.update({
      where: { id },
      data: { contactedAt: contacted ? new Date() : null },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.quoteRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Lead not found");
    await this.prisma.quoteRequest.delete({ where: { id } });
    return { ok: true };
  }
}
