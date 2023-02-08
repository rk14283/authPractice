-- CreateTable
CREATE TABLE "userInfo" (
    "id" SERIAL NOT NULL,
    "Email" TEXT NOT NULL,
    "Password" TEXT NOT NULL,

    CONSTRAINT "userInfo_pkey" PRIMARY KEY ("id")
);
