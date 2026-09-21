-- Alinea detalles físicos con los nombres/defaults esperados por Prisma
-- sin eliminar las políticas RLS agregadas en la migración anterior.

ALTER TABLE "users" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "vendors" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "stores" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "categories" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "products" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "payments" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "oauth_tokens" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "commissions" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "reviews" ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER INDEX "vendors_status_kyc_idx" RENAME TO "vendors_status_kyc_status_idx";
ALTER INDEX "stores_tenant_status_idx" RENAME TO "stores_tenant_id_status_idx";
ALTER INDEX "categories_parent_active_sort_idx" RENAME TO "categories_parent_id_is_active_sort_order_idx";
ALTER INDEX "products_tenant_status_deleted_idx" RENAME TO "products_tenant_id_status_deleted_at_idx";
ALTER INDEX "products_category_status_idx" RENAME TO "products_category_id_status_idx";
ALTER INDEX "product_images_tenant_product_sort_idx" RENAME TO "product_images_tenant_id_product_id_sort_order_idx";
ALTER INDEX "orders_tenant_status_created_idx" RENAME TO "orders_tenant_id_status_created_at_idx";
ALTER INDEX "orders_buyer_created_idx" RENAME TO "orders_buyer_id_created_at_idx";
ALTER INDEX "payments_tenant_status_created_idx" RENAME TO "payments_tenant_id_status_created_at_idx";
ALTER INDEX "oauth_tokens_expires_idx" RENAME TO "oauth_tokens_expires_at_idx";
ALTER INDEX "commissions_tenant_status_created_idx" RENAME TO "commissions_tenant_id_status_created_at_idx";
ALTER INDEX "reviews_tenant_product_status_idx" RENAME TO "reviews_tenant_id_product_id_status_idx";
ALTER INDEX "audit_logs_tenant_created_idx" RENAME TO "audit_logs_tenant_id_created_at_idx";

CREATE INDEX "users_status_idx" ON "users"("status");
CREATE INDEX "refresh_tokens_user_id_expires_at_idx" ON "refresh_tokens"("user_id","expires_at");
CREATE INDEX "products_title_idx" ON "products"("title");
CREATE INDEX "order_items_tenant_id_order_id_idx" ON "order_items"("tenant_id","order_id");
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");
CREATE INDEX "reviews_store_id_status_idx" ON "reviews"("store_id","status");
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id","created_at");
