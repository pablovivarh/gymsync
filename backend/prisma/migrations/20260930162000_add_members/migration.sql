-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "members" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "document_id" VARCHAR(50),
    "birth_date" DATE,
    "address" TEXT,
    "notes" TEXT,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "joined_at" DATE NOT NULL DEFAULT CURRENT_DATE,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "members_email_key"
    ON "members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "members_document_id_key"
    ON "members"("document_id");

-- CreateIndex
CREATE INDEX "members_phone_idx"
    ON "members"("phone");

-- CreateIndex
CREATE INDEX "members_status_idx"
    ON "members"("status");

-- CreateIndex
CREATE INDEX "members_joined_at_idx"
    ON "members"("joined_at");

-- CreateIndex
CREATE INDEX "members_full_name_idx"
    ON "members"("full_name");

-- AddForeignKey
ALTER TABLE "members"
    ADD CONSTRAINT "members_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
