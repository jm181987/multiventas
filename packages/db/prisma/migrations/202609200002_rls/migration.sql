-- RLS de defensa en profundidad.
-- El backend configura estas variables por request dentro de una transacción:
-- app.tenant_id, app.role, app.public, app.user_id.

CREATE OR REPLACE FUNCTION app_tenant_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_role() RETURNS text AS $$
  SELECT COALESCE(NULLIF(current_setting('app.role', true), ''), 'public')
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_is_public() RETURNS boolean AS $$
  SELECT COALESCE(NULLIF(current_setting('app.public', true), '')::boolean, false)
$$ LANGUAGE sql STABLE;

ALTER TABLE "stores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stores" FORCE ROW LEVEL SECURITY;
CREATE POLICY stores_tenant_all ON "stores"
  USING ("tenant_id" = app_tenant_id() OR app_role() = 'admin' OR (app_is_public() AND "status" = 'ACTIVE' AND "deleted_at" IS NULL))
  WITH CHECK ("tenant_id" = app_tenant_id() OR app_role() = 'admin');

ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" FORCE ROW LEVEL SECURITY;
CREATE POLICY products_tenant_all ON "products"
  USING ("tenant_id" = app_tenant_id() OR app_role() = 'admin' OR (app_is_public() AND "status" = 'ACTIVE' AND "deleted_at" IS NULL))
  WITH CHECK ("tenant_id" = app_tenant_id() OR app_role() = 'admin');

ALTER TABLE "product_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_images" FORCE ROW LEVEL SECURITY;
CREATE POLICY product_images_tenant_all ON "product_images"
  USING ("tenant_id" = app_tenant_id() OR app_role() = 'admin' OR app_is_public())
  WITH CHECK ("tenant_id" = app_tenant_id() OR app_role() = 'admin');

ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" FORCE ROW LEVEL SECURITY;
CREATE POLICY orders_tenant_all ON "orders"
  USING ("tenant_id" = app_tenant_id() OR app_role() = 'admin' OR "buyer_id"::text = current_setting('app.user_id', true))
  WITH CHECK ("tenant_id" = app_tenant_id() OR app_role() = 'admin' OR "buyer_id"::text = current_setting('app.user_id', true));

ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY order_items_tenant_all ON "order_items"
  USING ("tenant_id" = app_tenant_id() OR app_role() = 'admin' OR EXISTS (
    SELECT 1 FROM "orders" o WHERE o."id" = "order_items"."order_id" AND o."buyer_id"::text = current_setting('app.user_id', true)
  ))
  WITH CHECK ("tenant_id" = app_tenant_id() OR app_role() = 'admin');

ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" FORCE ROW LEVEL SECURITY;
CREATE POLICY payments_tenant_all ON "payments"
  USING ("tenant_id" = app_tenant_id() OR app_role() = 'admin' OR EXISTS (
    SELECT 1 FROM "orders" o WHERE o."id" = "payments"."order_id" AND o."buyer_id"::text = current_setting('app.user_id', true)
  ))
  WITH CHECK ("tenant_id" = app_tenant_id() OR app_role() = 'admin');

ALTER TABLE "oauth_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "oauth_tokens" FORCE ROW LEVEL SECURITY;
CREATE POLICY oauth_tokens_tenant_all ON "oauth_tokens"
  USING ("tenant_id" = app_tenant_id() OR app_role() = 'admin')
  WITH CHECK ("tenant_id" = app_tenant_id() OR app_role() = 'admin');

ALTER TABLE "commissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commissions" FORCE ROW LEVEL SECURITY;
CREATE POLICY commissions_tenant_all ON "commissions"
  USING ("tenant_id" = app_tenant_id() OR app_role() = 'admin')
  WITH CHECK ("tenant_id" = app_tenant_id() OR app_role() = 'admin');

ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews" FORCE ROW LEVEL SECURITY;
CREATE POLICY reviews_tenant_all ON "reviews"
  USING ("tenant_id" = app_tenant_id() OR app_role() = 'admin' OR (app_is_public() AND "status" = 'PUBLISHED'))
  WITH CHECK ("tenant_id" = app_tenant_id() OR app_role() = 'admin');

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_tenant_all ON "audit_logs"
  USING ("tenant_id" = app_tenant_id() OR app_role() = 'admin')
  WITH CHECK ("tenant_id" = app_tenant_id() OR app_role() = 'admin');
