-- Migrate legacy staff/client values to the new role model.
-- The enum values must be committed before they can be used in row updates.
BEGIN;
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'RECEPCION';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ENTRENADOR';
COMMIT;

BEGIN;
UPDATE "users"
SET "role" = 'RECEPCION'
WHERE "role"::text IN ('EMPLOYEE', 'CLIENT');

CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'RECEPCION', 'ENTRENADOR');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "Role_new"
  USING (
    CASE
      WHEN "role"::text = 'ADMIN' THEN 'ADMIN'::"Role_new"
      WHEN "role"::text = 'RECEPCION' THEN 'RECEPCION'::"Role_new"
      WHEN "role"::text = 'ENTRENADOR' THEN 'ENTRENADOR'::"Role_new"
      ELSE 'RECEPCION'::"Role_new"
    END
  );
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'RECEPCION';
COMMIT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'RECEPCION';
