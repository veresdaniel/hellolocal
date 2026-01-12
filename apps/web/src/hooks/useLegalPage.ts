import { useQuery } from "@tanstack/react-query";
import { getLegalPage } from "../api/legal.api";

export function useLegalPage(
  lang: string,
  tenantKey: string,
  pageKey: "imprint" | "terms" | "privacy"
) {
  return useQuery({
    queryKey: ["legal", lang, tenantKey, pageKey],
    queryFn: () => getLegalPage(lang, tenantKey, pageKey),
    enabled: !!lang && !!tenantKey && !!pageKey,
  });
}
