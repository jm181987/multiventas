# Deploy de Multiventas en Coolify

La opción recomendada es **un recurso Docker Compose desde Git**. Coolify construye API y Web desde sus Dockerfiles y mantiene Redis + MinIO en la misma red privada.

## 1. Crear el recurso

En Coolify:

1. Project → Environment → **+ New**.
2. Elegir **Git Repository**.
3. Repositorio: `https://github.com/jm181987/multiventas`.
4. Branch: `main`.
5. Build Pack: **Docker Compose**.
6. Base Directory: `/`.
7. Docker Compose Location: `/docker-compose.coolify.yml`.
8. Guardar.

Coolify detectará los servicios `web`, `api`, `redis` y `minio`.

## 2. Dominios

Configurar dominios públicos solo para:

- `web` → puerto interno **3000**
- `api` → puerto interno **3001**
- `minio` → puerto interno **9000** si se usarán imágenes públicas desde MinIO

No publicar Redis.

Ejemplo de dominios:

- Web: `https://ventas.tudominio.com`
- API: `https://api-ventas.tudominio.com`
- Media: `https://media-ventas.tudominio.com`

## 3. Variables requeridas

Pegarlas en **Environment Variables → Developer view**. Sustituir todos los placeholders:

```env
DATABASE_URL=postgresql://knj_ventas_multi_store_ventas_usr:REEMPLAZAR_PASSWORD@169.58.110.123:5432/knj_ventas_multi_store_ventas?connection_limit=10&pool_timeout=20
DIRECT_URL=postgresql://knj_ventas_multi_store_ventas_usr:REEMPLAZAR_PASSWORD@169.58.110.123:5432/knj_ventas_multi_store_ventas

JWT_ACCESS_SECRET=REEMPLAZAR_32_PLUS_CHARS
JWT_REFRESH_SECRET=REEMPLAZAR_32_PLUS_CHARS
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
TOKEN_ENCRYPTION_KEY=REEMPLAZAR_BASE64_32_BYTES

MP_CLIENT_ID=REEMPLAZAR
MP_CLIENT_SECRET=REEMPLAZAR
MP_REDIRECT_URI=https://api-ventas.tudominio.com/api/payments/mercadopago/callback
MP_WEBHOOK_SECRET=REEMPLAZAR
MP_WEBHOOK_URL=https://api-ventas.tudominio.com/api/webhooks/mercadopago
MP_MARKETPLACE_FEE_RATE=0.08

WEB_PUBLIC_URL=https://ventas.tudominio.com
API_PUBLIC_URL=https://api-ventas.tudominio.com
NEXT_PUBLIC_API_URL=https://api-ventas.tudominio.com/api

MINIO_ROOT_USER=REEMPLAZAR
MINIO_ROOT_PASSWORD=REEMPLAZAR_PASSWORD_LARGA
S3_REGION=us-east-1
S3_BUCKET=multiventas
S3_PUBLIC_URL=https://media-ventas.tudominio.com
```

Generar secretos fuertes fuera del repositorio:

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -base64 32
openssl rand -hex 24
openssl rand -hex 32
```

## 4. Base de datos y migraciones

El contenedor API ejecuta automáticamente:

```bash
pnpm --dir /app/packages/db prisma:deploy
```

antes de iniciar NestJS. Por tanto, las migraciones de `packages/db/prisma/migrations` se aplican en cada despliegue de manera idempotente mediante `prisma migrate deploy`.

**No ejecutar `prisma migrate dev` en producción.**

## 5. Primer despliegue

Pulsar **Deploy**.

Orden esperado:

1. Redis inicia y pasa healthcheck.
2. MinIO inicia.
3. API construye, aplica migraciones y escucha en `0.0.0.0:3001`.
4. API pasa `GET /api/health`.
5. Web inicia en 3000.

Verificar:

- `https://api-ventas.tudominio.com/api/health`
- `https://ventas.tudominio.com`

## 6. Mercado Pago

En la aplicación de Mercado Pago usar exactamente:

- Redirect URI = valor de `MP_REDIRECT_URI`
- Webhook = valor de `MP_WEBHOOK_URL`
- Copiar el secreto HMAC a `MP_WEBHOOK_SECRET`

Los vendedores conectan sus propias cuentas desde:

`/vendor/mercadopago`

## 7. Seed

No se ejecuta automáticamente en producción. Si querés datos demo, ejecutarlo una sola vez desde una terminal del contenedor API:

```bash
pnpm --dir /app/packages/db prisma:seed
```

Para producción real, crear el primer admin mediante un mecanismo administrativo seguro en vez de conservar credenciales demo.

## 8. Persistencia

El Compose declara:

- `redis_data`
- `minio_data`

Coolify administra esos volúmenes persistentes. PostgreSQL permanece externo en el servidor ya provisionado.
