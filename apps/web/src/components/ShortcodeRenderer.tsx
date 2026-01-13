import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getGallery, type PublicGallery } from "../api/places.api";
import { GalleryViewer } from "./GalleryViewer";

interface ShortcodeRendererProps {
  content: string;
  lang: string;
  siteKey: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders HTML content with shortcode support.
 * Currently supports: [gallery id="..."]
 */
export function ShortcodeRenderer({ content, lang, siteKey, className, style }: ShortcodeRendererProps) {
  const { t } = useTranslation();

  // Parse gallery shortcodes from content
  const galleryShortcodes = useMemo(() => {
    if (!content) return [];
    const regex = /\[gallery\s+id="([^"]+)"\]/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  }, [content]);

  // Load galleries for shortcodes
  const galleryQueries = useQuery({
    queryKey: ["galleries", galleryShortcodes, lang, siteKey],
    queryFn: async () => {
      if (!lang || !siteKey || galleryShortcodes.length === 0) return {};
      const galleries: Record<string, PublicGallery> = {};
      await Promise.all(
        galleryShortcodes.map(async (galleryId) => {
          try {
            const gallery = await getGallery(lang, siteKey, galleryId);
            galleries[galleryId] = gallery;
          } catch (error) {
            console.error(`Failed to load gallery ${galleryId}:`, error);
          }
        })
      );
      return galleries;
    },
    enabled: galleryShortcodes.length > 0 && !!lang && !!siteKey,
  });

  const galleries = galleryQueries.data || {};

  // Process content and replace shortcodes with React components
  const processedContent = useMemo(() => {
    if (!content) return null;

    // Replace shortcodes with placeholders first
    let processed = content;
    const galleryPlaceholders: Array<{ id: string; index: number }> = [];
    
    processed = processed.replace(
      /\[gallery\s+id="([^"]+)"\]/g,
      (match, galleryId, offset) => {
        const placeholder = `__GALLERY_PLACEHOLDER_${galleryPlaceholders.length}__`;
        galleryPlaceholders.push({ id: galleryId, index: galleryPlaceholders.length });
        return placeholder;
      }
    );

    // Split by placeholders
    const parts = processed.split(/(__GALLERY_PLACEHOLDER_\d+__)/);
    
    return { parts, galleryPlaceholders };
  }, [content]);

  if (!processedContent) return null;

  const { parts, galleryPlaceholders } = processedContent;

  return (
    <div className={className} style={style}>
      {parts.map((part, index) => {
        const placeholderMatch = part.match(/^__GALLERY_PLACEHOLDER_(\d+)__$/);
        if (placeholderMatch) {
          const placeholderIndex = parseInt(placeholderMatch[1], 10);
          const galleryId = galleryPlaceholders[placeholderIndex]?.id;
          const gallery = galleryId ? galleries[galleryId] : null;
          
          // Check if gallery is loaded
          if (galleryQueries.isLoading) {
            return (
              <div key={`gallery-loading-${galleryId}-${index}`} style={{ margin: "24px 0", padding: "20px", textAlign: "center", color: "#666" }}>
                {t("common.loading") || "Loading..."}
              </div>
            );
          }

          // Gallery loaded but not found or has no images
          if (!gallery || !gallery.images || gallery.images.length === 0) {
            return null;
          }

          // Gallery loaded and has images - render it
          return (
            <GalleryViewer
              key={`gallery-${galleryId}-${index}`}
              images={gallery.images}
              name={gallery.name}
              layout={gallery.layout}
              aspect={gallery.aspect}
            />
          );
        }
        
        // Regular HTML content
        if (part.trim()) {
          return (
            <div
              key={`text-${index}`}
              style={{
                marginBottom: index === parts.length - 1 ? 0 : "16px",
              }}
              dangerouslySetInnerHTML={{ __html: part }}
              className="shortcode-content"
            />
          );
        }
        return null;
      })}
    </div>
  );
}
