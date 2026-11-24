import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHash, createHmac, randomUUID } from "crypto";
import Stripe from "stripe";
import { PrismaService } from "../prisma/prisma.service";
import {
  isDisposableEmail,
  normalizeEmail,
  parseDisposableDomainList,
} from "../common/email-normalize";
import {
  DISPOSABLE_EMAIL_DOMAINS_KEY,
  FLAG,
  FREE_TRIAL_REQUIRE_CARD_KEY,
  SUSPICIOUS_SCORE_MIN,
} from "./signup-abuse.constants";

export type SignupContext = {
  email: string;
  ip?: string | null;
  userAgent?: string | null;
  deviceHash?: string | null;
};

export type SignupGateResult = {
  emailNormalized: string;
  ipHash: string | null;
  deviceHash: string | null;
  userAgent: string | null;
  riskScore: number;
  flags: string[];
  /** When Stripe is configured + require-card flag, free attach waits for card verify. */
  requireCard: boolean;
};

@Injectable()
export class SignupAbuseService {
  private stripe: Stripe | null | undefined;

  constructor(private readonly prisma: PrismaService) {}

  private abuseSalt(): string {
    return (
      process.env.SIGNUP_ABUSE_SALT?.trim() ||
      process.env.JWT_SECRET?.trim() ||
      "dev-signup-abuse-salt"
    );
  }

  hashIp(ip: string | null | undefined): string | null {
    const value = String(ip || "")
      .trim()
      .replace(/^::ffff:/, "");
    if (!value || value === "127.0.0.1" || value === "::1") return null;
    return createHmac("sha256", this.abuseSalt()).update(`ip:${value}`).digest("hex").slice(0, 32);
  }

  normalizeDeviceHash(raw: string | null | undefined): string | null {
    const value = String(raw || "")
      .trim()
      .toLowerCase();
    if (!value || value.length < 8 || value.length > 128) return null;
    if (!/^[a-z0-9_-]+$/.test(value)) return null;
    return createHash("sha256").update(`device:${value}`).digest("hex").slice(0, 32);
  }

  private async disposableExtras(): Promise<string[]> {
    const row = await this.prisma.appSetting.findUnique({
      where: { key: DISPOSABLE_EMAIL_DOMAINS_KEY },
      select: { value: true },
    });
    return parseDisposableDomainList(row?.value);
  }

  async isCardRequired(): Promise<boolean> {
    if (!this.getStripe()) return false;
    const row = await this.prisma.appSetting.findUnique({
      where: { key: FREE_TRIAL_REQUIRE_CARD_KEY },
      select: { value: true },
    });
    const value = String(row?.value || "")
      .trim()
      .toLowerCase();
    return value === "true" || value === "1" || value === "yes";
  }

  getStripe(): Stripe | null {
    if (this.stripe !== undefined) return this.stripe;
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    if (!key) {
      this.stripe = null;
      return null;
    }
    // Pin a stable API version shipped with stripe@17; cast keeps TS happy across minors.
    this.stripe = new Stripe(key, { apiVersion: "2024-11-20.acacia" as Stripe.LatestApiVersion });
    return this.stripe;
  }

  /**
   * Hard + soft checks before creating a free-plan (or any) user.
   * Throws on disposable email / alias cluster with an existing free owner / shared card.
   */
  async assertCanRegister(ctx: SignupContext): Promise<SignupGateResult> {
    const emailNormalized = normalizeEmail(ctx.email);
    if (!emailNormalized) {
      throw new BadRequestException("Érvénytelen email cím.");
    }
    const extras = await this.disposableExtras();
    if (isDisposableEmail(ctx.email, extras) || isDisposableEmail(emailNormalized, extras)) {
      throw new BadRequestException(
        "Ideiglenes / eldobható email címmel nem lehet regisztrálni. Használj saját postafiókot."
      );
    }

    const ipHash = this.hashIp(ctx.ip);
    const deviceHash = this.normalizeDeviceHash(ctx.deviceHash);
    const userAgent = ctx.userAgent ? ctx.userAgent.slice(0, 512) : null;
    const flags: string[] = [];
    let riskScore = 0;

    const aliasUser = await this.prisma.user.findFirst({
      where: {
        emailNormalized,
        OR: [
          { ownedPlaces: { some: { plan: "free" } } },
          { placeSignups: { some: { status: { in: ["pending", "attached"] } } } },
        ],
      },
      select: { id: true, email: true },
    });
    if (aliasUser) {
      flags.push(FLAG.emailAliasCluster);
      throw new BadRequestException(
        "Ehhez az emailhez (vagy aliasához) már tartozik ingyenes fiók / hely. Lépj be, vagy frissíts fizetős csomagra."
      );
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (ipHash) {
      const ipUsers = await this.prisma.user.count({
        where: { signupIpHash: ipHash, createdAt: { gte: weekAgo } },
      });
      // Soft only: NAT/office IPs share addresses — never hard-block on IP alone.
      if (ipUsers >= 1) {
        flags.push(FLAG.sharedIp);
        riskScore += 30;
      }
    }
    if (deviceHash) {
      const deviceUsers = await this.prisma.user.count({
        where: { signupDeviceHash: deviceHash, createdAt: { gte: weekAgo } },
      });
      if (deviceUsers >= 1) {
        flags.push(FLAG.sharedDevice);
        riskScore += 40;
      }
    }

    const requireCard = await this.isCardRequired();
    if (requireCard) flags.push(FLAG.cardRequired);

    return {
      emailNormalized,
      ipHash,
      deviceHash,
      userAgent,
      riskScore,
      flags,
      requireCard,
    };
  }

  async recordSignal(args: {
    userId: string;
    gate: SignupGateResult;
    note?: string;
  }) {
    await this.prisma.signupSignal.create({
      data: {
        userId: args.userId,
        emailNormalized: args.gate.emailNormalized,
        ipHash: args.gate.ipHash,
        deviceHash: args.gate.deviceHash,
        userAgent: args.gate.userAgent,
        riskScore: args.gate.riskScore,
        flags: args.gate.flags,
        note: args.note,
      },
    });
  }

  /** Block a second free place / pending signup for the same user. */
  async assertOneFreePlacePerUser(userId: string) {
    const [places, pending] = await Promise.all([
      this.prisma.place.count({
        where: {
          plan: "free",
          OR: [{ ownerId: userId }, { memberships: { some: { userId } } }],
        },
      }),
      this.prisma.placeSignup.count({
        where: { userId, status: "pending" },
      }),
    ]);
    if (places >= 1 || pending >= 1) {
      throw new BadRequestException(
        "Egy fiókhoz csak egy ingyenes hely / függő regisztráció tartozhat."
      );
    }
  }

  async getCardStatus(userId: string) {
    const requireCard = await this.isCardRequired();
    const stripeReady = Boolean(this.getStripe());
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCardFingerprint: true },
    });
    return {
      requireCard: requireCard && stripeReady,
      stripeConfigured: stripeReady,
      cardVerified: Boolean(user?.stripeCardFingerprint),
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY?.trim() || null,
    };
  }

  /** True when free attach may proceed (card not required, or fingerprint present). */
  async assertCardVerifiedIfRequired(userId: string) {
    if (!(await this.isCardRequired())) return;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCardFingerprint: true },
    });
    if (!user?.stripeCardFingerprint) {
      throw new BadRequestException(
        "A free trialhez bankkártya ellenőrzés szükséges. Erősítsd meg a kártyádat, majd folytasd."
      );
    }
  }

  async createSetupIntent(userId: string) {
    const stripe = this.getStripe();
    if (!stripe) {
      throw new ServiceUnavailableException(
        "A kártyaellenőrzés nincs beállítva (STRIPE_SECRET_KEY hiányzik)."
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
        stripeCardFingerprint: true,
      },
    });
    if (!user) throw new NotFoundException("User not found");
    if (user.stripeCardFingerprint) {
      return { alreadyVerified: true as const, clientSecret: null as string | null };
    }
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await this.prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }
    const intent = await stripe.setupIntents.create({
      customer: customerId,
      usage: "off_session",
      payment_method_types: ["card"],
      metadata: { userId: user.id },
    });
    return { alreadyVerified: false as const, clientSecret: intent.client_secret };
  }

  async confirmCard(userId: string, setupIntentId: string) {
    const stripe = this.getStripe();
    if (!stripe) {
      throw new ServiceUnavailableException(
        "A kártyaellenőrzés nincs beállítva (STRIPE_SECRET_KEY hiányzik)."
      );
    }
    const intent = await stripe.setupIntents.retrieve(setupIntentId, {
      expand: ["payment_method"],
    });
    if (intent.metadata?.userId && intent.metadata.userId !== userId) {
      throw new BadRequestException("A SetupIntent nem ehhez a fiókhoz tartozik.");
    }
    if (intent.status !== "succeeded") {
      throw new BadRequestException(`A kártyaellenőrzés még nem kész (status: ${intent.status}).`);
    }
    const pm =
      typeof intent.payment_method === "string"
        ? await stripe.paymentMethods.retrieve(intent.payment_method)
        : intent.payment_method;
    const fingerprint = pm && "card" in pm ? pm.card?.fingerprint || null : null;
    if (!fingerprint) {
      throw new BadRequestException("A kártya ujjlenyomata nem olvasható.");
    }

    const clash = await this.prisma.user.findFirst({
      where: {
        stripeCardFingerprint: fingerprint,
        id: { not: userId },
        OR: [
          { ownedPlaces: { some: { plan: "free" } } },
          { placeSignups: { some: { status: { in: ["pending", "attached"] } } } },
        ],
      },
      select: { id: true },
    });
    if (clash) {
      await this.prisma.signupSignal.create({
        data: {
          userId,
          emailNormalized:
            (await this.prisma.user.findUnique({ where: { id: userId }, select: { emailNormalized: true } }))
              ?.emailNormalized || "unknown",
          stripeFingerprint: fingerprint,
          riskScore: 100,
          flags: [FLAG.sharedCard],
          note: `Card fingerprint clash with user ${clash.id}`,
        },
      });
      throw new BadRequestException(
        "Ez a bankkártya már szerepel egy másik ingyenes próbaidőszaknál. Egy kártyához egy free trial tartozhat."
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeCardFingerprint: fingerprint },
    });
    return { ok: true as const, fingerprint };
  }

  async listSuspicious(args: { minScore?: number; limit?: number } = {}) {
    const minScore = args.minScore ?? SUSPICIOUS_SCORE_MIN;
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 500);
    return this.prisma.signupSignal.findMany({
      where: {
        OR: [{ riskScore: { gte: minScore } }, { flags: { isEmpty: false } }],
      },
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            createdAt: true,
            isActive: true,
            stripeCardFingerprint: true,
            ownedPlaces: { select: { id: true, plan: true, isActive: true }, take: 5 },
          },
        },
      },
    });
  }

  /** Dev/test helper — not used in prod paths. */
  newDeviceChallengeId() {
    return randomUUID().replace(/-/g, "");
  }
}
