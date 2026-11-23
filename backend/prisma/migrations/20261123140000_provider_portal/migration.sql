ALTER TYPE "UserRole" ADD VALUE 'PROVIDER';

ALTER TABLE "provider_applications"
  ADD COLUMN "user_id" UUID,
  ADD CONSTRAINT "provider_applications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "provider_applications_user_id_key" ON "provider_applications"("user_id");

ALTER TABLE "service_requests"
  ADD COLUMN "provider_response" VARCHAR(24) NOT NULL DEFAULT 'Not assigned',
  ADD COLUMN "provider_responded_at" TIMESTAMPTZ(6),
  ADD COLUMN "provider_decline_note" VARCHAR(500);

UPDATE "service_requests" SET "provider_response" = 'Pending' WHERE "assigned_provider_id" IS NOT NULL;

ALTER TABLE "service_requests"
  ADD CONSTRAINT "service_requests_provider_response_check"
  CHECK ("provider_response" IN ('Not assigned', 'Pending', 'Accepted', 'Declined'));
