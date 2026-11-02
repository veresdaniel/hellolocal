import { BadRequestException } from "@nestjs/common";

/** Rejects passwords that are shorter than 8 characters or missing a letter or a number. */
export function assertPasswordStrength(password: string) {
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new BadRequestException(
      "Password must be at least 8 characters and include a letter and a number."
    );
  }
}
