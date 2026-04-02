-- CreateEnum
CREATE TYPE "UserSystemRole" AS ENUM ('USER', 'SYSTEM_ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "systemRole" "UserSystemRole" NOT NULL DEFAULT 'USER';
