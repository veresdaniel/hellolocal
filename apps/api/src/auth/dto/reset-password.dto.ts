import { IsString, MinLength } from "class-validator";
import { PublicFormShieldFields } from "../../common/public-form-shield.dto";

export class ResetPasswordDto extends PublicFormShieldFields {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(10, { message: "Password must be at least 10 characters" })
  newPassword!: string;
}
