import { apiGet } from './http';
import type { Category, Product } from '../types/catalog';

export function getCategories() {
  return apiGet<Category[]>('/catalog/categories');
}

export function getProducts(params?: { categoryId?: string; q?: string }) {
  const q = new URLSearchParams();
  if (params?.categoryId) q.set('categoryId', params.categoryId);
  if (params?.q) q.set('q', params.q);
  const suffix = q.toString() ? `?${q.toString()}` : '';
  return apiGet<Product[]>(`/catalog/products${suffix}`);
}
