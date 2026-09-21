#!/bin/sh
set -u

(
  attempt=1
  while [ "$attempt" -le 12 ]; do
    echo "[db-migrate] Prisma migrate deploy - intento $attempt/12"
    if pnpm --dir /app/packages/db prisma:deploy; then
      echo "[db-migrate] Migraciones aplicadas correctamente"
      exit 0
    fi
    attempt=$((attempt + 1))
    sleep 5
  done

  echo "[db-migrate] ADVERTENCIA: no se pudieron aplicar las migraciones; el API seguirá ejecutándose"
) &

exec node dist/main.js
