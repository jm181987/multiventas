-- Publica datos legados creados antes de que el flujo de aprobación
-- activara automáticamente la tienda y antes del gestor de productos.
--
-- Es un backfill de una sola vez: solo afecta filas existentes al aplicar
-- esta migración. Los productos creados después seguirán naciendo DRAFT.

UPDATE "stores" AS s
SET
  "status" = 'ACTIVE',
  "updated_at" = CURRENT_TIMESTAMP
FROM "vendors" AS v
WHERE
  s."tenant_id" = v."id"
  AND v."status" = 'APPROVED'
  AND v."deleted_at" IS NULL
  AND s."deleted_at" IS NULL
  AND s."status" = 'DRAFT';

UPDATE "products" AS p
SET
  "status" = 'ACTIVE',
  "updated_at" = CURRENT_TIMESTAMP
FROM "stores" AS s
JOIN "vendors" AS v ON v."id" = s."tenant_id"
WHERE
  p."store_id" = s."id"
  AND p."tenant_id" = v."id"
  AND v."status" = 'APPROVED'
  AND v."deleted_at" IS NULL
  AND s."status" = 'ACTIVE'
  AND s."deleted_at" IS NULL
  AND p."deleted_at" IS NULL
  AND p."status" = 'DRAFT';
