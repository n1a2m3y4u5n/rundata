-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "missionId" TEXT NOT NULL,
    "runnerId" TEXT NOT NULL,
    "runSessionId" TEXT,
    "photoData" TEXT,
    "maskedPhotoData" TEXT,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observationData" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "qualityScore" REAL NOT NULL DEFAULT 0,
    "aiLabels" TEXT,
    "piiRegions" TEXT,
    "gpsMatch" BOOLEAN NOT NULL DEFAULT false,
    "distanceM" INTEGER NOT NULL DEFAULT 0,
    "autoReviewed" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "policyStatus" TEXT NOT NULL DEFAULT 'RECEIVED',
    "policyNote" TEXT,
    "policyUpdatedAt" DATETIME,
    CONSTRAINT "Submission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Submission_runnerId_fkey" FOREIGN KEY ("runnerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Submission_runSessionId_fkey" FOREIGN KEY ("runSessionId") REFERENCES "RunSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Submission" ("aiLabels", "autoReviewed", "capturedAt", "createdAt", "distanceM", "gpsMatch", "id", "lat", "lng", "maskedPhotoData", "missionId", "observationData", "photoData", "piiRegions", "qualityScore", "rejectionReason", "reviewedAt", "runSessionId", "runnerId", "status") SELECT "aiLabels", "autoReviewed", "capturedAt", "createdAt", "distanceM", "gpsMatch", "id", "lat", "lng", "maskedPhotoData", "missionId", "observationData", "photoData", "piiRegions", "qualityScore", "rejectionReason", "reviewedAt", "runSessionId", "runnerId", "status" FROM "Submission";
DROP TABLE "Submission";
ALTER TABLE "new_Submission" RENAME TO "Submission";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
