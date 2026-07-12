-- CreateTable
CREATE TABLE "boost_activations" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boost_activations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "boost_activations_profileId_activatedAt_idx" ON "boost_activations"("profileId", "activatedAt");

-- AddForeignKey
ALTER TABLE "boost_activations" ADD CONSTRAINT "boost_activations_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
