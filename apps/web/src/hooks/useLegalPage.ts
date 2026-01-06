import { useQuery } from "@tanstack/react-query";
import { getLegalPage } from "../api/legal.api";

export function useLegalPage(
  lang: string,
  pageKey: "imprint" | "terms" | "privacy"
) {
  return useQuery({
    queryKey: ["legal", lang, pageKey],
    queryFn: () => getLegalPage(lang, pageKey),
    enabled: !!lang && !!pageKey,
  });
}
