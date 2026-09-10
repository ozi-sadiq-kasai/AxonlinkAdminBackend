ALTER TABLE "AdminUser" ADD COLUMN "phone" TEXT;

ALTER TABLE "AdminInvitation"
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "phone" TEXT;
