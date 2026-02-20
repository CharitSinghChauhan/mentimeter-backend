/*
  Warnings:

  - The `status` column on the `Quiz` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `ipAddress` on the `session` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `session` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `session` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `user` table. All the data in the column will be lost.
  - You are about to drop the `account` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `verification` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "QuizStatus" AS ENUM ('CREATED', 'LIVE', 'STARTED', 'OVER');

-- DropForeignKey
ALTER TABLE "account" DROP CONSTRAINT "account_userId_fkey";

-- AlterTable
ALTER TABLE "Quiz" DROP COLUMN "status",
ADD COLUMN     "status" "QuizStatus" NOT NULL DEFAULT 'CREATED';

-- AlterTable
ALTER TABLE "session" DROP COLUMN "ipAddress",
DROP COLUMN "updatedAt",
DROP COLUMN "userAgent";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "emailVerified",
DROP COLUMN "image",
ADD COLUMN     "avatarUrl" TEXT;

-- DropTable
DROP TABLE "account";

-- DropTable
DROP TABLE "verification";

-- DropEnum
DROP TYPE "QuizStautus";

-- CreateIndex
CREATE INDEX "session_token_idx" ON "session"("token");
