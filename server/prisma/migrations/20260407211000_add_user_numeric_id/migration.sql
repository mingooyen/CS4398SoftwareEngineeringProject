-- Add numeric user id sequence-backed column
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "numericId" BIGSERIAL;

-- Backfill existing nulls defensively if needed
UPDATE "User" SET "numericId" = nextval(pg_get_serial_sequence('"User"','numericId')) WHERE "numericId" IS NULL;

-- Enforce not null + unique
ALTER TABLE "User" ALTER COLUMN "numericId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "User_numericId_key" ON "User"("numericId");
