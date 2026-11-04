import 'server-only';
import { cache } from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { categories as demoCategories, products as demoProducts } from './demo';
import { Category, Product } from './types';

export const getCatalogue = cache(async (): Promise<{ products: Product[]; categories: Category[]; demo: boolean }> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { products: demoProducts, categories: demoCategories, demo: true };
  const cookieStore = await cookies();
  const client = createServerClient(url, key, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => { /* Public read-only catalogue does not change auth cookies. */ } } });
  const [productResult, categoryResult] = await Promise.all([
    client.from('products').select('id,slug,name,description,price,stock,imageUrl,categoryId,featured').order('createdAt'),
    client.from('categories').select('id,name,slug').order('name'),
  ]);
  if (productResult.error || categoryResult.error) throw new Error('The catalogue could not be loaded. Please try again shortly.');
  return { products: productResult.data as Product[], categories: categoryResult.data as Category[], demo: false };
});
