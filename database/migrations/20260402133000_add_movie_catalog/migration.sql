-- CreateEnum
CREATE TYPE "MovieCatalogSource" AS ENUM ('TMDB', 'CUSTOM_ADMIN');

-- CreateTable
CREATE TABLE "MovieCatalogEntry" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT,
    "releaseYear" INTEGER,
    "tmdbId" INTEGER,
    "posterPath" TEXT,
    "customPosterUrl" TEXT,
    "posterStorageKey" TEXT,
    "source" "MovieCatalogSource" NOT NULL DEFAULT 'TMDB',
    "synopsis" TEXT,
    "addedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieCatalogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MovieCatalogEntry_tmdbId_key" ON "MovieCatalogEntry"("tmdbId");

-- CreateIndex
CREATE INDEX "MovieCatalogEntry_title_idx" ON "MovieCatalogEntry"("title");

-- AddForeignKey
ALTER TABLE "MovieCatalogEntry" ADD CONSTRAINT "MovieCatalogEntry_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
