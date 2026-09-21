export type Store = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  logoUrl?: string;
  coverUrl?: string;
  primaryColor?: string;
};

export type ProductImage = { id: string; url: string; alt?: string };

export type Product = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  price: string | number;
  currency: string;
  stock: number;
  images: ProductImage[];
  store: Store;
  category?: { id: string; slug: string; name: string };
};

export type ProductSearch = {
  items: Product[];
  total: number;
  page: number;
  limit: number;
};
