<<<<<<< Updated upstream
import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";
=======
import { IsEmail, IsString, MinLength, IsOptional, Length } from "class-validator";
>>>>>>> Stashed changes

export class LoginDto {
  @IsEmail({}, { message: "Email must be a valid email address" })
  email!: string;

  @IsString()
<<<<<<< Updated upstream
  @MinLength(1, { message: "Password is required" })
=======
  @MinLength(6, { message: "Password must be at least 6 characters" })
>>>>>>> Stashed changes
  password!: string;

  @IsOptional()
  @IsString()
<<<<<<< Updated upstream
  twoFactorToken?: string;
=======
  @Length(6, 6, { message: "2FA token must be exactly 6 digits" })
  twoFactorToken?: string; // Optional: 6-digit TOTP code if 2FA is enabled
>>>>>>> Stashed changes
}
