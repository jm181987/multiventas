import { PrismaClient, ProductStatus, StoreStatus, UserRole, VendorStatus, KycStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMeNow123!', 12);
  const vendorPassword = await bcrypt.hash(process.env.SEED_VENDOR_PASSWORD ?? 'ChangeMeNow123!', 12);

  await prisma.user.upsert({
    where: { email: 'admin@multiventas.local' },
    update: {},
    create: {
      email: 'admin@multiventas.local',
      name: 'Admin Multiventas',
      passwordHash: adminPassword,
      roles: [UserRole.ADMIN, UserRole.BUYER],
    },
  });

  const categories = await Promise.all([
    ['tecnologia', 'Tecnología'],
    ['hogar', 'Hogar'],
    ['moda', 'Moda'],
  ].map(([slug, name], sortOrder) =>
    prisma.category.upsert({
      where: { slug },
      update: { name },
      create: { slug, name, sortOrder },
    }),
  ));

  for (let v = 1; v <= 2; v++) {
    const email = `vendedor${v}@multiventas.local`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: `Vendedor ${v}`,
        passwordHash: vendorPassword,
        roles: [UserRole.VENDOR, UserRole.BUYER],
      },
    });

    const vendor = await prisma.vendor.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        businessName: `Tienda Demo ${v}`,
        status: VendorStatus.APPROVED,
        kycStatus: KycStatus.VERIFIED,
        approvedAt: new Date(),
      },
    });

    const store = await prisma.store.upsert({
      where: { slug: `tienda-demo-${v}` },
      update: {},
      create: {
        tenantId: vendor.id,
        slug: `tienda-demo-${v}`,
        name: `Tienda Demo ${v}`,
        description: 'Tienda de demostración para Multiventas',
        status: StoreStatus.ACTIVE,
        primaryColor: v === 1 ? '#111827' : '#0f766e',
      },
    });

    for (let p = 1; p <= 5; p++) {
      const sku = `V${v}-P${p}`;
      const slug = `producto-${v}-${p}`;
      const exists = await prisma.product.findFirst({ where: { storeId: store.id, sku } });
      if (!exists) {
        await prisma.product.create({
          data: {
            tenantId: vendor.id,
            storeId: store.id,
            categoryId: categories[(p - 1) % categories.length].id,
            sku,
            slug,
            title: `Producto demo ${v}-${p}`,
            description: 'Producto de prueba para validar catálogo, carrito y checkout.',
            price: 490 + p * 125 + v * 25,
            stock: 20 + p,
            status: ProductStatus.ACTIVE,
            images: {
              create: [{
                tenantId: vendor.id,
                url: `https://picsum.photos/seed/${slug}/900/900`,
                alt: `Producto demo ${v}-${p}`,
              }],
            },
          },
        });
      }
    }
  }
}

main()
  .then(() => console.log('Seed completado'))
  .finally(async () => prisma.$disconnect());
