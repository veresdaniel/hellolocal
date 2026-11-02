import { IsNumber, IsOptional, IsString, MaxLength } from "class-validator";

/** Extra fields accepted on anonymous public POST bodies. Not for admin CRUD. */
export class PublicFormShieldFields {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyWebsite?: string;

  @IsOptional()
  @IsNumber()
  formStartedAt?: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  recaptchaToken?: string;
}
