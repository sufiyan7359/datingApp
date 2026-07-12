-- CreateEnum
CREATE TYPE "SwipeAction" AS ENUM ('LIKE', 'PASS', 'SUPER_LIKE');

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "boostedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "swipes" (
    "id" TEXT NOT NULL,
    "swiperId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "action" "SwipeAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "swipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "swipes_targetId_idx" ON "swipes"("targetId");

-- CreateIndex
CREATE INDEX "swipes_swiperId_createdAt_idx" ON "swipes"("swiperId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "swipes_swiperId_targetId_key" ON "swipes"("swiperId", "targetId");

-- CreateIndex
CREATE INDEX "matches_userBId_idx" ON "matches"("userBId");

-- CreateIndex
CREATE UNIQUE INDEX "matches_userAId_userBId_key" ON "matches"("userAId", "userBId");

-- AddForeignKey
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_swiperId_fkey" FOREIGN KEY ("swiperId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
