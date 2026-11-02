import { Injectable } from "@nestjs/common";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import {
  UC_ACCESS_TOKEN_KEY,
  UC_COOKIE_NAME,
  UC_COPY_KEY,
  UC_DEFAULT_COPY,
  UC_ENABLED_KEY,
  UC_QUERY_PARAM,
  UC_COOKIE_MAX_AGE_SEC,
  UC_TOKEN_UPDATED_AT_KEY,
  type UcCopyByLang,
  type UcCopyFields,
  type UcLang,
} from "./under-construction.constants";
import { UnderConstructionSaveDto } from "./under-construction.dto";

export type UnderConstructionAdminStatus = {
  enabled: boolean;
  accessToken: string | null;
  hasToken: boolean;
  tokenUpdatedAt: string | null;
  queryParam: typeof UC_QUERY_PARAM;
  cookieName: typeof UC_COOKIE_NAME;
  cookieMaxAgeSec: number;
  copy: UcCopyByLang;
};

export type UnderConstructionPublicStatus = {
  enabled: boolean;
  allowed: boolean;
  queryParam: typeof UC_QUERY_PARAM;
  cookieName: typeof UC_COOKIE_NAME;
  cookieMaxAgeSec: number;
  /**
   * When true, the HTTP layer must Set-Cookie (HttpOnly) with the current access token.
   * The raw token is intentionally NOT included in the JSON body.
   */
  refreshCookie: boolean;
  /** When true, clear the preview cookie (gate off or invalid token). */
  clearCookie: boolean;
  copy: UcCopyFields;
};

/** Internal resolve result including token for Set-Cookie (never serialize token to clients). */
export type UnderConstructionPublicResolve = UnderConstructionPublicStatus & {
  cookieToken: string | null;
};

function asLang(value: string | undefined | null): UcLang {
  if (value === "en" || value === "de" || value === "hu") return value;
  return "hu";
}

function normalizeFields(input: Partial<UcCopyFields> | undefined, fallback: UcCopyFields): UcCopyFields {
  return {
    title: (input?.title ?? fallback.title).trim() || fallback.title,
    body: (input?.body ?? fallback.body).trim() || fallback.body,
    buttonLabel: (input?.buttonLabel ?? fallback.buttonLabel ?? "").trim(),
  };
}

function parseCopy(raw: string | null | undefined): UcCopyByLang {
  if (!raw) return { ...UC_DEFAULT_COPY, hu: { ...UC_DEFAULT_COPY.hu }, en: { ...UC_DEFAULT_COPY.en }, de: { ...UC_DEFAULT_COPY.de } };
  try {
    const parsed = JSON.parse(raw) as Partial<UcCopyByLang>;
    return {
      hu: normalizeFields(parsed.hu, UC_DEFAULT_COPY.hu),
      en: normalizeFields(parsed.en, UC_DEFAULT_COPY.en),
      de: normalizeFields(parsed.de, UC_DEFAULT_COPY.de),
    };
  } catch {
    return {
      hu: { ...UC_DEFAULT_COPY.hu },
      en: { ...UC_DEFAULT_COPY.en },
      de: { ...UC_DEFAULT_COPY.de },
    };
  }
}

function newAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

@Injectable()
export class UnderConstructionService {
  /** Cached flag for the API lock middleware (short TTL; fail closed on read errors). */
  private enabledCache: { value: boolean; expiresAt: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private async readValue(key: string): Promise<string | null> {
    const row = await this.prisma.appSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  }

  private async writeValue(key: string, value: string, type: string, description: string) {
    await this.prisma.appSetting.upsert({
      where: { key },
      update: { value, type, description },
      create: { key, value, type, description },
    });
  }

  /** Persist a fresh access token and timestamp (always overwrites). */
  private async persistNewToken(): Promise<string> {
    const token = newAccessToken();
    const tokenUpdatedAt = new Date().toISOString();
    await this.prisma.$transaction([
      this.prisma.appSetting.upsert({
        where: { key: UC_ACCESS_TOKEN_KEY },
        update: {
          value: token,
          type: "string",
          description: "Under-construction preview access token (secret)",
        },
        create: {
          key: UC_ACCESS_TOKEN_KEY,
          value: token,
          type: "string",
          description: "Under-construction preview access token (secret)",
        },
      }),
      this.prisma.appSetting.upsert({
        where: { key: UC_TOKEN_UPDATED_AT_KEY },
        update: {
          value: tokenUpdatedAt,
          type: "string",
          description: "When the under-construction access token was last rotated",
        },
        create: {
          key: UC_TOKEN_UPDATED_AT_KEY,
          value: tokenUpdatedAt,
          type: "string",
          description: "When the under-construction access token was last rotated",
        },
      }),
    ]);
    return token;
  }

  async getAdminStatus(): Promise<UnderConstructionAdminStatus> {
    const [enabledRaw, token, updatedAt, copyRaw] = await Promise.all([
      this.readValue(UC_ENABLED_KEY),
      this.readValue(UC_ACCESS_TOKEN_KEY),
      this.readValue(UC_TOKEN_UPDATED_AT_KEY),
      this.readValue(UC_COPY_KEY),
    ]);
    const accessToken = token?.trim() || null;
    return {
      enabled: enabledRaw === "true",
      accessToken,
      hasToken: Boolean(accessToken),
      tokenUpdatedAt: updatedAt?.trim() || null,
      queryParam: UC_QUERY_PARAM,
      cookieName: UC_COOKIE_NAME,
      cookieMaxAgeSec: UC_COOKIE_MAX_AGE_SEC,
      copy: parseCopy(copyRaw),
    };
  }

  async save(dto: UnderConstructionSaveDto): Promise<UnderConstructionAdminStatus> {
    const current = await this.getAdminStatus();

    await this.writeValue(
      UC_ENABLED_KEY,
      dto.enabled ? "true" : "false",
      "boolean",
      "When true, public site and public APIs are fully locked (admin/auth only)"
    );
    this.bustEnabledCache();

    if (dto.copy) {
      const next: UcCopyByLang = {
        hu: normalizeFields(dto.copy.hu, current.copy.hu),
        en: normalizeFields(dto.copy.en, current.copy.en),
        de: normalizeFields(dto.copy.de, current.copy.de),
      };
      await this.writeValue(
        UC_COPY_KEY,
        JSON.stringify(next),
        "json",
        "Under-development page title/body/buttonLabel per language (hu/en/de)"
      );
    }

    return this.getAdminStatus();
  }

  /** Legacy admin action — preview tokens no longer unlock the public site. */
  async regenerateToken(): Promise<UnderConstructionAdminStatus> {
    await this.persistNewToken();
    return this.getAdminStatus();
  }

  /** Legacy admin action — clear stored preview token if any. */
  async invalidateToken(): Promise<UnderConstructionAdminStatus> {
    await this.prisma.$transaction([
      this.prisma.appSetting.upsert({
        where: { key: UC_ACCESS_TOKEN_KEY },
        update: {
          value: "",
          type: "string",
          description: "Under-construction preview access token (secret)",
        },
        create: {
          key: UC_ACCESS_TOKEN_KEY,
          value: "",
          type: "string",
          description: "Under-construction preview access token (secret)",
        },
      }),
      this.prisma.appSetting.upsert({
        where: { key: UC_TOKEN_UPDATED_AT_KEY },
        update: {
          value: new Date().toISOString(),
          type: "string",
          description: "When the under-construction access token was last rotated",
        },
        create: {
          key: UC_TOKEN_UPDATED_AT_KEY,
          value: new Date().toISOString(),
          type: "string",
          description: "When the under-construction access token was last rotated",
        },
      }),
    ]);
    return this.getAdminStatus();
  }

  /** Whether under-development lock is on. Used by public API middleware. */
  async isEnabled(): Promise<boolean> {
    const now = Date.now();
    if (this.enabledCache && this.enabledCache.expiresAt > now) {
      return this.enabledCache.value;
    }
    try {
      const enabled = (await this.readValue(UC_ENABLED_KEY)) === "true";
      this.enabledCache = { value: enabled, expiresAt: now + 5_000 };
      return enabled;
    } catch {
      // Fail closed: treat as locked if we cannot read the flag.
      this.enabledCache = { value: true, expiresAt: now + 2_000 };
      return true;
    }
  }

  private bustEnabledCache() {
    this.enabledCache = null;
  }

  async resolvePublic(input: {
    lang?: string | null;
    queryToken?: string | null;
    cookieToken?: string | null;
  }): Promise<UnderConstructionPublicResolve> {
    const lang = asLang(input.lang);
    const [enabledRaw, copyRaw] = await Promise.all([
      this.readValue(UC_ENABLED_KEY),
      this.readValue(UC_COPY_KEY),
    ]);
    const enabled = enabledRaw === "true";
    const copy = parseCopy(copyRaw)[lang];
    this.enabledCache = { value: enabled, expiresAt: Date.now() + 5_000 };

    if (!enabled) {
      return {
        enabled: false,
        allowed: true,
        queryParam: UC_QUERY_PARAM,
        cookieName: UC_COOKIE_NAME,
        cookieMaxAgeSec: UC_COOKIE_MAX_AGE_SEC,
        refreshCookie: false,
        clearCookie: Boolean(input.cookieToken),
        cookieToken: null,
        copy,
      };
    }

    // Strict beta lock: public site closed for everyone (no ?access= / cookie unlock).
    // Admin/auth stay on separate routes. Clear any leftover preview cookie.
    return {
      enabled: true,
      allowed: false,
      queryParam: UC_QUERY_PARAM,
      cookieName: UC_COOKIE_NAME,
      cookieMaxAgeSec: UC_COOKIE_MAX_AGE_SEC,
      refreshCookie: false,
      clearCookie: true,
      cookieToken: null,
      copy,
    };
  }

  /** JSON-safe public payload (no raw access token). */
  toPublicJson(resolved: UnderConstructionPublicResolve): UnderConstructionPublicStatus {
    const { cookieToken: _cookieToken, ...rest } = resolved;
    return rest;
  }
}
