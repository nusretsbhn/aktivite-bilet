-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'HOTEL';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "hotelName" TEXT;
