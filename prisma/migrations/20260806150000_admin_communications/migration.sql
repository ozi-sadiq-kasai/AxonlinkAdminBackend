CREATE TABLE "AdminCommunication" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "contentBlocks" JSONB,
  "imageUrl" TEXT,
  "documentUrl" TEXT,
  "audiences" JSONB NOT NULL,
  "channels" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "scheduledFor" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "recipientCount" INTEGER NOT NULL DEFAULT 0,
  "pushDelivered" INTEGER NOT NULL DEFAULT 0,
  "pushOpened" INTEGER NOT NULL DEFAULT 0,
  "emailDelivered" INTEGER NOT NULL DEFAULT 0,
  "emailOpened" INTEGER NOT NULL DEFAULT 0,
  "smsDelivered" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminCommunication_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminCommunication_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "AdminCommunication_status_scheduledFor_idx" ON "AdminCommunication"("status", "scheduledFor");
CREATE INDEX "AdminCommunication_createdById_createdAt_idx" ON "AdminCommunication"("createdById", "createdAt");
