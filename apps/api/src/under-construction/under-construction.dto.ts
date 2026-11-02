import { Type } from "class-transformer";
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";

class UcCopyFieldsDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  buttonLabel?: string;
}

class UcCopyByLangDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UcCopyFieldsDto)
  hu?: UcCopyFieldsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UcCopyFieldsDto)
  en?: UcCopyFieldsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UcCopyFieldsDto)
  de?: UcCopyFieldsDto;
}

export class UnderConstructionSaveDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UcCopyByLangDto)
  copy?: UcCopyByLangDto;
}
