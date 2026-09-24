ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MESSAGE_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SUPPORT_CASE_CREATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SUPPORT_CASE_UPDATED';

CREATE TYPE "SupportCaseStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED');

CREATE TABLE "order_messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "sender_user_id" UUID NOT NULL,
  "sender_role" "UserRole" NOT NULL,
  "message" TEXT NOT NULL,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_messages_tenant_id_order_id_created_at_idx"
  ON "order_messages"("tenant_id", "order_id", "created_at");
CREATE INDEX "order_messages_order_id_read_at_created_at_idx"
  ON "order_messages"("order_id", "read_at", "created_at");
CREATE INDEX "order_messages_sender_user_id_created_at_idx"
  ON "order_messages"("sender_user_id", "created_at");

ALTER TABLE "order_messages"
  ADD CONSTRAINT "order_messages_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_messages"
  ADD CONSTRAINT "order_messages_sender_user_id_fkey"
  FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "support_cases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "created_by_user_id" UUID NOT NULL,
  "status" "SupportCaseStatus" NOT NULL DEFAULT 'OPEN',
  "subject" VARCHAR(180) NOT NULL,
  "description" TEXT NOT NULL,
  "admin_note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "resolved_at" TIMESTAMP(3),
  CONSTRAINT "support_cases_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "support_cases_tenant_id_status_created_at_idx"
  ON "support_cases"("tenant_id", "status", "created_at");
CREATE INDEX "support_cases_order_id_created_at_idx"
  ON "support_cases"("order_id", "created_at");
CREATE INDEX "support_cases_created_by_user_id_status_created_at_idx"
  ON "support_cases"("created_by_user_id", "status", "created_at");

ALTER TABLE "support_cases"
  ADD CONSTRAINT "support_cases_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_cases"
  ADD CONSTRAINT "support_cases_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_messages" FORCE ROW LEVEL SECURITY;
CREATE POLICY order_messages_isolation ON "order_messages"
  USING (
    app_is_privileged()
    OR "tenant_id" = app_tenant_id()
    OR EXISTS (
      SELECT 1
      FROM "orders" o
      JOIN "vendors" v ON v."id" = o."tenant_id"
      WHERE o."id" = "order_messages"."order_id"
        AND (
          o."buyer_id"::text = current_setting('app.user_id', true)
          OR v."user_id"::text = current_setting('app.user_id', true)
        )
    )
  )
  WITH CHECK (
    app_is_privileged()
    OR (
      "sender_user_id"::text = current_setting('app.user_id', true)
      AND EXISTS (
        SELECT 1
        FROM "orders" o
        JOIN "vendors" v ON v."id" = o."tenant_id"
        WHERE o."id" = "order_messages"."order_id"
          AND (
            o."buyer_id"::text = current_setting('app.user_id', true)
            OR v."user_id"::text = current_setting('app.user_id', true)
          )
      )
    )
  );

ALTER TABLE "support_cases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "support_cases" FORCE ROW LEVEL SECURITY;
CREATE POLICY support_cases_isolation ON "support_cases"
  USING (
    app_is_privileged()
    OR "tenant_id" = app_tenant_id()
    OR EXISTS (
      SELECT 1
      FROM "orders" o
      JOIN "vendors" v ON v."id" = o."tenant_id"
      WHERE o."id" = "support_cases"."order_id"
        AND (
          o."buyer_id"::text = current_setting('app.user_id', true)
          OR v."user_id"::text = current_setting('app.user_id', true)
        )
    )
  )
  WITH CHECK (
    app_is_privileged()
    OR (
      "created_by_user_id"::text = current_setting('app.user_id', true)
      AND EXISTS (
        SELECT 1
        FROM "orders" o
        JOIN "vendors" v ON v."id" = o."tenant_id"
        WHERE o."id" = "support_cases"."order_id"
          AND (
            o."buyer_id"::text = current_setting('app.user_id', true)
            OR v."user_id"::text = current_setting('app.user_id', true)
          )
      )
    )
  );
