-- Vendor growth suite: promotions/coupons linked to store orders.

CREATE TYPE "PromotionType" AS ENUM ('PERCENT', 'FIXED');

ALTER TABLE "orders"
  ADD COLUMN "promotion_id" UUID,
  ADD COLUMN "coupon_code" VARCHAR(80);

CREATE TABLE "promotions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "store_id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "code" VARCHAR(80) NOT NULL,
  "type" "PromotionType" NOT NULL,
  "value" DECIMAL(12,2) NOT NULL,
  "min_order_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "max_discount_amount" DECIMAL(12,2),
  "starts_at" TIMESTAMP(3),
  "ends_at" TIMESTAMP(3),
  "max_uses" INTEGER,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "promotions_store_id_code_key" ON "promotions"("store_id", "code");
CREATE INDEX "promotions_tenant_id_is_active_idx" ON "promotions"("tenant_id", "is_active");
CREATE INDEX "promotions_store_id_is_active_starts_at_ends_at_idx" ON "promotions"("store_id", "is_active", "starts_at", "ends_at");
CREATE INDEX "orders_promotion_id_idx" ON "orders"("promotion_id");

ALTER TABLE "promotions"
  ADD CONSTRAINT "promotions_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "promotions"
  ADD CONSTRAINT "promotions_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_promotion_id_fkey"
  FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "promotions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "promotions" FORCE ROW LEVEL SECURITY;
CREATE POLICY promotions_isolation ON "promotions"
  USING ("tenant_id" = app_tenant_id() OR app_is_privileged())
  WITH CHECK ("tenant_id" = app_tenant_id() OR app_is_privileged());
