import { apiGetPublic } from "./client";

export type LegalPageDto = {
  key: "imprint" | "terms" | "privacy";
  title: string;
  shortDescription?: string | null; // HTML - for list view cards
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
  return apiGetPublic<LegalPageDto>(`/${lang}/legal/${pageKey}`);
}
