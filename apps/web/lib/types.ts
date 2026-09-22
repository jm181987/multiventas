export type Store = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  primaryColor?: string | null;
  status?: 'DRAFT' | 'ACTIVE' | 'SUSPENDED';
};

export type ProductImage = { id: string; url: string; alt?: string; sortOrder?: number };

export type Product = {
  id: string;
  storeId?: string;
  categoryId?: string;
  sku?: string;
  slug: string;
  title: string;
  description?: string;
  price: string | number;
  currency: string;
  stock: number;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  images: ProductImage[];
  store: Store;
  category?: { id: string; slug: string; name: string };
  createdAt?: string;
  updatedAt?: string;
};

export type ProductSearch = {
  items: Product[];
  total: number;
  page: number;
  limit: number;
};


export type StoreSearch = {
  items: Array<Store & {
    productCount: number;
    vendor?: { businessName?: string | null };
    products?: Array<{
      id: string;
      title: string;
      images?: Array<{ id?: string; url: string; alt?: string | null }>;
    }>;
  }>;
  total: number;
  page: number;
  limit: number;
};
