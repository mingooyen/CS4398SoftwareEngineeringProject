-- Genre + admin notes for catalog rows (recommendations vs member tastes; ops notes).
ALTER TABLE "MovieCatalogEntry" ADD COLUMN IF NOT EXISTS "genre" TEXT;
ALTER TABLE "MovieCatalogEntry" ADD COLUMN IF NOT EXISTS "adminNotes" TEXT;
