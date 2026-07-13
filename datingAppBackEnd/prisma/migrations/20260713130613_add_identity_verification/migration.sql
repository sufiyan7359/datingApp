-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "verificationNote" TEXT,
ADD COLUMN     "verificationReviewedAt" TIMESTAMP(3),
ADD COLUMN     "verificationSelfieUrl" TEXT,
ADD COLUMN     "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "verificationSubmittedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "profiles_verificationStatus_idx" ON "profiles"("verificationStatus");
