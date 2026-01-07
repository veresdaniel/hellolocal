-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'superadmin';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isTwoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totpSecret" TEXT;
