/*
  Warnings:

  - You are about to drop the column `isPublished` on the `Quiz` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "QuizStautus" AS ENUM ('CREATED', 'LIVE', 'STARTED', 'OVER');

-- AlterTable
ALTER TABLE "Quiz" DROP COLUMN "isPublished",
ADD COLUMN     "status" "QuizStautus" NOT NULL DEFAULT 'CREATED';
