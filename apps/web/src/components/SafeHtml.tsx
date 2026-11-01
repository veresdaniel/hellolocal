import type { CSSProperties } from "react";
import { sanitizeHtml } from "../utils/sanitizeHtml";

type Props = {
  html: string | null | undefined;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "span" | "p" | "section" | "article";
};

/** Renders TipTap/public HTML only after allowlist sanitization. */
export function SafeHtml({ html, className, style, as: Tag = "div" }: Props) {
  const clean = sanitizeHtml(html);
  if (!clean) return null;
  return <Tag className={className} style={style} dangerouslySetInnerHTML={{ __html: clean }} />;
}
