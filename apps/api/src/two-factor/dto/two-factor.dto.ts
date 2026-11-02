import { IsOptional, IsString, Length, Matches, MinLength, ValidateIf } from "class-validator";

export class SetupTwoFactorDto {
  @IsOptional()
  @IsString()
  userId?: string; // Superadmin only (with confirmPassword); others always act on self

  /** Required when a superadmin targets another userId. */
  @ValidateIf((o: SetupTwoFactorDto) => Boolean(o.userId))
  @IsString()
  @MinLength(6, { message: "Password is required to manage another user's 2FA" })
  confirmPassword?: string;
}

export class VerifyTwoFactorDto {
  @IsString()
  @Length(6, 6, { message: "2FA token must be exactly 6 digits" })
  @Matches(/^\d{6}$/, { message: "2FA token must be exactly 6 digits" })
  token!: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @ValidateIf((o: VerifyTwoFactorDto) => Boolean(o.userId))
  @IsString()
  @MinLength(6, { message: "Password is required to manage another user's 2FA" })
  confirmPassword?: string;
}

export class DisableTwoFactorDto {
  @IsOptional()
  @IsString()
  userId?: string; // Optional: if omitted, disables for the current user

  /** Account password step-up (self or admin acting on another user). */
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  /** Current TOTP code step-up (self-disable when 2FA is on). */
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: "2FA token must be exactly 6 digits" })
  @Matches(/^\d{6}$/, { message: "2FA token must be exactly 6 digits" })
  token?: string;
}
