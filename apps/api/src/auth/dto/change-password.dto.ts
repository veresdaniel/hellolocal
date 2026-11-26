import { IsString, MinLength } from "class-validator";

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: "Current password is required" })
  currentPassword!: string;

  @IsString()
  @MinLength(10, { message: "Password must be at least 10 characters" })
  newPassword!: string;
}
