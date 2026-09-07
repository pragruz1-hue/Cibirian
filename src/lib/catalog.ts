import categoriesJson from '@/data/categories.json';
import productsJson from '@/data/products.json';
import siteJson from '@/data/site.json';
import type { Category, FilterState, Product, SortOption } from './types';
import { seededShows } from './format';

export const site = siteJson;
export const sortOptions = siteJson.sortOptions as SortOption[];

/* ------------------------------------------------------------------ */
/* Дерево разделов                                                     */
/* ------------------------------------------------------------------ */

export interface CategoryNode extends Category {
  path: string;
  parentPath: string | null;
  depth: number;
}

const flat = new Map<string, CategoryNode>();

function walk(nodes: Category[], parentPath: string | null, depth: number) {
  for (const node of nodes) {
    const path = parentPath ? `${parentPath}/${node.slug}` : node.slug;
    flat.set(path, { ...node, path, parentPath, depth });
    if (node.children?.length) walk(node.children, path, depth + 1);
  }
}
walk(categoriesJson.roots as Category[], null, 0);

export const rootCategories = (categoriesJson.roots as Category[]).map(
  (r) => flat.get(r.slug)!,
);

export function allCategories(): CategoryNode[] {
  return [...flat.values()];
}

export function getCategory(path: string): CategoryNode | undefined {
  return flat.get(path.replace(/^\/+|\/+$/g, ''));
}

export function childCategories(path: string): CategoryNode[] {
  const node = getCategory(path);
  if (!node?.children?.length) return [];
  return node.children
    .map((c) => flat.get(`${path}/${c.slug}`))
    .filter((c): c is CategoryNode => Boolean(c));
}

/** Все пути разделов-потомков (включая сам раздел) */
export function descendantPaths(path: string): string[] {
  const out = [path];
  const node = getCategory(path);
  if (node?.children?.length) {
    for (const child of node.children) out.push(...descendantPaths(`${path}/${child.slug}`));
  }
  return out;
}

export function categoryProducts(path: string): Product[] {
  const paths = new Set(descendantPaths(path));
  return products.filter((p) => paths.has(p.category));
}

/* ------------------------------------------------------------------ */
/* Товары                                                              */
/* ------------------------------------------------------------------ */

export const products = productsJson as Product[];

const bySlug = new Map<string, Product>();
for (const p of products) bySlug.set(p.slug, p);

export function productUrl(p: Product): string {
  return `/catalog/${p.category}/${p.slug}`;
}

export function categoryUrl(path: string): string {
  return path ? `/catalog/${path}` : '/catalog';
}

export function getProduct(slug: string): Product | undefined {
  return bySlug.get(slug);
}

/** Товары раздела + похожие из того же родительского раздела */
export function relatedProducts(p: Product, limit = 8): Product[] {
  const parent = p.category.split('/').slice(0, -1).join('/');
  const pool = parent ? categoryProducts(parent) : products;
  const sameBrand = pool.filter((x) => x.id !== p.id && x.brand === p.brand);
  const rest = pool.filter((x) => x.id !== p.id && x.brand !== p.brand);
  return [...sameBrand, ...rest].slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Хлебные крошки                                                      */
/* ------------------------------------------------------------------ */

export interface Crumb {
  label: string;
  href: string;
}

export function categoryBreadcrumbs(path: string): Crumb[] {
  const crumbs: Crumb[] = [{ label: 'Главная', href: '/' }, { label: 'Каталог', href: '/catalog' }];
  const segments = path.split('/').filter(Boolean);
  let acc = '';
  for (const seg of segments) {
    acc = acc ? `${acc}/${seg}` : seg;
    const node = flat.get(acc);
    if (node) crumbs.push({ label: node.name, href: `/catalog/${acc}` });
  }
  return crumbs;
}

export function productBreadcrumbs(p: Product): Crumb[] {
  return [...categoryBreadcrumbs(p.category), { label: p.name, href: productUrl(p) }];
}

/* ------------------------------------------------------------------ */
/* Фильтры, сортировка, фасеты                                         */
/* ------------------------------------------------------------------ */

const normalize = (s: string) => s.toLowerCase().replace(/ё/g, 'е').trim();

export function matchesQuery(p: Product, q: string): boolean {
  if (!q) return true;
  const needle = normalize(q);
  const hay = normalize(
    [p.name, p.brand, p.line ?? '', p.volume ?? '', ...(p.purpose ?? [])].join(' '),
  );
  return needle.split(/\s+/).every((token) => hay.includes(token));
}

export function applyFilters(list: Product[], f: FilterState): Product[] {
  let out = list.filter((p) => {
    if (!matchesQuery(p, f.q)) return false;
    if (f.brands.length && !f.brands.includes(p.brand)) return false;
    if (f.volumes.length && !f.volumes.includes(p.volume ?? '')) return false;
    if (f.purposes.length && !(p.purpose ?? []).some((x) => f.purposes.includes(x))) return false;
    if (f.hairTypes.length && !(p.hairType ?? []).some((x) => f.hairTypes.includes(x))) return false;
    if (f.inStockOnly && !p.inStock) return false;
    if (f.hit && !p.hit) return false;
    if (f.sale && !(p.sale || p.oldPrice)) return false;
    if (f.recommend && !p.recommend) return false;
    if (f.isNew && !p.isNew) return false;
    if (f.priceFrom !== null && p.price < f.priceFrom) return false;
    if (f.priceTo !== null && p.price > f.priceTo) return false;
    return true;
  });
  out = sortProducts(out, f.sort);
  return out;
}

export function sortProducts(list: Product[], sort: string): Product[] {
  const arr = [...list];
  const popularity = (p: Product) =>
    (p.hit ? 100 : 0) + (p.recommend ? 60 : 0) + (p.isNew ? 45 : 0) + (p.sale ? 30 : 0) + seededShows(p.id) / 100;
  switch (sort) {
    case 'name_asc':
      return arr.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    case 'name_desc':
      return arr.sort((a, b) => b.name.localeCompare(a.name, 'ru'));
    case 'price_asc':
      return arr.sort((a, b) => a.price - b.price);
    case 'price_desc':
      return arr.sort((a, b) => b.price - a.price);
    case 'available_asc':
      return arr.sort((a, b) => Number(a.inStock) - Number(b.inStock));
    case 'available_desc':
      return arr.sort((a, b) => Number(b.inStock) - Number(a.inStock));
    case 'shows_asc':
      return arr.sort((a, b) => popularity(a) - popularity(b));
    case 'popular':
    default:
      return arr.sort((a, b) => popularity(b) - popularity(a));
  }
}

export interface Facets {
  brands: { value: string; count: number }[];
  volumes: { value: string; count: number }[];
  purposes: { value: string; count: number }[];
  hairTypes: { value: string; count: number }[];
  priceMin: number;
  priceMax: number;
  counts: { hit: number; sale: number; recommend: number; isNew: number; inStock: number };
}

function tally(list: Product[], pick: (p: Product) => string[]): { value: string; count: number }[] {
  const map = new Map<string, number>();
  for (const p of list) for (const v of pick(p)) map.set(v, (map.get(v) ?? 0) + 1);
  return [...map.entries()]
    .filter(([v]) => Boolean(v))
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'ru'));
}

export function buildFacets(list: Product[]): Facets {
  const prices = list.map((p) => p.price);
  return {
    brands: tally(list, (p) => [p.brand]),
    volumes: tally(list, (p) => [p.volume ?? '']),
    purposes: tally(list, (p) => p.purpose ?? []),
    hairTypes: tally(list, (p) => p.hairType ?? []),
    priceMin: prices.length ? Math.min(...prices) : 0,
    priceMax: prices.length ? Math.max(...prices) : 0,
    counts: {
      hit: list.filter((p) => p.hit).length,
      sale: list.filter((p) => p.sale || p.oldPrice).length,
      recommend: list.filter((p) => p.recommend).length,
      isNew: list.filter((p) => p.isNew).length,
      inStock: list.filter((p) => p.inStock).length,
    },
  };
}

export function paginate<T>(list: T[], page: number, perPage: number): { items: T[]; pages: number; total: number } {
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const safe = Math.min(Math.max(1, page), pages);
  return { items: list.slice((safe - 1) * perPage, safe * perPage), pages, total };
}

/* ------------------------------------------------------------------ */
/* Подборки для главной                                                */
/* ------------------------------------------------------------------ */

export const PER_PAGE = 12;

export function bestOffers(limit = 10): Product[] {
  return sortProducts(
    products.filter((p) => p.hit || p.sale || p.recommend),
    'popular',
  ).slice(0, limit);
}

export function hitsProducts(limit = 10): Product[] {
  return sortProducts(products.filter((p) => p.hit), 'popular').slice(0, limit);
}

export function saleProducts(limit = 10): Product[] {
  return sortProducts(products.filter((p) => p.sale || p.oldPrice), 'price_asc').slice(0, limit);
}

export function newProducts(limit = 10): Product[] {
  return sortProducts(products.filter((p) => p.isNew), 'popular').slice(0, limit);
}

export function searchProducts(q: string, limit = 60): Product[] {
  if (!q.trim()) return [];
  return sortProducts(products.filter((p) => matchesQuery(p, q)), 'popular').slice(0, limit);
}

export function activeFiltersCount(f: FilterState): number {
  return (
    f.brands.length +
    f.volumes.length +
    f.purposes.length +
    f.hairTypes.length +
    (f.inStockOnly ? 1 : 0) +
    (f.hit ? 1 : 0) +
    (f.sale ? 1 : 0) +
    (f.recommend ? 1 : 0) +
    (f.isNew ? 1 : 0) +
    (f.priceFrom !== null ? 1 : 0) +
    (f.priceTo !== null ? 1 : 0) +
    (f.q ? 1 : 0)
  );
}
