-- Reviews: allow buyers to read their own review while keeping writes privileged.
DROP POLICY IF EXISTS reviews_isolation ON "reviews";

CREATE POLICY reviews_isolation ON "reviews"
  USING (
    "tenant_id" = app_tenant_id()
    OR app_is_privileged()
    OR "buyer_id"::text = current_setting('app.user_id', true)
    OR (app_is_public() AND "status" = 'PUBLISHED')
  )
  WITH CHECK ("tenant_id" = app_tenant_id() OR app_is_privileged());

CREATE INDEX IF NOT EXISTS "reviews_store_status_idx" ON "reviews"("store_id", "status");
