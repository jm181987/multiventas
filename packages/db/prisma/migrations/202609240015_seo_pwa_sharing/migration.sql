ALTER TABLE "product_analytics_daily"
  ADD COLUMN "shares" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "shared_visits" INTEGER NOT NULL DEFAULT 0;
