import { IsOptional, IsString, MinLength } from "class-validator";

export class ProductClickDto {
  @IsString()
  @MinLength(1)
  productId!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  placeId?: string;
}
