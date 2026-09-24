import type { Metadata } from 'next';
import { publicApi } from '@/lib/api';
import { ProductSearch } from '@/lib/types';
import { ProductGrid } from '@/components/ProductGrid';

export const dynamic = 'force-dynamic';

const siteUrl = 'https://www.sevende.knjpro.site';

type CategoryNode = {
  id: string;
  slug: string;
  name: string;
  children?: CategoryNode[];
};

function findCategory(nodes: CategoryNode[], slug: string): CategoryNode | undefined {
  for (const node of nodes) {
    if (node.slug === slug) return node;
    const child = findCategory(node.children ?? [], slug);
    if (child) return child;
  }
  return undefined;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const categories = await publicApi<CategoryNode[]>('/categories').catch(() => []);
  const category = findCategory(categories, params.slug);
  const name = category?.name || params.slug.replace(/-/g, ' ');
  const description = `Explorá productos de ${name} en SeVende, con múltiples tiendas y vendedores independientes.`;

  return {
    title: name,
    description,
    alternates: { canonical: `/categorias/${params.slug}` },
    openGraph: {
      type: 'website',
      url: `/categorias/${params.slug}`,
      title: `${name} | SeVende`,
      description,
    },
  };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const [data, categories] = await Promise.all([
    publicApi<ProductSearch>(`/products?category=${encodeURIComponent(params.slug)}`)
      .catch(() => ({ items: [], total: 0, page: 1, limit: 24 })),
    publicApi<CategoryNode[]>('/categories').catch(() => []),
  ]);

  const category = findCategory(categories, params.slug);
  const name = category?.name || params.slug.replace(/-/g, ' ');
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${name} en SeVende`,
    url: `${siteUrl}/categorias/${params.slug}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: data.total,
      itemListElement: data.items.slice(0, 24).map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${siteUrl}/productos/${product.id}`,
        name: product.title,
      })),
    },
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
      />
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Categoría</p>
        <h1 className="text-4xl font-black">{name}</h1>
        <p className="mt-2 text-muted-foreground">{data.total} productos disponibles</p>
      </div>
      <ProductGrid products={data.items} />
    </main>
  );
}
