/*
  Warnings:

  - A unique constraint covering the columns `[r2_key]` on the table `IpfsObject` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "IpfsObject_r2_key_key" ON "IpfsObject"("r2_key");
