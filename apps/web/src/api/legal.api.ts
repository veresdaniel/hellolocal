// src/api/legal.api.ts
import { apiGet } from "./client";

export function getLegalPage(lang: string, key: string) {
  return apiGet<any>(`/${lang}/legal/${key}`);
}
