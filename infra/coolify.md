# Deploy en Coolify

## Servicios

Crear cuatro recursos en el mismo proyecto/red de Coolify:

1. **multiventas-api** — Dockerfile `apps/api/Dockerfile`, puerto 3001.
2. **multiventas-web** — Dockerfile `apps/web/Dockerfile`, puerto 3000.
3. **Redis 7** — persistente; usar su URL interna como `REDIS_URL`.
4. **MinIO/S3** — bucket `multiventas` y endpoint interno para API.

PostgreSQL ya es externo y está provisionado en `169.58.110.123:5432`.

## Variables API

Copiar las variables de `.env.example` a Coolify y completar los secretos. La contraseña real de PostgreSQL debe existir solo en Coolify.

Valores esenciales:

- `DATABASE_URL`
- `DIRECT_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `TOKEN_ENCRYPTION_KEY`
- `MP_CLIENT_ID`
- `MP_CLIENT_SECRET`
- `MP_REDIRECT_URI`
- `MP_WEBHOOK_SECRET`
- `MP_WEBHOOK_URL`
- `WEB_PUBLIC_URL`
- variables `S3_*`

Generar la clave de cifrado con `openssl rand -base64 32`.

## Variables Web

- `NEXT_PUBLIC_API_URL=https://api.tudominio.com/api`

Definirla también como build arg/env en el build del frontend.

## Migraciones

Antes de poner tráfico en producción:

```bash
pnpm --filter @multiventas/db prisma:generate
pnpm --filter @multiventas/db prisma migrate deploy
```

El seed es opcional y solo debe ejecutarse para staging/demo:

```bash
pnpm --filter @multiventas/db prisma db seed
```

## Healthcheck

API: `GET /api/health`.

## Mercado Pago

Configurar en la aplicación de Mercado Pago:

- Redirect URI exactamente igual a `MP_REDIRECT_URI`.
- Webhook de pagos apuntando a `MP_WEBHOOK_URL`.
- Copiar el secreto de Webhooks a `MP_WEBHOOK_SECRET`.
- Habilitar permisos de lectura, escritura y acceso offline para OAuth.

El marketplace no debe usar un access token global para cobrar ventas de terceros: cada preferencia se crea con el access token OAuth del vendedor.
