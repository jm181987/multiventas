-- Row Level Security de defensa en profundidad.
-- Variables por transacción: app.tenant_id, app.user_id, app.role, app.public.

CREATE OR REPLACE FUNCTION app_tenant_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_role() RETURNS text AS $$
  SELECT COALESCE(NULLIF(current_setting('app.role', true), ''), 'public')
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_is_public() RETURNS boolean AS $$
  SELECT COALESCE(NULLIF(current_setting('app.public', true), '')::boolean, false)
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_is_privileged() RETURNS boolean AS $$
  SELECT app_role() IN ('admin', 'system')
$$ LANGUAGE sql STABLE;

ALTER TABLE "vendors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vendors" FORCE ROW LEVEL SECURITY;
CREATE POLICY vendors_isolation ON "vendors"
  USING (
    "id" = app_tenant_id()
    OR app_is_privileged()
    OR "user_id"::text = current_setting('app.user_id', true)
  )
  WITH CHECK ("id" = app_tenant_id() OR app_is_privileged());

ALTER TABLE "stores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stores" FORCE ROW LEVEL SECURITY;
CREATE POLICY stores_isolation ON "stores"
  USING (
    "tenant_id" = app_tenant_id()
    OR app_is_privileged()
    OR (app_is_public() AND "status" = 'ACTIVE' AND "deleted_at" IS NULL)
  )
  WITH CHECK ("tenant_id" = app_tenant_id() OR app_is_privileged());

ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" FORCE ROW LEVEL SECURITY;
CREATE POLICY products_isolation ON "products"
  USING (
    "tenant_id" = app_tenant_id()
    OR app_is_privileged()
    OR (app_is_public() AND "status" = 'ACTIVE' AND "deleted_at" IS NULL)
  )
  WITH CHECK ("tenant_id" = app_tenant_id() OR app_is_privileged());

ALTER TABLE "product_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_images" FORCE ROW LEVEL SECURITY;
CREATE POLICY product_images_isolation ON "product_images"
  USING (
    "tenant_id" = app_tenant_id()
    OR app_is_privileged()
    OR (app_is_public() AND EXISTS (
      SELECT 1 FROM "products" p
      WHERE p."id" = "product_images"."product_id"
        AND p."status" = 'ACTIVE'
        AND p."deleted_at" IS NULL
    ))
  )
  WITH CHECK ("tenant_id" = app_tenant_id() OR app_is_privileged());

ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" FORCE ROW LEVEL SECURITY;
CREATE POLICY orders_isolation ON "orders"
  USING (
    "tenant_id" = app_tenant_id()
    OR app_is_privileged()
    OR "buyer_id"::text = current_setting('app.user_id', true)
  )
  WITH CHECK (
    "tenant_id" = app_tenant_id()
    OR app_is_privileged()
    OR "buyer_id"::text = current_setting('app.user_id', true)
  );

ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY order_items_isolation ON "order_items"
  USING (
    "tenant_id" = app_tenant_id()
    OR app_is_privileged()
    OR EXISTS (
      SELECT 1 FROM "orders" o
      WHERE o."id" = "order_items"."order_id"
        AND o."buyer_id"::text = current_setting('app.user_id', true)
    )
  )
  WITH CHECK (
    "tenant_id" = app_tenant_id()
    OR app_is_privileged()
    OR EXISTS (
      SELECT 1 FROM "orders" o
      WHERE o."id" = "order_items"."order_id"
        AND o."buyer_id"::text = current_setting('app.user_id', true)
    )
  );

ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" FORCE ROW LEVEL SECURITY;
CREATE POLICY payments_isolation ON "payments"
  USING (
    "tenant_id" = app_tenant_id()
    OR app_is_privileged()
    OR EXISTS (
      SELECT 1 FROM "orders" o
      WHERE o."id" = "payments"."order_id"
        AND o."buyer_id"::text = current_setting('app.user_id', true)
    )
  )
  WITH CHECK (
    "tenant_id" = app_tenant_id()
    OR app_is_privileged()
  );

ALTER TABLE "oauth_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "oauth_tokens" FORCE ROW LEVEL SECURITY;
CREATE POLICY oauth_tokens_isolation ON "oauth_tokens"
  USING ("tenant_id" = app_tenant_id() OR app_is_privileged())
  WITH CHECK ("tenant_id" = app_tenant_id() OR app_is_privileged());

ALTER TABLE "commissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commissions" FORCE ROW LEVEL SECURITY;
CREATE POLICY commissions_isolation ON "commissions"
  USING ("tenant_id" = app_tenant_id() OR app_is_privileged())
  WITH CHECK ("tenant_id" = app_tenant_id() OR app_is_privileged());

ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews" FORCE ROW LEVEL SECURITY;
CREATE POLICY reviews_isolation ON "reviews"
  USING (
    "tenant_id" = app_tenant_id()
    OR app_is_privileged()
    OR (app_is_public() AND "status" = 'PUBLISHED')
  )
  WITH CHECK ("tenant_id" = app_tenant_id() OR app_is_privileged());

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_isolation ON "audit_logs"
  USING ("tenant_id" = app_tenant_id() OR app_is_privileged())
  WITH CHECK ("tenant_id" = app_tenant_id() OR app_is_privileged());
