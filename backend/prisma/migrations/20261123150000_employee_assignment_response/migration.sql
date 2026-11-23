ALTER TABLE "service_requests"
  ADD COLUMN "employee_response" VARCHAR(24) NOT NULL DEFAULT 'Not assigned',
  ADD COLUMN "employee_responded_at" TIMESTAMPTZ(6),
  ADD COLUMN "employee_decline_note" VARCHAR(500);

UPDATE "service_requests"
SET "employee_response" = CASE
  WHEN "status" IN ('Confirmed', 'Rescheduled', 'Provider assigned') THEN 'Pending'
  ELSE 'Accepted'
END
WHERE "assigned_employee_id" IS NOT NULL;

ALTER TABLE "service_requests"
  ADD CONSTRAINT "service_requests_employee_response_check"
  CHECK ("employee_response" IN ('Not assigned', 'Pending', 'Accepted', 'Declined'));
