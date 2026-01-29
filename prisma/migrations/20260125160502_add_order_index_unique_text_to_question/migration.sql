/*
  Warnings:

  - You are about to drop the column `text` on the `Question` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[orderIndex]` on the table `Question` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `question` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Question" DROP COLUMN "text",
ADD COLUMN     "question" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Question_orderIndex_key" ON "Question"("orderIndex");
