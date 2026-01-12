import { IsEmail, IsString, MinLength, IsOptional, MaxLength } from "class-validator";

export class RegisterDto {
  @IsString()
  @MinLength(3, { message: "Username must be at least 3 characters" })
  @MaxLength(50, { message: "Username must be at most 50 characters" })
  username!: string;

  @IsEmail({}, { message: "Email must be a valid email address" })
  email!: string;

  @IsString()
  @MinLength(6, { message: "Password must be at least 6 characters" })
  password!: string;

  @IsString()
  @MinLength(1, { message: "First name is required" })
  @MaxLength(100, { message: "First name must be at most 100 characters" })
  firstName!: string;

  @IsString()
  @MinLength(1, { message: "Last name is required" })
  @MaxLength(100, { message: "Last name must be at most 100 characters" })
  lastName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "Bio must be at most 500 characters" })
  bio?: string;

  @IsOptional()
  @IsString()
  siteId?: string; // Optional: if not provided, uses default site
}

