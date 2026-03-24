/*
  Warnings:

  - A unique constraint covering the columns `[share_token]` on the table `FileMetadata` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "FileMetadata" ADD COLUMN     "share_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FileMetadata_share_token_key" ON "FileMetadata"("share_token");
