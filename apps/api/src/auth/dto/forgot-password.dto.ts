import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";
import { PublicFormShieldFields } from "../../common/public-form-shield.dto";

export class ForgotPasswordDto extends PublicFormShieldFields {
  @IsEmail({}, { message: "Email must be a valid email address" })
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  lang?: string;
}
