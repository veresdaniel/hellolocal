import { BadRequestException } from "@nestjs/common";

/** Min length for new passwords (register, admin create, reset). */
export const PASSWORD_MIN_LENGTH = 10;

/**
 * Strong password: length + lower + upper + digit + special.
 * Used for register, admin user create, and password reset.
 */
export function isStrongPassword(password: string): boolean {
  if (password.length < PASSWORD_MIN_LENGTH) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}

export function assertPasswordStrength(password: string) {
  if (!isStrongPassword(password)) {
    throw new BadRequestException(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters and include upper and lower case letters, a number, and a special character.`
    );
  }
}
