-- Product delivery options and in-app notifications.

CREATE TYPE "DeliveryMethodType" AS ENUM ('SHIPPING_PAID', 'SHIPPING_FREE', 'PICKUP', 'DIGITAL');
CREATE TYPE "NotificationType" AS ENUM (
  'ORDER_CREATED',
  'PAYMENT_APPROVED',
  'PAYMENT_FAILED',
  'ORDER_SHIPPED',
  'ORDER_DELIVERED',
  'ORDER_CANCELLED',
  'REVIEW_REQUEST',
  'REVIEW_RECEIVED',
  'REVIEW_PUBLISHED',
  'STOCK_LOW'
);

CREATE TABLE "product_delivery_options" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "type" "DeliveryMethodType" NOT NULL,
  "fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "details" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_delivery_options_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_delivery_options_product_id_type_key"
  ON "product_delivery_options"("product_id", "type");
CREATE INDEX "product_delivery_options_tenant_id_product_id_is_active_idx"
  ON "product_delivery_options"("tenant_id", "product_id", "is_active");

ALTER TABLE "product_delivery_options"
  ADD CONSTRAINT "product_delivery_options_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_items"
  ADD COLUMN "delivery_method" "DeliveryMethodType",
  ADD COLUMN "delivery_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "delivery_details" TEXT;

CREATE TABLE "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "tenant_id" UUID,
  "type" "NotificationType" NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "message" TEXT NOT NULL,
  "href" VARCHAR(320),
  "metadata" JSONB,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_user_id_read_at_created_at_idx"
  ON "notifications"("user_id", "read_at", "created_at");
CREATE INDEX "notifications_tenant_id_created_at_idx"
  ON "notifications"("tenant_id", "created_at");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_delivery_options" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_delivery_options" FORCE ROW LEVEL SECURITY;
CREATE POLICY product_delivery_options_isolation ON "product_delivery_options"
  USING (
    "tenant_id" = app_tenant_id()
    OR app_is_privileged()
    OR (app_is_public() AND EXISTS (
      SELECT 1 FROM "products" p
      WHERE p."id" = "product_delivery_options"."product_id"
        AND p."status" = 'ACTIVE'
        AND p."deleted_at" IS NULL
    ))
  )
  WITH CHECK ("tenant_id" = app_tenant_id() OR app_is_privileged());

ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;
CREATE POLICY notifications_isolation ON "notifications"
  USING (
    "user_id"::text = current_setting('app.user_id', true)
    OR app_is_privileged()
  )
  WITH CHECK (
    "user_id"::text = current_setting('app.user_id', true)
    OR app_is_privileged()
  );
