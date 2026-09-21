# Mercado Pago Split 1:1

## Flujo

1. El vendedor abre `GET /api/payments/mercadopago/connect`.
2. API genera el authorization URL con `state` firmado.
3. Mercado Pago vuelve a `MP_REDIRECT_URI` con `code`.
4. API intercambia el code por access/refresh token.
5. Tokens se cifran AES-256-GCM antes de persistir.
6. Checkout agrupa el carrito por tienda/vendedor.
7. Para cada orden crea una preferencia con el access token del vendedor.
8. `marketplace_fee` = `round(total * 0.08, 2)`.
9. Webhook valida `x-signature` y `x-request-id`, luego entra a BullMQ.
10. Worker consulta el pago real en Mercado Pago y actualiza orden/pago/comisión.

## Variables

Nunca incluir credenciales en código. Usar exclusivamente variables de entorno listadas en `.env.example`.
