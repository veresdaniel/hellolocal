import type { CSSProperties } from "react";
import "../styles/public-skeleton.css";

type GridVariant = "places" | "sites" | "story" | "catalog";

interface ListCardSkeletonProps {
  className?: string;
}

/** Single cream card placeholder matching list-card proportions. */
export function ListCardSkeleton({ className }: ListCardSkeletonProps) {
  return (
    <div className={`hl-skel-card${className ? ` ${className}` : ""}`} aria-hidden="true">
      <div className="hl-skel-card__media" />
      <div className="hl-skel-card__body">
        <div className="hl-skel hl-skel-card__title" />
        <div className="hl-skel hl-skel-card__title-2" />
        <div className="hl-skel hl-skel-card__line" />
        <div className="hl-skel hl-skel-card__line hl-skel-card__line--short" />
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

interface PublicPageSkeletonProps {
  withHero?: boolean;
  label?: string;
  className?: string;
}

/** Detail / legal / static content sheet while the page body loads. */
export function PublicPageSkeleton({
  withHero = true,
  label = "Loading",
  className,
}: PublicPageSkeletonProps) {
  return (
    <div
      className={`hl-skel-page${className ? ` ${className}` : ""}`}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
    >
      <div className="hl-skel-page__sheet">
        {withHero ? <div className="hl-skel hl-skel-page__hero" /> : null}
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
