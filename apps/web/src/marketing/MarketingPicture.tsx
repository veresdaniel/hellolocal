import type { MarketingImage } from "./overviewImages";

type Props = {
  image: MarketingImage;
  alt: string;
  className?: string;
  priority?: boolean;
};

/** Responsive WebP `<picture>` for overview marketing assets. */
export function MarketingPicture({ image, alt, className, priority = false }: Props) {
  const mobileMedia = image.mobileMedia || "(max-width: 860px)";

  return (
    <picture>
      {image.webpSrcSetMobile ? (
        <source
          type="image/webp"
          media={mobileMedia}
          srcSet={image.webpSrcSetMobile}
          sizes={image.sizes}
        />
      ) : null}
      <source type="image/webp" srcSet={image.webpSrcSet} sizes={image.sizes} />
      <img
        className={className}
        src={image.jpg}
        alt={alt}
        width={image.width}
        height={image.height}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
      />
    </picture>
  );
}
