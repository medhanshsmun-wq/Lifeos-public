-- CreateTable
CREATE TABLE "Project" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "techStack" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "githubUrl" TEXT NOT NULL,
    "deployedUrl" TEXT NOT NULL,
    "youtubeUrl" TEXT NOT NULL,
    "docsUrl" TEXT NOT NULL,
    "links" TEXT NOT NULL,
    "files" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" INTEGER NOT NULL,
    CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinanceEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "aiCategory" TEXT
);

-- CreateTable
CREATE TABLE "FitnessEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "steps" INTEGER NOT NULL,
    "distance" REAL NOT NULL,
    "caloriesBurned" INTEGER NOT NULL,
    "activeMinutes" INTEGER NOT NULL,
    "notes" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "DietEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "mealType" TEXT NOT NULL,
    "food" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "protein" INTEGER NOT NULL,
    "carbs" INTEGER NOT NULL,
    "fat" INTEGER NOT NULL,
    "aiBreakdown" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "GymEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "muscleGroup" TEXT NOT NULL,
    "isRestDay" BOOLEAN NOT NULL DEFAULT false,
    "aiSuggestion" TEXT
);

-- CreateTable
CREATE TABLE "GymExercise" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "weight" REAL NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "gymEntryId" INTEGER NOT NULL,
    CONSTRAINT "GymExercise_gymEntryId_fkey" FOREIGN KEY ("gymEntryId") REFERENCES "GymEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HobbyEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "timeSpent" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "notes" TEXT NOT NULL,
    "milestone" TEXT
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "instructor" TEXT,
    "semester" TEXT,
    "credits" INTEGER,
    "priority" TEXT NOT NULL,
    "syllabusProgress" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "color" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "StudyAssignment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "score" TEXT,
    "notes" TEXT,
    "subjectId" INTEGER NOT NULL,
    CONSTRAINT "StudyAssignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudySession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "subject" TEXT NOT NULL,
    "subjectId" INTEGER,
    "topic" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "notes" TEXT NOT NULL,
    "quality" INTEGER NOT NULL,
    "focusLevel" INTEGER,
    "studyMethod" TEXT,
    "breakDuration" INTEGER
);

-- CreateTable
CREATE TABLE "HabitEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "habitName" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL,
    "date" DATETIME NOT NULL,
    "streak" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "AIConversation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "projectId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attachments" TEXT,
    "conversationId" INTEGER NOT NULL,
    CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeeklyReport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "weekStart" DATETIME NOT NULL,
    "weekEnd" DATETIME NOT NULL,
    "summary" TEXT NOT NULL,
    "productivityScore" REAL NOT NULL,
    "highlights" TEXT NOT NULL,
    "aiInsights" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "icon" TEXT
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "geminiApiKey" TEXT NOT NULL,
    "githubToken" TEXT NOT NULL,
    "githubUsername" TEXT NOT NULL,
    "cloudBackupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "accentColor" TEXT NOT NULL DEFAULT '#00F5FF',
    "dashboardWidgets" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "propFirmAccountsCount" INTEGER NOT NULL DEFAULT 1,
    "spotifyClientId" TEXT,
    "spotifyClientSecret" TEXT,
    "spotifyAccessToken" TEXT,
    "spotifyRefreshToken" TEXT,
    "spotifyExpiresAt" BIGINT,
    "summerBreakMode" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ticker" TEXT NOT NULL,
    "marketType" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "entryPrice" REAL NOT NULL,
    "exitPrice" REAL NOT NULL,
    "stopLoss" REAL,
    "takeProfit" REAL,
    "positionSize" REAL NOT NULL,
    "riskAmount" REAL NOT NULL,
    "pnl" REAL NOT NULL,
    "pnlPercentage" REAL NOT NULL,
    "entryTime" DATETIME NOT NULL,
    "exitTime" DATETIME,
    "status" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "setupType" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "notes" TEXT NOT NULL,
    "mistakes" TEXT NOT NULL,
    "emotions" TEXT NOT NULL,
    "screenshotUrl" TEXT,
    "tags" TEXT NOT NULL
);
