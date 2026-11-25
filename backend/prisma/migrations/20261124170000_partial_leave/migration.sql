ALTER TABLE "employee_leave_requests"
    ADD COLUMN "kind" VARCHAR(40) NOT NULL DEFAULT 'Time off',
    ADD COLUMN "start_time" VARCHAR(5),
    ADD COLUMN "end_time" VARCHAR(5),
    ADD CONSTRAINT "employee_leave_kind_check" CHECK ("kind" IN ('Time off', 'Absence', 'Early departure permission', 'Schedule change')),
    ADD CONSTRAINT "employee_leave_time_window_check" CHECK (
        ("start_time" IS NULL AND "end_time" IS NULL)
        OR (
            "start_time" IS NOT NULL AND "end_time" IS NOT NULL
            AND "start_date" = "end_date"
            AND "start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
            AND "end_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
            AND "end_time" > "start_time"
        )
    );
