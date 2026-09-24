import type { MetadataRoute } from 'next';
import { publicApi } from '@/lib/api';
import { ProductSearch, StoreSearch } from '@/lib/types';

export const dynamic = 'force-dynamic';

const siteUrl = 'https://www.sevende.knjpro.site';

type CategoryNode = {
  id: string;
  slug: string;
  name: string;
  updatedAt?: string;
  children?: CategoryNode[];
};

function flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((node) => [node, ...flattenCategories(node.children ?? [])]);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: 'daily', priority: 1 },
    { url: siteUrl + '/productos', changeFrequency: 'hourly', priority: 0.9 },
    { url: siteUrl + '/tiendas', changeFrequency: 'daily', priority: 0.8 },
  ];

  const categories = await publicApi<CategoryNode[]>('/categories').catch(() => []);
  for (const category of flattenCategories(categories)) {
    entries.push({
      url: siteUrl + '/categorias/' + encodeURIComponent(category.slug),
      lastModified: category.updatedAt ? new Date(category.updatedAt) : undefined,
      changeFrequency: 'daily',
      priority: 0.75,
    });
  }

  for (let page = 1; page <= 200; page += 1) {
    const response = await publicApi<ProductSearch>('/products?page=' + page + '&limit=50').catch(() => null);
    if (!response) break;

    for (const product of response.items) {
      entries.push({
        url: siteUrl + '/productos/' + product.id,
        lastModified: product.updatedAt ? new Date(product.updatedAt) : undefined,
        changeFrequency: 'daily',
        priority: 0.8,
      });
    }

    if (page * response.limit >= response.total || !response.items.length) break;
  }

  for (let page = 1; page <= 200; page += 1) {
    const response = await publicApi<StoreSearch>('/stores?page=' + page + '&limit=24').catch(() => null);
    if (!response) break;

    for (const store of response.items) {
      entries.push({
        url: siteUrl + '/tienda/' + encodeURIComponent(store.slug),
        changeFrequency: 'daily',
        priority: 0.8,
      });
    }

    if (page * response.limit >= response.total || !response.items.length) break;
  }

  return entries;
}
