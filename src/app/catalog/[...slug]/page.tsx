import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CategoryView from '@/components/CategoryView';
import ProductView from '@/components/ProductView';
import {
  allCategories,
  products,
  getCategory,

  categoryProducts,
} from '@/lib/catalog';

interface Params {
  slug: string[];
}

export function generateStaticParams(): Params[] {
  const out: Params[] = [];
  for (const c of allCategories()) out.push({ slug: c.path.split('/') });
  for (const p of products) out.push({ slug: [...p.category.split('/'), p.slug] });
  return out;
}

function resolve(segments: string[]) {
  const path = segments.join('/');
  const parentPath = segments.slice(0, -1).join('/');
  const last = segments[segments.length - 1];

  const product = products.find((p) => p.slug === last && p.category === parentPath);
  if (product) return { kind: 'product' as const, product };

  const category = getCategory(path);
  if (category) return { kind: 'category' as const, category };

  return null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const found = resolve(slug);
  if (!found) return { title: 'Страница не найдена' };

  if (found.kind === 'product') {
    const p = found.product;
    const price = p.price.toLocaleString('ru-RU').replace(/,/g, ' ');
    return {
      title: `${p.name} — купить за ${price} руб`,
      description: `${p.name}. Бренд ${p.brand}${p.line ? `, линейка ${p.line}` : ''}${
        p.volume ? `, объём ${p.volume}` : ''
      }. Цена ${price} руб. ${p.inStock ? 'Есть в наличии' : 'Под заказ'}. Доставка по России.`,
      openGraph: {
        title: p.name,
        description: `${p.brand} — ${price} руб. ${p.inStock ? 'В наличии' : 'Под заказ'}.`,
        images: p.images.slice(0, 1).map((src) => ({ url: src })),
        type: 'website',
      },
    };
  }

  const c = found.category;
  const count = categoryProducts(c.path).length;
  return {
    title: c.title ?? `${c.name} купить с доставкой`,
    description: `${c.name}${count ? ` — ${count} товаров` : ''} в каталоге «Сибирский цирюльник». Фильтры по бренду, назначению и объёму, доставка по России.`,
  };
}

export default async function CatalogCatchAll({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  if (!slug?.length) return notFound();

  const found = resolve(slug);
  if (!found) return notFound();

  if (found.kind === 'product') {
    return <ProductView product={found.product} />;
  }
  return <CategoryView category={found.category} />;
}
