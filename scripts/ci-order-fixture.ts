import { OrderStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const buyerId = process.env.BUYER_ID!;
  const tenantId = process.env.TENANT_ID!;
  const storeId = process.env.STORE_ID!;
  const productId = process.env.PRODUCT_ID!;
  const quantity = Number(process.env.ORDER_QUANTITY ?? '1');
  const status = (process.env.ORDER_STATUS ?? 'PENDING') as OrderStatus;

  const order = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUniqueOrThrow({ where: { id: productId } });
    if (product.stock < quantity) throw new Error('fixture stock insufficient');

    const total = Number(product.price) * quantity;
    const created = await tx.order.create({
      data: {
        tenantId,
        storeId,
        buyerId,
        status,
        currency: product.currency,
        subtotal: total,
        total,
        shippingAddress: { address: 'Av. CI 1234', city: 'Montevideo', country: 'Uruguay' },
        notes: 'Pedido de prueba CI',
        items: {
          create: [{
            tenantId,
            productId,
            title: product.title,
            sku: product.sku,
            quantity,
            unitPrice: product.price,
            total,
          }],
        },
      },
    });

    await tx.product.update({
      where: { id: productId },
      data: { stock: { decrement: quantity } },
    });

    return created;
  });

  process.stdout.write(order.id);
}

main().finally(async () => prisma.$disconnect());
