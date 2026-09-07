import type { MetadataRoute } from 'next';
import { allCategories, products, productUrl } from '@/lib/catalog';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

const staticPages = [
  '',
  '/catalog',
  '/sales',
  '/brands',
  '/search',
  '/contacts',
  '/services',
  '/company',
  '/company/reviews',
  '/company/licenses',
  '/company/docs',
  '/info/requisites',
  '/blog',
  '/landings',
  '/personal',
  '/personal/favorite',
  '/basket',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const stat = staticPages.map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: p === '' ? 1 : p === '/catalog' ? 0.9 : 0.6,
  }));

  const cats = allCategories().map((c) => ({
    url: `${SITE_URL}/catalog/${c.path}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  const prods = products.map((p) => ({
    url: `${SITE_URL}${productUrl(p)}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...stat, ...cats, ...prods];
}
