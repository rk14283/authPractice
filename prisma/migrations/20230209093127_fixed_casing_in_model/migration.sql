/*
  Warnings:

  - You are about to drop the `userInfo` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "userInfo";

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
