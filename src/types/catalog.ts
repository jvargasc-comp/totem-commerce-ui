export type Category = {
  id: string;
  name: string;
  isActive: boolean;
};

export type Product = {
  id: string;
  sku?: string | null;
  name: string;
  description?: string | null;
  brand?: string | null;
  priceCents: number;
  isActive: boolean;
  categoryId?: string | null;
  images?: { id: string; url: string; sortOrder: number }[];
};
