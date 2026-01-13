import { IsIn, IsOptional, IsString } from "class-validator";

export class TrackDto {
  @IsIn(["page_view", "place_view", "cta_click"])
  type!: "page_view" | "place_view" | "cta_click";

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsString()
  placeId?: string;

  @IsOptional()
  @IsIn(["phone", "email", "website", "maps"])
  ctaType?: "phone" | "email" | "website" | "maps";

  @IsOptional()
  @IsString()
  referrer?: string;
}
