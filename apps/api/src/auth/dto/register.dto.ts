export class RegisterDto {
  username!: string;
  email!: string;
  password!: string;
  firstName!: string;
  lastName!: string;
  bio?: string;
  tenantId?: string; // Optional: if not provided, uses default tenant
}

