import { IsIn, IsOptional, IsString, MaxLength, ValidateIf } from "class-validator";
import {
  CONTENT_DRAFT_FIELDS,
  CONTENT_DRAFT_KINDS,
  CONTENT_DRAFT_PROVIDERS,
  type ContentDraftFieldId,
  type ContentDraftKindId,
  type ContentDraftProviderId,
} from "./content-draft.constants";

export class ContentDraftSettingsDto {
  @IsIn([...CONTENT_DRAFT_PROVIDERS])
  provider!: ContentDraftProviderId;

  /** Omit to keep the stored credential. Empty string clears it. */
  @IsOptional()
  @IsString()
  @MaxLength(256)
  apiKey?: string;
}

export class ContentDraftRequestDto {
  @IsIn([...CONTENT_DRAFT_KINDS])
  kind!: ContentDraftKindId;

  /** When set, generate a single field and return `{ text }`. */
  @IsOptional()
  @IsIn([...CONTENT_DRAFT_FIELDS])
  field?: ContentDraftFieldId;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  siteId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  placeId?: string;

  @IsString()
  @MaxLength(8)
  lang!: string;

  /** Entity display name / title used as prompt context (required for most fields). */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  /** Extra free-text context (category, town, product type, etc.). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  contextHints?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  townId?: string;

  /** Current field value (single-field mode). */
  @IsOptional()
  @IsString()
  @MaxLength(30000)
  existingValue?: string;

  /** Legacy dual-description mode (kind site|place only). */
  @ValidateIf((dto: ContentDraftRequestDto) => !dto.field)
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  shortDescription?: string;

  @ValidateIf((dto: ContentDraftRequestDto) => !dto.field)
  @IsOptional()
  @IsString()
  @MaxLength(30000)
  description?: string;
}
