# Multiventas

Marketplace multi-vendedor, multi-tenant, orientado a Uruguay/Latinoamérica.

## Arquitectura

**Stack:** NestJS + TypeScript + Prisma + PostgreSQL + Redis/BullMQ + Next.js 14 App Router + Tailwind + shadcn/ui + S3/MinIO.

```text
[Browser / Next.js 14]
        |
        v
[NestJS API]
  |-- Auth/JWT + RBAC
  |-- Tenant ALS interceptor
  |-- Products / Stores / Orders
  |-- Mercado Pago OAuth + Split
  |-- Webhooks -> BullMQ/Redis
  |-- S3/MinIO signed uploads
        |
        +--------------------+
        |                    |
        v                    v
[PostgreSQL + RLS]      [Redis/BullMQ]
        |
        v
[Prisma]
        |
        +--> Mercado Pago API (OAuth + Checkout Pro Split 1:1)
        +--> Handy adapter (pasarela secundaria)
```

### Estrategia multi-tenant

El tenant raíz es `Vendor.id`. Las tablas sensibles llevan `tenant_id`. PostgreSQL RLS es la barrera final y el backend añade una segunda barrera con AsyncLocalStorage + Prisma middleware. Cada request corre dentro de una transacción Prisma que configura `app.tenant_id`, `app.role` y `app.public` mediante `set_config(..., true)`.

Las rutas públicas solo pueden leer tiendas/productos activos. Los vendedores solo acceden a filas de su tenant. Admin usa la política de rol `admin`.

### Split Mercado Pago

Se usa Split 1:1. El vendedor conecta su cuenta con OAuth. Checkout Pro recibe el access token del vendedor y `marketplace_fee` como monto, calculado como 8% del total de la orden. Un carrito puede contener varios vendedores; el backend lo agrupa y crea una orden + preferencia por vendedor.

## Monorepo

```text
apps/
  api/            NestJS
  web/            Next.js 14
packages/
  db/             Prisma schema, migraciones, seed y cliente
infra/
  docker-compose.local.yml
```

## Puesta en marcha

1. Instalar pnpm 9 y ejecutar `pnpm install`.
2. Copiar `.env.example` a `.env` y completar secretos.
3. `pnpm db:generate`.
4. Para desarrollo: `pnpm --filter @multiventas/db prisma migrate dev --name init`.
5. `pnpm db:seed`.
6. `pnpm dev`.

En producción/Coolify usa `prisma migrate deploy`, nunca `migrate dev`.

## Pooling

Para carga media puede usarse el pool de Prisma con `connection_limit`. Para alta concurrencia, coloca PgBouncer delante de PostgreSQL en modo transaction y usa una `DATABASE_URL` con `?pgbouncer=true&connection_limit=...`. Mantén `DIRECT_URL` apuntando directo a PostgreSQL para migraciones.

## Seguridad

- `.env` está ignorado.
- Tokens OAuth se cifran con AES-256-GCM.
- Refresh tokens de sesión se guardan hasheados.
- Webhooks MP validan HMAC.
- RLS se fuerza en tablas tenant.
- No hay custodia de fondos: Mercado Pago ejecuta el split en checkout.


## Dominio de producción

La URL pública canónica es `https://www.sevende.knjpro.site`.

En Coolify, `www.sevende.knjpro.site` debe apuntar al servicio `web`. El host `sevende.knjpro.site` se redirige permanentemente al dominio con `www`. El navegador usa el mismo origen para:
- `/api/*` -> proxy interno al servicio NestJS.
- `/media/*` -> proxy interno a MinIO.
- callbacks y webhooks de Mercado Pago.

La variable recomendada es:

```env
PUBLIC_ORIGIN=https://www.sevende.knjpro.site
```

No es necesario exponer dominios públicos separados para API o MinIO.
