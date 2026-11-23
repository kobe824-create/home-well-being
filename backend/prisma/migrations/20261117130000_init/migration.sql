-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EMPLOYEE', 'CLIENT');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(24),
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_requests" (
    "id" UUID NOT NULL,
    "reference" VARCHAR(24) NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(24) NOT NULL,
    "email" VARCHAR(254),
    "preferred_contact" VARCHAR(16) NOT NULL,
    "service" VARCHAR(32) NOT NULL,
    "neighborhood" VARCHAR(100) NOT NULL,
    "requested_date" DATE NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "duration_hours" INTEGER NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "service_details" JSONB NOT NULL DEFAULT '{}',
    "contact_consent" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(64) NOT NULL DEFAULT 'New request',
    "assigned_provider_id" UUID,
    "assigned_employee_id" UUID,
    "client_user_id" UUID,
    "quoted_amount_rwf" DECIMAL(12,2),
    "payment_method" VARCHAR(32) NOT NULL DEFAULT 'Not decided',
    "client_payment_status" VARCHAR(32) NOT NULL DEFAULT 'Not discussed',
    "provider_payment_status" VARCHAR(32) NOT NULL DEFAULT 'Not recorded',
    "transaction_reference" VARCHAR(120),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_applications" (
    "id" UUID NOT NULL,
    "reference" VARCHAR(24) NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(24) NOT NULL,
    "email" VARCHAR(254),
    "neighborhood" VARCHAR(100) NOT NULL,
    "service" VARCHAR(32) NOT NULL,
    "experience" TEXT NOT NULL,
    "languages" VARCHAR(150) NOT NULL,
    "availability" VARCHAR(250) NOT NULL,
    "training" TEXT,
    "references_text" TEXT NOT NULL,
    "reference_consent" BOOLEAN NOT NULL DEFAULT false,
    "screening_consent" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(64) NOT NULL DEFAULT 'Application received',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "provider_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_log" (
    "id" BIGSERIAL NOT NULL,
    "actor" VARCHAR(254) NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "entity_type" VARCHAR(40) NOT NULL,
    "entity_id" UUID NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_is_active_idx" ON "users"("role", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "service_requests_reference_key" ON "service_requests"("reference");

-- CreateIndex
CREATE INDEX "service_requests_created_at_idx" ON "service_requests"("created_at" DESC);

-- CreateIndex
CREATE INDEX "service_requests_status_idx" ON "service_requests"("status");

-- CreateIndex
CREATE INDEX "service_requests_client_user_id_created_at_idx" ON "service_requests"("client_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "service_requests_assigned_employee_id_created_at_idx" ON "service_requests"("assigned_employee_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "provider_applications_reference_key" ON "provider_applications"("reference");

-- CreateIndex
CREATE INDEX "provider_applications_created_at_idx" ON "provider_applications"("created_at" DESC);

-- CreateIndex
CREATE INDEX "admin_audit_log_created_at_idx" ON "admin_audit_log"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_assigned_provider_id_fkey" FOREIGN KEY ("assigned_provider_id") REFERENCES "provider_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_assigned_employee_id_fkey" FOREIGN KEY ("assigned_employee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_client_user_id_fkey" FOREIGN KEY ("client_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Constrain service keys accepted by public and staff forms.
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_service_check"
  CHECK ("service" IN ('elderly', 'childcare', 'cooking', 'cleaning', 'security'));
ALTER TABLE "provider_applications" ADD CONSTRAINT "provider_applications_service_check"
  CHECK ("service" IN ('elderly', 'childcare', 'cooking', 'cleaning', 'security'));
