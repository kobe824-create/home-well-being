-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'OPERATIONS';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "session_version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "service_requests" ADD COLUMN     "household_id" UUID,
ADD COLUMN     "occurrence_count" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "occurrence_index" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "recurrence_frequency" VARCHAR(16),
ADD COLUMN     "series_id" UUID;

-- AlterTable
ALTER TABLE "work_attendance" ADD COLUMN     "check_in_accuracy" DOUBLE PRECISION,
ADD COLUMN     "check_in_captured_at" TIMESTAMPTZ(6),
ADD COLUMN     "check_out_accuracy" DOUBLE PRECISION,
ADD COLUMN     "check_out_captured_at" TIMESTAMPTZ(6),
ADD COLUMN     "discrepancy_note" TEXT,
ADD COLUMN     "distance_meters" DOUBLE PRECISION,
ADD COLUMN     "review_note" TEXT,
ADD COLUMN     "reviewed_by" UUID,
ADD COLUMN     "verification_status" VARCHAR(32) NOT NULL DEFAULT 'Unverified';

-- AlterTable
ALTER TABLE "service_reports" ADD COLUMN     "response" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Open';

-- AlterTable
ALTER TABLE "customer_feedback" ADD COLUMN     "assigned_to" UUID,
ADD COLUMN     "resolution" TEXT,
ADD COLUMN     "resolved_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "service" VARCHAR(32) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "hourly_rate_rwf" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "minimum_hours" INTEGER NOT NULL DEFAULT 2,
    "qualification_rules" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "households" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "address" VARCHAR(500) NOT NULL,
    "neighborhood" VARCHAR(120) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "geofence_meters" INTEGER NOT NULL DEFAULT 150,
    "location_approved" BOOLEAN NOT NULL DEFAULT false,
    "contacts" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "department_id" UUID,
    "job_title" TEXT NOT NULL DEFAULT '',
    "screening_status" TEXT NOT NULL DEFAULT 'Pending',
    "screening_notes" TEXT NOT NULL DEFAULT '',
    "qualifications" JSONB NOT NULL DEFAULT '[]',
    "availability" JSONB NOT NULL DEFAULT '[]',
    "hourly_rate_rwf" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "monthly_salary_rwf" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "contract_start" DATE,
    "contract_end" DATE,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "private_documents" (
    "id" UUID NOT NULL,
    "uploader_id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "household_id" UUID,
    "name" VARCHAR(180) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "category" VARCHAR(64) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "reviewer_id" UUID,
    "reviewer_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "private_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "dedupe_key" TEXT,
    "message" VARCHAR(1000) NOT NULL,
    "link" TEXT NOT NULL DEFAULT '/account',
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_outbox" (
    "id" UUID NOT NULL,
    "recipient" VARCHAR(254) NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "number" VARCHAR(32) NOT NULL,
    "request_id" UUID NOT NULL,
    "client_id" UUID,
    "line_items" JSONB NOT NULL,
    "total_rwf" DECIMAL(12,2) NOT NULL,
    "due_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'Unpaid',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "amount_rwf" DECIMAL(12,2) NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'PAYMENT',
    "method" VARCHAR(40) NOT NULL,
    "reference" VARCHAR(180) NOT NULL,
    "provider_reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Recorded',
    "recorded_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "rate_rwf" DECIMAL(12,2) NOT NULL,
    "gross_rwf" DECIMAL(12,2) NOT NULL,
    "deductions_rwf" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_rwf" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "approved_by" UUID,
    "paid_at" TIMESTAMPTZ(6),
    "reference" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "amount_rwf" DECIMAL(12,2) NOT NULL,
    "reference" VARCHAR(180),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_changes" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "kind" VARCHAR(24) NOT NULL,
    "requested_date" DATE,
    "start_time" VARCHAR(5),
    "duration_hours" INTEGER,
    "reason" VARCHAR(1000) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "reviewer_note" TEXT,
    "reviewed_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_sessions" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "tx_ref" TEXT NOT NULL,
    "amount_rwf" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "provider_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_enquiries" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(24) NOT NULL DEFAULT '',
    "subject" VARCHAR(160) NOT NULL,
    "message" VARCHAR(2000) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'New',
    "response_note" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_service_key" ON "departments"("service");

-- CreateIndex
CREATE INDEX "households_client_id_idx" ON "households"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_user_id_key" ON "staff_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "private_documents_storage_key_key" ON "private_documents"("storage_key");

-- CreateIndex
CREATE INDEX "private_documents_owner_user_id_idx" ON "private_documents"("owner_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "email_outbox_status_created_at_idx" ON "email_outbox"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_hash_key" ON "password_resets"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_request_id_key" ON "invoices"("request_id");

-- CreateIndex
CREATE INDEX "invoices_client_id_idx" ON "invoices"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_reference_key" ON "payments"("provider_reference");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_invoice_id_kind_reference_key" ON "payments"("invoice_id", "kind", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_employee_id_period_start_period_end_key" ON "payroll"("employee_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "service_changes_client_id_idx" ON "service_changes"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "checkout_sessions_tx_ref_key" ON "checkout_sessions"("tx_ref");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
