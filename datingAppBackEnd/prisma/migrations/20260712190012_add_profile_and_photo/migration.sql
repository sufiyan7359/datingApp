-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'NON_BINARY', 'OTHER');

-- CreateEnum
CREATE TYPE "RelationshipGoal" AS ENUM ('LONG_TERM', 'SHORT_TERM', 'CASUAL', 'FRIENDSHIP', 'NOT_SURE');

-- CreateEnum
CREATE TYPE "LifestyleChoice" AS ENUM ('NEVER', 'SOMETIMES', 'REGULARLY');

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gender" "Gender",
    "interestedIn" "Gender"[],
    "dateOfBirth" TIMESTAMP(3),
    "heightCm" INTEGER,
    "religion" TEXT,
    "languages" TEXT[],
    "profession" TEXT,
    "education" TEXT,
    "bio" TEXT,
    "city" TEXT,
    "country" TEXT,
    "smoking" "LifestyleChoice",
    "drinking" "LifestyleChoice",
    "workout" "LifestyleChoice",
    "relationshipGoal" "RelationshipGoal",
    "hasKids" BOOLEAN,
    "wantsKids" BOOLEAN,
    "hasPets" BOOLEAN,
    "interests" TEXT[],
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");

-- CreateIndex
CREATE INDEX "photos_profileId_idx" ON "photos"("profileId");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
