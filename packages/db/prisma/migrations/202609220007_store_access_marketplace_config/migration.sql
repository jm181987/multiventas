-- Corrige lectura pública de tiendas con RLS.
DROP POLICY IF EXISTS vendors_isolation ON "vendors";
CREATE POLICY vendors_isolation ON "vendors"
  USING (
    "id" = app_tenant_id()
    OR app_is_privileged()
    OR "user_id"::text = current_setting('app.user_id', true)
    OR (app_is_public() AND "status" = 'APPROVED' AND "deleted_at" IS NULL)
  )
  WITH CHECK ("id" = app_tenant_id() OR app_is_privileged());

-- Configuración dinámica y cifrada de la cuenta marketplace de Mercado Pago.
CREATE TABLE IF NOT EXISTS "marketplace_configs" (
  "id" VARCHAR(40) PRIMARY KEY,
  "provider" "PaymentProvider" NOT NULL UNIQUE,
  "account_email" VARCHAR(320),
  "client_id" VARCHAR(180),
  "client_secret_encrypted" TEXT,
  "fee_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.08,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
