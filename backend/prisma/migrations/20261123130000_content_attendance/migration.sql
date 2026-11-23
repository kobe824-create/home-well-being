-- Website content can be edited by administrators without a code deployment.
CREATE TABLE "website_content" (
    "id" UUID NOT NULL,
    "key" VARCHAR(40) NOT NULL DEFAULT 'homepage',
    "content" JSONB NOT NULL,
    "updated_by" VARCHAR(254) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "website_content_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "website_content_key_key" ON "website_content"("key");

-- Store a single arrival and departure for each employee on a specific visit.
-- Coordinates are captured only at the employee's explicit attendance action.
CREATE TABLE "work_attendance" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "check_in_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "check_in_latitude" DECIMAL(9,6) NOT NULL,
    "check_in_longitude" DECIMAL(9,6) NOT NULL,
    "check_out_at" TIMESTAMPTZ(6),
    "check_out_latitude" DECIMAL(9,6),
    "check_out_longitude" DECIMAL(9,6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "work_attendance_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "work_attendance_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "work_attendance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "work_attendance_request_id_employee_id_key" ON "work_attendance"("request_id", "employee_id");
CREATE INDEX "work_attendance_employee_id_check_in_at_idx" ON "work_attendance"("employee_id", "check_in_at" DESC);

-- Employee notes, incidents and supply requests stay attached to their visit.
CREATE TABLE "service_reports" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "kind" VARCHAR(24) NOT NULL,
    "message" VARCHAR(2000) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_reports_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "service_reports_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "service_reports_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "service_reports_request_id_created_at_idx" ON "service_reports"("request_id", "created_at" DESC);
CREATE INDEX "service_reports_employee_id_created_at_idx" ON "service_reports"("employee_id", "created_at" DESC);

CREATE TABLE "customer_feedback" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "kind" VARCHAR(16) NOT NULL,
    "rating" INTEGER,
    "message" VARCHAR(2000) NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'Received',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "customer_feedback_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_feedback_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "customer_feedback_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "customer_feedback_rating_check" CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5),
    CONSTRAINT "customer_feedback_kind_check" CHECK ("kind" IN ('complaint', 'feedback'))
);
CREATE INDEX "customer_feedback_status_created_at_idx" ON "customer_feedback"("status", "created_at" DESC);
CREATE INDEX "customer_feedback_request_id_created_at_idx" ON "customer_feedback"("request_id", "created_at" DESC);

CREATE TABLE "employee_leave_requests" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'Pending',
    "reviewer_id" UUID,
    "reviewer_note" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "employee_leave_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "employee_leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "employee_leave_requests_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "employee_leave_dates_check" CHECK ("end_date" >= "start_date"),
    CONSTRAINT "employee_leave_status_check" CHECK ("status" IN ('Pending', 'Approved', 'Declined'))
);
CREATE INDEX "employee_leave_requests_employee_id_created_at_idx" ON "employee_leave_requests"("employee_id", "created_at" DESC);
CREATE INDEX "employee_leave_requests_status_start_date_idx" ON "employee_leave_requests"("status", "start_date");
