import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import {
  DEFAULT_VISITOR_LADDER,
  decideVisitorLadder,
  ladderPlanToSitePlan,
  parseVisitorLadder,
  stepForMeter,
  summarizeMeter,
  windowStart,
  type LadderPlan,
  type MeterSnapshot,
  type VisitorLadderConfig,
} from "./visitor-ladder";

const SETTING_KEY = "visitorLadder";

export type VisitorLadderSnapshot = {
  meter: number;
  meterSource: MeterSnapshot["source"];
  windowDays: number;
  wouldStep: 0 | 1 | 2;
  appliedStep: number;
  manualOverride: boolean;
  ladderSuspended: boolean;
  subscriptionPlan: string;
  freeUntil: number;
  stepTwoFrom: number;
  stepThreeFrom: number;
};

const NOTICE: Record<
  "hu" | "en" | "de",
  { subject: string; notify: string; apply: string; suspend: string }
> = {
  hu: {
    subject: "A térkép látogatottsága új lépcsőhöz ért",
    notify:
      "Az elmúlt 30 nap mérője elérte a következő lépcsőt. A térkép fent marad. Díjat nem vonunk, számla nem készül.",
    apply:
      "A jogosultsági korlátok a megadott csomagra álltak. Kártyát nem terhelünk, számla nem készül.",
    suspend:
      "A nyilvános térkép jelenleg nem elérhető. A helyek megmaradtak, semmi nem törlődött.",
  },
  en: {
    subject: "Your map reached the next visitor step",
    notify:
      "The last 30 days reached the next step. The map stays online. Nothing is charged and no invoice is sent.",
    apply:
      "Entitlement limits now follow the selected plan. No card is charged and no invoice is sent.",
    suspend: "The public map is hidden for now. Places are kept and nothing was deleted.",
  },
  de: {
    subject: "Die Karte hat die nächste Besucher-Stufe erreicht",
    notify:
      "Die letzten 30 Tage haben die nächste Stufe erreicht. Die Karte bleibt online. Es wird nichts abgebucht und keine Rechnung erstellt.",
    apply:
      "Die Nutzungsgrenzen folgen jetzt dem gewählten Paket. Es wird keine Karte belastet und keine Rechnung erstellt.",
    suspend:
      "Die öffentliche Karte ist vorübergehend nicht erreichbar. Die Orte bleiben erhalten, nichts wurde gelöscht.",
  },
};

function asPlan(value: string | null | undefined): LadderPlan {
  if (
    value === "FREE" ||
    value === "BASIC" ||
    value === "PRO" ||
    value === "BUSINESS" ||
    value === "MUNICIPAL"
  ) {
    return value;
  }
  return "FREE";
}

function noticeLang(languages: string[] | null | undefined): "hu" | "en" | "de" {
  const first = languages?.[0];
  if (first === "en" || first === "de" || first === "hu") return first;
  return "hu";
}

@Injectable()
export class VisitorLadderService {
  private readonly logger = new Logger(VisitorLadderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService
  ) {}

  async getConfig(): Promise<VisitorLadderConfig> {
    const row = await this.prisma.appSetting.findUnique({ where: { key: SETTING_KEY } });
    if (!row?.value) return DEFAULT_VISITOR_LADDER;
    try {
      return parseVisitorLadder(JSON.parse(row.value));
    } catch {
      this.logger.warn("visitorLadder setting is invalid, using defaults");
      return DEFAULT_VISITOR_LADDER;
    }
  }

  async saveConfig(input: unknown): Promise<VisitorLadderConfig> {
    let config: VisitorLadderConfig;
    try {
      config = parseVisitorLadder(input);
    } catch {
      throw new BadRequestException("X < Y < Z");
    }
    await this.prisma.appSetting.upsert({
      where: { key: SETTING_KEY },
      update: {
        value: JSON.stringify(config),
        type: "json",
        description: "Visitor ladder thresholds and step actions",
      },
      create: {
        key: SETTING_KEY,
        value: JSON.stringify(config),
        type: "json",
        description: "Visitor ladder thresholds and step actions",
      },
    });
    return config;
  }

  async metersFor(siteIds: string[], now = new Date()): Promise<Map<string, MeterSnapshot>> {
    const result = new Map<string, MeterSnapshot>();
    if (!siteIds.length) return result;
    const rows = await this.prisma.analyticsDaily.groupBy({
      by: ["siteId"],
      where: {
        siteId: { in: siteIds },
        placeId: null,
        day: { gte: windowStart(now) },
      },
      _sum: { uniqueVisitors: true, pageViews: true },
    });
    for (const id of siteIds) {
      result.set(id, { value: 0, source: "uniqueVisitors" });
    }
    for (const row of rows) {
      result.set(
        row.siteId,
        summarizeMeter([
          { uniqueVisitors: row._sum.uniqueVisitors ?? 0, pageViews: row._sum.pageViews ?? 0 },
        ])
      );
    }
    return result;
  }

  async snapshot(siteId: string, now = new Date()): Promise<VisitorLadderSnapshot> {
    const [config, subscription, meter] = await Promise.all([
      this.getConfig(),
      this.prisma.siteSubscription.findUnique({ where: { siteId } }),
      this.metersFor([siteId], now).then((map) => map.get(siteId)!),
    ]);
    const value = meter?.value ?? 0;
    return {
      meter: value,
      meterSource: meter?.source ?? "uniqueVisitors",
      windowDays: 30,
      wouldStep: stepForMeter(value, config),
      appliedStep: subscription?.ladderStep ?? 0,
      manualOverride: subscription?.manualOverride ?? true,
      ladderSuspended: subscription?.ladderSuspended ?? false,
      subscriptionPlan: subscription?.plan ?? "FREE",
      freeUntil: config.freeUntil,
      stepTwoFrom: config.stepTwoFrom,
      stepThreeFrom: config.stepThreeFrom,
    };
  }

  /**
   * Daily pass. Manual subscriptions are left untouched.
   * A site is evaluated at most once per UTC day.
   */
  async evaluateDue(now = new Date()): Promise<{ evaluated: number; changed: number }> {
    const config = await this.getConfig();
    const subs = await this.prisma.siteSubscription.findMany({
      select: {
        id: true,
        siteId: true,
        plan: true,
        manualOverride: true,
        ladderStep: true,
        ladderSuspended: true,
        belowFloorSince: true,
        ladderEvaluatedAt: true,
        lastNotifiedStep: true,
      },
    });
    const open = subs.filter((sub) => !sub.manualOverride);
    const meters = await this.metersFor(
      open.map((sub) => sub.siteId),
      now
    );
    let evaluated = 0;
    let changed = 0;
    for (const sub of open) {
      const meter = meters.get(sub.siteId)?.value ?? 0;
      const decision = decideVisitorLadder({
        state: {
          manualOverride: sub.manualOverride,
          ladderStep: sub.ladderStep,
          ladderSuspended: sub.ladderSuspended,
          belowFloorSince: sub.belowFloorSince,
          plan: asPlan(sub.plan),
          lastNotifiedStep: sub.lastNotifiedStep,
          ladderEvaluatedAt: sub.ladderEvaluatedAt,
        },
        meter,
        config,
        now,
      });
      if (decision.skipped) continue;
      evaluated += 1;
      const step = config.steps[decision.ladderStep];
      await this.prisma.siteSubscription.update({
        where: { id: sub.id },
        data: {
          ladderStep: decision.ladderStep,
          ladderSuspended: decision.ladderSuspended,
          belowFloorSince: decision.belowFloorSince,
          ladderEvaluatedAt: now,
          ...(decision.planChanged ? { plan: decision.plan } : {}),
          ...(decision.notify ? { lastNotifiedStep: decision.ladderStep } : {}),
        },
      });
      if (decision.planChanged) {
        await this.prisma.site.update({
          where: { id: sub.siteId },
          data: { plan: ladderPlanToSitePlan(decision.plan) },
        });
        await this.prisma.subscriptionHistory.create({
          data: {
            scope: "site",
            subscriptionId: sub.id,
            changeType: "LADDER",
            oldPlan: asPlan(sub.plan),
            newPlan: decision.plan,
            note: "Visitor ladder applied entitlement limits. No charge, no invoice.",
          },
        });
      } else if (decision.suspendChanged) {
        await this.prisma.subscriptionHistory.create({
          data: {
            scope: "site",
            subscriptionId: sub.id,
            changeType: "LADDER",
            oldPlan: asPlan(sub.plan),
            newPlan: asPlan(sub.plan),
            note: decision.ladderSuspended
              ? "Visitor ladder hid the public map. Places were kept."
              : "Visitor ladder opened the public map.",
          },
        });
      }
      if (decision.planChanged || decision.suspendChanged || decision.notify) changed += 1;
      if (decision.notify) {
        await this.notifySite(sub.siteId, meter, decision.ladderStep, step.action, decision.plan);
      }
    }
    this.logger.log(`Visitor ladder evaluated ${evaluated} sites, ${changed} changed`);
    return { evaluated, changed };
  }

  private async notifySite(
    siteId: string,
    meter: number,
    step: number,
    action: VisitorLadderConfig["steps"][number]["action"],
    plan: LadderPlan
  ) {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: {
        languages: true,
        slug: true,
        translations: { select: { lang: true, name: true } },
        siteMemberships: {
          where: { role: "siteadmin" },
          select: { user: { select: { email: true } } },
        },
      },
    });
    if (!site) return;
    const lang = noticeLang(site.languages);
    const copy = NOTICE[lang];
    const name =
      site.translations.find((item) => item.lang === lang)?.name ||
      site.translations[0]?.name ||
      site.slug;
    const detail =
      action === "suspend" ? copy.suspend : action === "apply-plan" ? copy.apply : copy.notify;
    const safeName = name.replace(/[&<>"']/g, (char) => {
      const map: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return map[char] ?? char;
    });
    const html = `<p>${safeName}</p><p>${detail}</p><p>${meter} / 30</p><p>${plan} · ${step + 1}</p>`;
    const text = `${name}\n${detail}\n${meter} / 30`;
    const emails = [
      ...new Set(
        site.siteMemberships
          .map((member) => member.user.email?.trim())
          .filter((email): email is string => !!email)
      ),
    ];
    for (const to of emails) {
      try {
        const sent = await this.email.deliverIfConfigured(to, copy.subject, text);
        if (!sent) await this.email.sendNotice(to, copy.subject, html);
      } catch (error) {
        this.logger.error(`Visitor ladder notice failed for site ${siteId}`, error);
      }
    }
  }
}
