CREATE TABLE "product_analytics_daily" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "date" DATE NOT NULL,
  "views" INTEGER NOT NULL DEFAULT 0,
  "cart_adds" INTEGER NOT NULL DEFAULT 0,
  "favorite_adds" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_analytics_daily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_analytics_daily_product_id_date_key"
  ON "product_analytics_daily"("product_id", "date");

CREATE INDEX "product_analytics_daily_tenant_id_date_idx"
  ON "product_analytics_daily"("tenant_id", "date");

CREATE INDEX "product_analytics_daily_tenant_id_product_id_date_idx"
  ON "product_analytics_daily"("tenant_id", "product_id", "date");

ALTER TABLE "product_analytics_daily"
  ADD CONSTRAINT "product_analytics_daily_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_analytics_daily" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_analytics_daily" FORCE ROW LEVEL SECURITY;

CREATE POLICY product_analytics_daily_isolation ON "product_analytics_daily"
  USING ("tenant_id" = app_tenant_id() OR app_is_privileged())
  WITH CHECK ("tenant_id" = app_tenant_id() OR app_is_privileged());
