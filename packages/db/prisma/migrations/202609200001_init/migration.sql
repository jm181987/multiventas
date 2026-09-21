CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "UserRole" AS ENUM ('BUYER','VENDOR','ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE','SUSPENDED');
CREATE TYPE "VendorStatus" AS ENUM ('PENDING','APPROVED','SUSPENDED','REJECTED');
CREATE TYPE "KycStatus" AS ENUM ('NOT_STARTED','PENDING','VERIFIED','REJECTED');
CREATE TYPE "StoreStatus" AS ENUM ('DRAFT','ACTIVE','SUSPENDED');
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT','ACTIVE','ARCHIVED');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING','PAID','SHIPPED','DELIVERED','CANCELLED');
CREATE TYPE "PaymentProvider" AS ENUM ('MERCADO_PAGO','HANDY');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING','APPROVED','REJECTED','CANCELLED','REFUNDED','CHARGEBACK');
CREATE TYPE "OAuthProvider" AS ENUM ('MERCADO_PAGO');
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING','CONFIRMED','REFUNDED');
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING','PUBLISHED','REJECTED');

CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" VARCHAR(320) NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "phone" VARCHAR(40),
  "roles" "UserRole"[] NOT NULL DEFAULT ARRAY['BUYER']::"UserRole"[],
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3)
);

CREATE TABLE "refresh_tokens" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" TEXT NOT NULL UNIQUE,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "vendors" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE RESTRICT,
  "business_name" VARCHAR(180) NOT NULL,
  "document_type" VARCHAR(30),
  "document_number" VARCHAR(80),
  "status" "VendorStatus" NOT NULL DEFAULT 'PENDING',
  "kyc_status" "KycStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "kyc_data" JSONB,
  "approved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3)
);

CREATE TABLE "stores" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "vendors"("id") ON DELETE RESTRICT,
  "slug" VARCHAR(120) NOT NULL UNIQUE,
  "name" VARCHAR(160) NOT NULL,
  "description" TEXT,
  "logo_url" TEXT,
  "cover_url" TEXT,
  "primary_color" VARCHAR(20),
  "status" "StoreStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3)
);

CREATE TABLE "categories" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "parent_id" UUID REFERENCES "categories"("id") ON DELETE SET NULL,
  "slug" VARCHAR(120) NOT NULL UNIQUE,
  "name" VARCHAR(120) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "products" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "vendors"("id") ON DELETE RESTRICT,
  "store_id" UUID NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
  "category_id" UUID REFERENCES "categories"("id") ON DELETE SET NULL,
  "sku" VARCHAR(80),
  "slug" VARCHAR(160) NOT NULL,
  "title" VARCHAR(220) NOT NULL,
  "description" TEXT,
  "price" DECIMAL(12,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'UYU',
  "stock" INTEGER NOT NULL DEFAULT 0,
  "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "products_stock_nonnegative" CHECK ("stock" >= 0),
  CONSTRAINT "products_price_nonnegative" CHECK ("price" >= 0),
  UNIQUE ("store_id","slug"),
  UNIQUE ("store_id","sku")
);

CREATE TABLE "product_images" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "product_id" UUID NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "url" TEXT NOT NULL,
  "alt" VARCHAR(220),
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "orders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "vendors"("id") ON DELETE RESTRICT,
  "store_id" UUID NOT NULL REFERENCES "stores"("id") ON DELETE RESTRICT,
  "buyer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "currency" VARCHAR(3) NOT NULL DEFAULT 'UYU',
  "subtotal" DECIMAL(12,2) NOT NULL,
  "shipping_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL,
  "shipping_address" JSONB,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "order_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "product_id" UUID REFERENCES "products"("id") ON DELETE SET NULL,
  "title" VARCHAR(220) NOT NULL,
  "sku" VARCHAR(80),
  "quantity" INTEGER NOT NULL,
  "unit_price" DECIMAL(12,2) NOT NULL,
  "total" DECIMAL(12,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_items_quantity_positive" CHECK ("quantity" > 0)
);

CREATE TABLE "payments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "order_id" UUID NOT NULL UNIQUE REFERENCES "orders"("id") ON DELETE CASCADE,
  "provider" "PaymentProvider" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "amount" DECIMAL(12,2) NOT NULL,
  "fee_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "mp_payment_id" VARCHAR(120) UNIQUE,
  "mp_preference_id" VARCHAR(120) UNIQUE,
  "external_reference" VARCHAR(180),
  "raw" JSONB,
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "oauth_tokens" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "vendors"("id") ON DELETE CASCADE,
  "provider" "OAuthProvider" NOT NULL DEFAULT 'MERCADO_PAGO',
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT,
  "scope" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "provider_user_id" VARCHAR(120),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("tenant_id","provider")
);

CREATE TABLE "commissions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "vendors"("id") ON DELETE RESTRICT,
  "order_id" UUID NOT NULL UNIQUE REFERENCES "orders"("id") ON DELETE CASCADE,
  "payment_id" UUID UNIQUE REFERENCES "payments"("id") ON DELETE SET NULL,
  "rate" DECIMAL(5,4) NOT NULL DEFAULT 0.08,
  "base_amount" DECIMAL(12,2) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "reviews" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "store_id" UUID NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
  "product_id" UUID NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "buyer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "order_item_id" UUID UNIQUE REFERENCES "order_items"("id") ON DELETE SET NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reviews_rating_range" CHECK ("rating" BETWEEN 1 AND 5)
);

CREATE TABLE "audit_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID REFERENCES "vendors"("id") ON DELETE SET NULL,
  "actor_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "action" VARCHAR(120) NOT NULL,
  "entity" VARCHAR(120) NOT NULL,
  "entity_id" VARCHAR(120),
  "ip" VARCHAR(64),
  "user_agent" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "vendors_status_kyc_idx" ON "vendors"("status","kyc_status");
CREATE INDEX "stores_tenant_status_idx" ON "stores"("tenant_id","status");
CREATE INDEX "categories_parent_active_sort_idx" ON "categories"("parent_id","is_active","sort_order");
CREATE INDEX "products_tenant_status_deleted_idx" ON "products"("tenant_id","status","deleted_at");
CREATE INDEX "products_category_status_idx" ON "products"("category_id","status");
CREATE INDEX "product_images_tenant_product_sort_idx" ON "product_images"("tenant_id","product_id","sort_order");
CREATE INDEX "orders_tenant_status_created_idx" ON "orders"("tenant_id","status","created_at");
CREATE INDEX "orders_buyer_created_idx" ON "orders"("buyer_id","created_at");
CREATE INDEX "payments_tenant_status_created_idx" ON "payments"("tenant_id","status","created_at");
CREATE INDEX "oauth_tokens_expires_idx" ON "oauth_tokens"("expires_at");
CREATE INDEX "commissions_tenant_status_created_idx" ON "commissions"("tenant_id","status","created_at");
CREATE INDEX "reviews_tenant_product_status_idx" ON "reviews"("tenant_id","product_id","status");
CREATE INDEX "audit_logs_tenant_created_idx" ON "audit_logs"("tenant_id","created_at");
