-- CreateEnum
CREATE TYPE "SupportThreadStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "support_threads" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SupportThreadStatus" NOT NULL DEFAULT 'OPEN',
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unreadForUser" INTEGER NOT NULL DEFAULT 0,
    "unreadForAdmin" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "isFromAdmin" BOOLEAN NOT NULL,
    "content" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "support_threads_userId_key" ON "support_threads"("userId");

-- CreateIndex
CREATE INDEX "support_threads_lastMessageAt_idx" ON "support_threads"("lastMessageAt");

-- CreateIndex
CREATE INDEX "support_messages_threadId_createdAt_idx" ON "support_messages"("threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "support_threads" ADD CONSTRAINT "support_threads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "support_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

