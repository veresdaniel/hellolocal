import {
  PATH_SEGMENT_FALLBACK,
  PATH_SEGMENT_KEYS,
  fallbackMapForLang,
  type PathSegmentKey,
  type PathSegmentMap,
  type PathSegmentsPayload,
} from "./pathSegmentKeys";

const STATIC_RESERVED = new Set([
  "event",
  "collections",
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "static-pages",
  "static-page",
  "products",
  "offline",
  "admin",
  "teruletek",
]);

type Listener = () => void;

let byLang: Record<string, PathSegmentMap> = Object.fromEntries(
  Object.entries(PATH_SEGMENT_FALLBACK).map(([lang, map]) => [lang, { ...map }])
);
let aliases: PathSegmentsPayload["aliases"] = {};
let languages: string[] = Object.keys(PATH_SEGMENT_FALLBACK);
let loaded = false;
const listeners = new Set<Listener>();

function rebuildAliases(): void {
  const next: PathSegmentsPayload["aliases"] = {};
  for (const [lang, map] of Object.entries(byLang)) {
    for (const key of PATH_SEGMENT_KEYS) {
      const segment = map[key];
      if (!segment) continue;
      const prev = next[segment];
      if (!prev) next[segment] = { key, langs: [lang] };
      else if (prev.key === key && !prev.langs.includes(lang)) prev.langs.push(lang);
    }
  }
  // Legacy Hungarian region-list label.
  if (!next.teruletek) next.teruletek = { key: "regionList", langs: ["hu"] };
  aliases = next;
}

rebuildAliases();

function notify(): void {
  listeners.forEach((fn) => fn());
}

export function subscribePathSegments(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function pathSegmentsLoaded(): boolean {
  return loaded;
}

export function pathSegmentLanguages(): string[] {
  return languages;
}

export function setPathSegmentsPayload(payload: PathSegmentsPayload | null | undefined): void {
  if (!payload?.byLang) return;
  const next: Record<string, PathSegmentMap> = {};
  for (const [lang, map] of Object.entries(payload.byLang)) {
    next[lang] = { ...fallbackMapForLang(lang), ...map };
  }
  for (const code of ["hu", "en", "de"]) {
    if (!next[code]) next[code] = { ...fallbackMapForLang(code) };
  }
  byLang = next;
  languages = payload.languages?.length ? [...payload.languages] : Object.keys(next);
  if (payload.aliases && Object.keys(payload.aliases).length) {
    aliases = { ...payload.aliases };
    if (!aliases.teruletek) aliases.teruletek = { key: "regionList", langs: ["hu"] };
  } else {
    rebuildAliases();
  }
  loaded = true;
  notify();
}

export function pathSegment(lang: string, key: PathSegmentKey): string {
  const code = String(lang || "hu")
    .split("-")[0]
    .toLowerCase();
  return byLang[code]?.[key] ?? fallbackMapForLang(code)[key];
}

export function pathSegmentKey(segment: string | undefined): PathSegmentKey | null {
  if (!segment) return null;
  return aliases[segment]?.key ?? null;
}

export function aliasesForKey(key: PathSegmentKey): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const [segment, meta] of Object.entries(aliases)) {
    if (meta.key !== key || seen.has(segment)) continue;
    seen.add(segment);
    out.push(segment);
  }
  if (!out.length) {
    for (const map of Object.values(PATH_SEGMENT_FALLBACK)) {
      const segment = map[key];
      if (segment && !seen.has(segment)) {
        seen.add(segment);
        out.push(segment);
      }
    }
  }
  return out;
}

export function isPathSegmentForKey(segment: string | undefined, key: PathSegmentKey): boolean {
  return !!segment && pathSegmentKey(segment) === key;
}

export function isReservedPathWord(segment: string | undefined): boolean {
  if (!segment) return false;
  if (STATIC_RESERVED.has(segment)) return true;
  return segment in aliases;
}

export function allPathAliases(): string[] {
  return Object.keys(aliases);
}
