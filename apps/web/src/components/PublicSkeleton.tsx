/**
 * Public loading placeholders sized to real layouts (list cards, detail bleed hero, overview).
 * Intent: reserve space for the in-flight batch / first paint only — reduce CLS, not paint a fake full list.
 */
import type { CSSProperties } from "react";
import "../styles/public-skeleton.css";

type GridVariant = "places" | "sites" | "story" | "catalog";

interface ListCardSkeletonProps {
  className?: string;
}

/** Single cream card placeholder matching `.list-card` media + body min-heights. */
export function ListCardSkeleton({ className }: ListCardSkeletonProps) {
  return (
    <div className={`hl-skel-card${className ? ` ${className}` : ""}`} aria-hidden="true">
      <div className="hl-skel-card__media" />
      <div className="hl-skel-card__body">
        <div className="hl-skel hl-skel-card__title" />
        <div className="hl-skel hl-skel-card__meta" />
        <div className="hl-skel hl-skel-card__copy" />
        <div className="hl-skel hl-skel-card__extra" />
        <div className="hl-skel hl-skel-card__footer" />
      </div>
    </div>
  );
}

interface PublicCardSkeletonGridProps {
  /** How many skeleton cards to show (next fetch batch / initial grid). */
  count?: number;
  variant?: GridVariant;
  className?: string;
  label?: string;
}

/**
 * Grid of card skeletons for list / infinite-scroll loading.
 * Only reserves space for the batch currently being fetched — not the whole list.
 */
export function PublicCardSkeletonGrid({
  count = 6,
  variant = "places",
  className,
  label = "Loading",
}: PublicCardSkeletonGridProps) {
  const safeCount = Math.max(0, Math.min(count, 24));
  if (safeCount === 0) return null;

  const gridClass =
    variant === "sites"
      ? "hl-skel-grid hl-skel-grid--sites"
      : variant === "story" || variant === "catalog"
        ? "hl-skel-grid"
        : "hl-skel-grid hl-skel-grid--places";

  return (
    <div
      className={`${gridClass}${className ? ` ${className}` : ""}`}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
    >
      {Array.from({ length: safeCount }, (_, i) => (
        <ListCardSkeleton key={`hl-skel-card-${i}`} />
      ))}
      <span className="hl-skel-visually-hidden">{label}</span>
    </div>
  );
}

interface PublicListSkeletonProps {
  label?: string;
  cardCount?: number;
  className?: string;
}

/**
 * Explore list first-paint shell (header spacer + title + search + filters + cards).
 * Prefer this over {@link PublicPageSkeleton} on custom-domain /:lang list routes —
 * the detail hero sheet caused large CLS before PlacesListView mounted.
 */
export function PublicListSkeleton({
  label = "Loading",
  cardCount = 6,
  className,
  /** Real H1 for lab LCP — matches PlacesListView `.places-discover__title`. */
  title,
}: PublicListSkeletonProps & { title?: string }) {
  return (
    <div
      className={`hl-skel-list${className ? ` ${className}` : ""}`}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
    >
      <div className="hl-skel-list__inner hl-public-width">
        {title ? (
          <h1 className="places-discover__title hl-skel-list__boot-title">{title}</h1>
        ) : (
          <div className="hl-skel hl-skel--on-dark hl-skel-list__title" />
        )}
        <div className="hl-skel hl-skel--on-dark hl-skel-list__search" />
        <div className="hl-skel-list__filters" aria-hidden="true">
          <div className="hl-skel hl-skel-list__chip" />
          <div className="hl-skel hl-skel-list__chip" />
          <div className="hl-skel hl-skel-list__chip hl-skel-list__chip--wide" />
          <div className="hl-skel hl-skel-list__chip" />
          <div className="hl-skel hl-skel-list__chip" />
          <div className="hl-skel hl-skel-list__chip hl-skel-list__chip--wide" />
        </div>
        <PublicCardSkeletonGrid count={cardCount} variant="places" label={label} />
      </div>
      <span className="hl-skel-visually-hidden">{label}</span>
    </div>
  );
}

/**
 * Navy boot shell for host resolution / lazy Suspense — never the white
 * {@link LoadingSpinner}, and never {@link PublicListSkeleton} (that card grid
 * flashed ~100ms over the platform overview while OverviewPage chunk loaded).
 */
export function PublicBootShell({ label = "Loading" }: { label?: string }) {
  return (
    <div
      className="hl-public"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
      style={{
        minHeight: "100vh",
        background: "var(--hl-bg, #1b1730)",
        color: "var(--hl-on-dark, #f2f4fb)",
      }}
    >
      <span className="hl-skel-visually-hidden">{label}</span>
    </div>
  );
}

interface PublicPageSkeletonProps {
  withHero?: boolean;
  /**
   * Full-bleed 16:9 hero matching Place/Event/Collection detail pages.
   * Avoids CLS when swapping the in-card hero stub for a real edge-to-edge hero.
   */
  bleedHero?: boolean;
  label?: string;
  className?: string;
}

/** Detail / legal / static content sheet while the page body loads. */
export function PublicPageSkeleton({
  withHero = true,
  bleedHero = false,
  label = "Loading",
  className,
}: PublicPageSkeletonProps) {
  return (
    <div
      className={`hl-skel-page${bleedHero ? " hl-skel-page--bleed" : ""}${className ? ` ${className}` : ""}`}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
    >
      {bleedHero ? <div className="hl-skel hl-skel-page__bleed-hero" aria-hidden="true" /> : null}
      <div className="hl-skel-page__sheet">
        {withHero && !bleedHero ? <div className="hl-skel hl-skel-page__hero" /> : null}
        <div className="hl-skel hl-skel-page__eyebrow" />
        <div className="hl-skel hl-skel-page__title" />
        <div className="hl-skel hl-skel-page__line" />
        <div className="hl-skel hl-skel-page__line hl-skel-page__line--mid" />
        <div className="hl-skel hl-skel-page__line" />
        <div className="hl-skel hl-skel-page__line hl-skel-page__line--short" />
        <div className="hl-skel hl-skel-page__line hl-skel-page__line--mid" />
        <div className="hl-skel hl-skel-page__line" />
        <div className="hl-skel hl-skel-page__line hl-skel-page__line--short" />
      </div>
      <span className="hl-skel-visually-hidden">{label}</span>
    </div>
  );
}

interface OverviewSkeletonProps {
  label?: string;
}

/** Marketing overview first-paint placeholders. */
export function OverviewSkeleton({ label = "Loading" }: OverviewSkeletonProps) {
  return (
    <div
      className="hl-skel-overview"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
    >
      <div className="hl-skel-overview__hero">
        <div>
          <div className="hl-skel hl-skel--on-dark hl-skel-overview__brand" />
          <div className="hl-skel hl-skel--on-dark hl-skel-overview__headline" />
          <div className="hl-skel hl-skel--on-dark hl-skel-overview__copy" />
          <div className="hl-skel hl-skel--on-dark hl-skel-overview__copy" />
          <div className="hl-skel hl-skel--on-dark hl-skel-overview__cta" />
        </div>
        <div className="hl-skel hl-skel--on-dark hl-skel-overview__shot" />
      </div>
      <div className="hl-skel-overview__section">
        <div className="hl-skel hl-skel-overview__section-title" />
        <div className="hl-skel hl-skel-page__line" />
        <div className="hl-skel hl-skel-page__line hl-skel-page__line--mid" />
        <div className="hl-skel hl-skel-page__line hl-skel-page__line--short" />
      </div>
      <div className="hl-skel-overview__section">
        <div className="hl-skel hl-skel-overview__section-title" />
        <div className="hl-skel hl-skel-page__line" />
        <div className="hl-skel hl-skel-page__line hl-skel-page__line--mid" />
      </div>
      <span className="hl-skel-visually-hidden">{label}</span>
    </div>
  );
}

/** Tiny block helper for inline placeholders. */
export function PublicSkeletonBlock({
  className,
  onDark,
  style,
}: {
  className?: string;
  onDark?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`hl-skel${onDark ? " hl-skel--on-dark" : ""}${className ? ` ${className}` : ""}`}
      style={style}
      aria-hidden="true"
    />
  );
}
