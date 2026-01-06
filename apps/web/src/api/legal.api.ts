import { apiGet } from "./client";

export type LegalPageDto = {
  key: "imprint" | "terms" | "privacy";
  title: string;
  content: string; // HTML
  seo: {
    title: string | null;
    description: string | null;
    image: string | null;
    keywords: string[];
  };
};

export function getLegalPage(
  lang: string,
  pageKey: "imprint" | "terms" | "privacy"
) {
  return apiGet<LegalPageDto>(`/${lang}/legal/${pageKey}`);
}
