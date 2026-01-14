import { apiGetPublic } from "./client";
import type { PlatformSettingsDto, Lang } from "../types/platformSettings";

export async function fetchPlatformSettings(args: { lang: Lang; siteKey: string }): Promise<PlatformSettingsDto> {
  return apiGetPublic<PlatformSettingsDto>(`/public/${args.lang}/${args.siteKey}/platform`);
}
