-- CreateTable
CREATE TABLE "Account" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");

-- AlterTable: add accountId to all tenant tables (nullable first for existing rows)
ALTER TABLE "Project" ADD COLUMN "accountId" INTEGER;
ALTER TABLE "FinanceEntry" ADD COLUMN "accountId" INTEGER;
ALTER TABLE "FitnessEntry" ADD COLUMN "accountId" INTEGER;
ALTER TABLE "DietEntry" ADD COLUMN "accountId" INTEGER;
ALTER TABLE "GymEntry" ADD COLUMN "accountId" INTEGER;
ALTER TABLE "HobbyEntry" ADD COLUMN "accountId" INTEGER;
ALTER TABLE "Subject" ADD COLUMN "accountId" INTEGER;
ALTER TABLE "StudySession" ADD COLUMN "accountId" INTEGER;
ALTER TABLE "HabitEntry" ADD COLUMN "accountId" INTEGER;
ALTER TABLE "AIConversation" ADD COLUMN "accountId" INTEGER;
ALTER TABLE "WeeklyReport" ADD COLUMN "accountId" INTEGER;
ALTER TABLE "TimelineEvent" ADD COLUMN "accountId" INTEGER;
ALTER TABLE "Trade" ADD COLUMN "accountId" INTEGER;
ALTER TABLE "UserSettings" ADD COLUMN "accountId" INTEGER;

-- Drop existing rows without an account (fresh multi-user deploys) or assign manually in production
DELETE FROM "ChatMessage";
DELETE FROM "Milestone";
DELETE FROM "GymExercise";
DELETE FROM "StudyAssignment";
DELETE FROM "UserSettings";
DELETE FROM "Project";
DELETE FROM "FinanceEntry";
DELETE FROM "FitnessEntry";
DELETE FROM "DietEntry";
DELETE FROM "GymEntry";
DELETE FROM "HobbyEntry";
DELETE FROM "Subject";
DELETE FROM "StudySession";
DELETE FROM "HabitEntry";
DELETE FROM "AIConversation";
DELETE FROM "WeeklyReport";
DELETE FROM "TimelineEvent";
DELETE FROM "Trade";

-- Make accountId required
ALTER TABLE "Project" ALTER COLUMN "accountId" SET NOT NULL;
ALTER TABLE "FinanceEntry" ALTER COLUMN "accountId" SET NOT NULL;
ALTER TABLE "FitnessEntry" ALTER COLUMN "accountId" SET NOT NULL;
ALTER TABLE "DietEntry" ALTER COLUMN "accountId" SET NOT NULL;
ALTER TABLE "GymEntry" ALTER COLUMN "accountId" SET NOT NULL;
ALTER TABLE "HobbyEntry" ALTER COLUMN "accountId" SET NOT NULL;
ALTER TABLE "Subject" ALTER COLUMN "accountId" SET NOT NULL;
ALTER TABLE "StudySession" ALTER COLUMN "accountId" SET NOT NULL;
ALTER TABLE "HabitEntry" ALTER COLUMN "accountId" SET NOT NULL;
ALTER TABLE "AIConversation" ALTER COLUMN "accountId" SET NOT NULL;
ALTER TABLE "WeeklyReport" ALTER COLUMN "accountId" SET NOT NULL;
ALTER TABLE "TimelineEvent" ALTER COLUMN "accountId" SET NOT NULL;
ALTER TABLE "Trade" ALTER COLUMN "accountId" SET NOT NULL;
ALTER TABLE "UserSettings" ALTER COLUMN "accountId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Project_accountId_idx" ON "Project"("accountId");
CREATE INDEX "FinanceEntry_accountId_idx" ON "FinanceEntry"("accountId");
CREATE INDEX "FitnessEntry_accountId_idx" ON "FitnessEntry"("accountId");
CREATE INDEX "DietEntry_accountId_idx" ON "DietEntry"("accountId");
CREATE INDEX "GymEntry_accountId_idx" ON "GymEntry"("accountId");
CREATE INDEX "HobbyEntry_accountId_idx" ON "HobbyEntry"("accountId");
CREATE INDEX "Subject_accountId_idx" ON "Subject"("accountId");
CREATE INDEX "StudySession_accountId_idx" ON "StudySession"("accountId");
CREATE INDEX "HabitEntry_accountId_idx" ON "HabitEntry"("accountId");
CREATE INDEX "AIConversation_accountId_idx" ON "AIConversation"("accountId");
CREATE INDEX "WeeklyReport_accountId_idx" ON "WeeklyReport"("accountId");
CREATE INDEX "TimelineEvent_accountId_idx" ON "TimelineEvent"("accountId");
CREATE INDEX "Trade_accountId_idx" ON "Trade"("accountId");
CREATE UNIQUE INDEX "UserSettings_accountId_key" ON "UserSettings"("accountId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FitnessEntry" ADD CONSTRAINT "FitnessEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DietEntry" ADD CONSTRAINT "DietEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymEntry" ADD CONSTRAINT "GymEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HobbyEntry" ADD CONSTRAINT "HobbyEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HabitEntry" ADD CONSTRAINT "HabitEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
