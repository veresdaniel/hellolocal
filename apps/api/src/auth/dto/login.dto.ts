export class LoginDto {
  email!: string;
  password!: string;
  twoFactorToken?: string; // Optional: 6-digit TOTP code if 2FA is enabled
}

