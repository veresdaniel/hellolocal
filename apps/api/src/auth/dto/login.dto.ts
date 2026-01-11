import { IsEmail, IsString, MinLength, IsOptional, Length } from "class-validator";

export class LoginDto {
  @IsEmail({}, { message: "Email must be a valid email address" })
  email!: string;

  @IsString()
  @MinLength(6, { message: "Password must be at least 6 characters" })
  password!: string;

  @IsOptional()
  @IsString()
  @Length(6, 6, { message: "2FA token must be exactly 6 digits" })
  twoFactorToken?: string; // Optional: 6-digit TOTP code if 2FA is enabled
}

