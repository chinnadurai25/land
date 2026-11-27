-- AlterTable
ALTER TABLE `User`
    ADD COLUMN `accountStatus` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `accountReviewNote` TEXT NULL,
    ADD COLUMN `lastLoginAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `User_accountStatus_createdAt_idx` ON `User`(`accountStatus`, `createdAt`);

-- Approve existing seeded demo curator / legacy accounts
UPDATE `User` SET `accountStatus` = 'APPROVED' WHERE `email` = 'demo-curator@landnest.in' OR `role` = 'ADMIN';
