-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'FREE',
    "dailyStreak" INTEGER NOT NULL DEFAULT 0,
    "lastPracticeDate" TIMESTAMP(3),
    "totalXp" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "elo" INTEGER NOT NULL DEFAULT 1500,
    "xp" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SubjectStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "baseDifficulty" INTEGER NOT NULL DEFAULT 1500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPerformance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "timeTakenMs" INTEGER,
    "eloChange" INTEGER NOT NULL DEFAULT 0,
    "srsInterval" INTEGER NOT NULL DEFAULT 0,
    "srsRepetitions" INTEGER NOT NULL DEFAULT 0,
    "srsEaseFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "nextReviewDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiryDate" TIMESTAMP(3),
    "mentorPreset" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectStats_userId_subject_key" ON "SubjectStats"("userId", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarState_userId_key" ON "CalendarState"("userId");

-- AddForeignKey
ALTER TABLE "SubjectStats" ADD CONSTRAINT "SubjectStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPerformance" ADD CONSTRAINT "UserPerformance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPerformance" ADD CONSTRAINT "UserPerformance_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarState" ADD CONSTRAINT "CalendarState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
