ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CART_ABANDONED';

CREATE TABLE "favorites" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "favorites_user_id_product_id_key"
  ON "favorites"("user_id", "product_id");
CREATE INDEX "favorites_user_id_created_at_idx"
  ON "favorites"("user_id", "created_at");
CREATE INDEX "favorites_product_id_idx"
  ON "favorites"("product_id");

ALTER TABLE "favorites"
  ADD CONSTRAINT "favorites_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "favorites"
  ADD CONSTRAINT "favorites_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "favorites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "favorites" FORCE ROW LEVEL SECURITY;

CREATE POLICY favorites_user_isolation ON "favorites"
  USING (
    "user_id"::text = current_setting('app.user_id', true)
    OR app_is_privileged()
  )
  WITH CHECK (
    "user_id"::text = current_setting('app.user_id', true)
    OR app_is_privileged()
  );
