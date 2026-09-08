/**
 * Экспорт собранного каталога в форматах для загрузки на бэкенд.
 *
 * Почему не только products.json: витрине достаточно десяти полей, а бэкенду
 * нужны все данные карточки — свойства, состав, SEO-поля, галерея, остатки,
 * отметки и путь раздела. Терять их при сборе нельзя: повторный обход сайта
 * на тысячах SKU — это ещё полчаса нагрузки на чужой сервер.
 *
 * Форматы:
 *   products.jsonl   по записи на строку — потоковая загрузка в БД, не требует
 *                    читать весь файл в память (на тысячах SKU это десятки МБ);
 *   products.json    тот же массив одним файлом — если загрузчик ждёт массив;
 *   products.csv     плоская таблица, разделитель «;» и BOM — открывается
 *                    в русском Excel и грузится в 1С/CRM без настройки;
 *   properties.csv   длинная таблица «товар → свойство → значение»: в CSV
 *                    свойства не теряются, даже если их у товара два десятка;
 *   categories.json  разделы и деревом, и плоским списком с путями и счётчиками;
 *   manifest.json    что именно собрано, чем и когда — для повторных загрузок.
 *
 * Зависимостей нет.
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Экранирование поля CSV по RFC 4180.
 * Кавычки удваиваются, поле с разделителем/переносом/кавычкой берётся в кавычки.
 */
export function csvEscape(value) {
  const s = value === null || value === undefined ? '' : String(value);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Русская версия Excel определяет UTF-8 только по BOM, иначе кириллица
 * превращается в «ÐšÐ°Ñ‚Ð°Ð»Ð¾Ð³». Разделитель — «;», потому что в русской
 * локали список разделителей по умолчанию именно точка с запятой.
 */
const BOM = '\uFEFF';

export function toCsv(rows, columns) {
  const head = columns.map((c) => csvEscape(c.header)).join(';');
  const body = rows.map((r) => columns.map((c) => csvEscape(c.get(r))).join(';'));
  return `${BOM}${[head, ...body].join('\r\n')}\r\n`;
}

/* ------------------------------------------------------------------ */
/* Полная запись товара                                                */
/* ------------------------------------------------------------------ */

/** «1000 мл» → { value: 1000, unit: 'мл' } — бэкенду удобнее хранить раздельно */
export function splitVolume(volume) {
  const s = String(volume ?? '').trim();
  if (!s) return { value: null, unit: '' };
  const m = s.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!m) return { value: null, unit: s };
  return { value: Number.parseFloat(m[1].replace(',', '.')), unit: m[2].trim() };
}

/**
 * Запись для бэкенда: всё, что удалось снять с карточки, плюс сырая нода
 * JSON-LD — чтобы данные, о которых парсер не знает, всё равно не потерялись.
 *
 * `sourceUrl` — естественный первичный ключ: он уникален и стабилен, в
 * отличие от id, который сайт может переназначить.
 */
export function toExportRecord(p, { base, scrapedAt }) {
  const { value: volumeValue, unit: volumeUnit } = splitVolume(p.volume);

  return {
    // --- идентификация ---
    sourceUrl: `${base}${p.url.endsWith('/') ? p.url : `${p.url}/`}`,
    sourcePath: p.url,
    slug: p.slug,
    externalId: p.externalId || p.sku || '',
    sku: p.sku || '',
    scrapedAt,

    // --- таксономия ---
    category: p.category,
    categoryPath: p.category ? p.category.split('/') : [],
    breadcrumbs: p.breadcrumbs ?? [],

    // --- основное ---
    name: p.name,
    brand: p.brand,
    line: p.line || '',
    price: p.price,
    oldPrice: p.oldPrice ?? null,
    currency: 'RUB',
    discountPercent:
      p.oldPrice && p.oldPrice > p.price
        ? Math.round((1 - p.price / p.oldPrice) * 100)
        : 0,

    // --- наличие и отметки ---
    inStock: p.inStock,
    stockText: p.stockText || '',
    availability: p.inStock ? 'InStock' : 'OutOfStock',
    hit: Boolean(p.hit),
    recommend: Boolean(p.recommend),
    sale: Boolean(p.sale),
    isNew: Boolean(p.isNew),
    preorder: Boolean(p.preorder),

    // --- характеристики ---
    volume: p.volume || '',
    volumeValue,
    volumeUnit,
    purpose: p.purpose ?? [],
    hairType: p.hairType ?? [],
    palette: p.palette ?? [],
    properties: p.properties ?? {},

    // --- контент ---
    descriptionHtml: p.descriptionHtml || '',
    descriptionText: p.descriptionText || '',
    applicationHtml: p.applicationHtml || '',
    applicationText: p.applicationText || '',
    metaTitle: p.metaTitle || '',
    metaDescription: p.metaDescription || '',
    canonical: p.canonical || '',
    pageTitle: p.pageTitle || '',
    h1: p.h1 || '',

    // --- медиа ---
    images: p.images ?? [],
    mainImage: p.images?.[0] ?? '',

    // --- социальное доказательство ---
    rating: p.rating ?? null,
    reviewsCount: p.reviewsCount ?? 0,

    // --- страховка: структурированные данные сайта как есть ---
    jsonLd: p.jsonLd ?? null,
  };
}

/** Колонки products.csv: плоское представление записи */
export const PRODUCT_COLUMNS = [
  { header: 'sourceUrl', get: (r) => r.sourceUrl },
  { header: 'sku', get: (r) => r.sku },
  { header: 'name', get: (r) => r.name },
  { header: 'brand', get: (r) => r.brand },
  { header: 'line', get: (r) => r.line },
  { header: 'category', get: (r) => r.category },
  { header: 'category_1', get: (r) => r.breadcrumbs[2] ?? r.categoryPath[0] ?? '' },
  { header: 'category_2', get: (r) => r.breadcrumbs[3] ?? r.categoryPath[1] ?? '' },
  { header: 'category_3', get: (r) => r.breadcrumbs[4] ?? r.categoryPath[2] ?? '' },
  { header: 'price', get: (r) => r.price },
  { header: 'oldPrice', get: (r) => r.oldPrice ?? '' },
  { header: 'currency', get: (r) => r.currency },
  { header: 'discountPercent', get: (r) => r.discountPercent },
  { header: 'inStock', get: (r) => (r.inStock ? 1 : 0) },
  { header: 'availability', get: (r) => r.availability },
  { header: 'hit', get: (r) => (r.hit ? 1 : 0) },
  { header: 'recommend', get: (r) => (r.recommend ? 1 : 0) },
  { header: 'sale', get: (r) => (r.sale ? 1 : 0) },
  { header: 'isNew', get: (r) => (r.isNew ? 1 : 0) },
  { header: 'preorder', get: (r) => (r.preorder ? 1 : 0) },
  { header: 'volume', get: (r) => r.volume },
  { header: 'volumeValue', get: (r) => r.volumeValue ?? '' },
  { header: 'volumeUnit', get: (r) => r.volumeUnit },
  { header: 'purpose', get: (r) => r.purpose.join(', ') },
  { header: 'hairType', get: (r) => r.hairType.join(', ') },
  { header: 'palette', get: (r) => r.palette.join(', ') },
  { header: 'mainImage', get: (r) => r.mainImage },
  { header: 'images', get: (r) => r.images.join(' | ') },
  { header: 'imagesCount', get: (r) => r.images.length },
  { header: 'rating', get: (r) => r.rating ?? '' },
  { header: 'reviewsCount', get: (r) => r.reviewsCount },
  { header: 'descriptionText', get: (r) => r.descriptionText },
  { header: 'applicationText', get: (r) => r.applicationText },
  { header: 'descriptionHtml', get: (r) => r.descriptionHtml },
  { header: 'metaTitle', get: (r) => r.metaTitle },
  { header: 'metaDescription', get: (r) => r.metaDescription },
  { header: 'scrapedAt', get: (r) => r.scrapedAt },
];

/** Колонки properties.csv — длинная таблица, по строке на свойство */
export const PROPERTY_COLUMNS = [
  { header: 'sku', get: (r) => r.sku },
  { header: 'sourceUrl', get: (r) => r.sourceUrl },
  { header: 'name', get: (r) => r.name },
  { header: 'property', get: (r) => r.property },
  { header: 'value', get: (r) => r.value },
];

/** Разворачивает свойства товаров в плоские строки для properties.csv */
export function flattenProperties(records) {
  const rows = [];
  for (const r of records) {
    for (const [property, value] of Object.entries(r.properties ?? {})) {
      rows.push({ sku: r.sku, sourceUrl: r.sourceUrl, name: r.name, property, value });
    }
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* Разделы: дерево + плоский список                                    */
/* ------------------------------------------------------------------ */

/**
 * Плоский список разделов: бэкенду обычно удобнее таблица с parent_id,
 * чем вложенное дерево. Считаем и количество товаров в каждом разделе.
 */
export function flattenCategories(tree, records) {
  const counts = new Map();
  for (const r of records) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);

  const flat = [];
  (function walk(nodes, parentPath, depth) {
    for (const n of nodes) {
      const path = parentPath ? `${parentPath}/${n.slug}` : n.slug;
      flat.push({
        slug: n.slug,
        name: n.name,
        path,
        parentPath,
        depth,
        url: `/catalog/${path}/`,
        productCount: counts.get(path) ?? 0,
        children: n.children?.length ?? 0,
      });
      if (n.children?.length) walk(n.children, path, depth + 1);
    }
  })(tree.roots ?? [], '', 1);
  return flat;
}

/**
 * Сливает собранное дерево разделов в categories.json витрины.
 *
 * Слияние — строго объединение, ничего не теряющее:
 *
 *  • дерево из парсера строится только по товарам, поэтому раздел без товаров
 *    в него не попадает. Замещать им существующее дерево значило бы вырезать
 *    из меню пустые разделы, посадочные и служебные ветки;
 *  • в categories.json живут иконки, shortName, title и count («N товаров
 *    на сайте»), которых парсер не знает. Они должны остаться;
 *  • порядок узлов витрины — кураторский, новые разделы добавляются в конец
 *    своего уровня, а не перемешивают меню.
 *
 * Совмещение по slug в пределах одного уровня: путь узла однозначно задаётся
 * цепочкой slug'ов, поэтому вложенность сохраняется автоматически.
 *
 * @returns { roots, stats: { added, kept, total } }
 */
export function mergeCategoryTrees(existing, scraped) {
  let added = 0;
  let kept = 0;

  function mergeLevel(existingNodes, scrapedNodes) {
    const scrapedBySlug = new Map((scrapedNodes ?? []).map((n) => [n.slug, n]));
    const out = [];

    // Сначала всё, что уже было в витрине, — в её порядке и с её полями
    for (const e of existingNodes ?? []) {
      kept++;
      const s = scrapedBySlug.get(e.slug);
      const node = { ...e };
      const kids = mergeLevel(e.children, s?.children);
      if (kids.length) node.children = kids;
      else delete node.children;
      out.push(node);
    }

    // Затем разделы, которых в витрине ещё нет
    for (const s of scrapedNodes ?? []) {
      if ((existingNodes ?? []).some((e) => e.slug === s.slug)) continue;
      added++;
      const node = { slug: s.slug, name: s.name };
      const kids = mergeLevel([], s.children);
      if (kids.length) node.children = kids;
      out.push(node);
    }

    return out;
  }

  const roots = mergeLevel(existing?.roots ?? [], scraped?.roots ?? []);
  const total = flattenCategories({ roots }, []).length;

  return { roots, stats: { added, kept, total } };
}

/* ------------------------------------------------------------------ */
/* Запись результатов                                                  */
/* ------------------------------------------------------------------ */

/**
 * Пишет все файлы экспорта.
 *
 * @param dir       каталог экспорта (обычно export/)
 * @param records   полные записи товаров
 * @param tree      дерево разделов
 * @param manifest  сведения о прогоне
 */
export function writeExport(dir, records, tree, manifest) {
  mkdirSync(dir, { recursive: true });

  const jsonl = `${records.map((r) => JSON.stringify(r)).join('\n')}${records.length ? '\n' : ''}`;
  writeFileSync(join(dir, 'products.jsonl'), jsonl, 'utf8');

  writeFileSync(join(dir, 'products.json'), `${JSON.stringify(records, null, 1)}\n`, 'utf8');

  writeFileSync(join(dir, 'products.csv'), toCsv(records, PRODUCT_COLUMNS), 'utf8');

  writeFileSync(
    join(dir, 'properties.csv'),
    toCsv(flattenProperties(records), PROPERTY_COLUMNS),
    'utf8',
  );

  writeFileSync(
    join(dir, 'categories.json'),
    `${JSON.stringify({ tree: tree.roots ?? [], flat: flattenCategories(tree, records) }, null, 2)}\n`,
    'utf8',
  );

  writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return [
    'products.jsonl',
    'products.json',
    'products.csv',
    'properties.csv',
    'categories.json',
    'manifest.json',
  ].map((f) => join(dir, f));
}

/**
 * Полный цикл выгрузки: пишет все файлы и собирает manifest.json.
 *
 * Манифест — не формальность. Загрузчик на бэкенде по нему понимает, что
 * именно приехало (сколько записей, какие колонки, где первичный ключ) и
 * какие записи неполные, — то есть может не угадывать и не падать молча.
 *
 * @returns манифест прогона
 */
export function writeExportBundle({
  dir,
  records,
  tree,
  scrapedAt,
  source,
  appProducts = null,
}) {
  mkdirSync(dir, { recursive: true });

  const flat = flattenCategories(tree, records);
  const propRows = flattenProperties(records);
  const uniqueProps = new Set(propRows.map((r) => r.property));

  // Неполные записи видны сразу: их список уходит в манифест, а не теряется
  // в тысячах строк JSONL.
  const warnings = [];
  for (const r of records) {
    const missing = [];
    if (!r.name) missing.push('name');
    if (!(r.price > 0)) missing.push('price');
    if (!r.images?.length) missing.push('images');
    if (!r.descriptionText) missing.push('description');
    if (!r.sku && !r.externalId) missing.push('sku');
    if (!r.category) missing.push('category');
    if (missing.length) warnings.push(`${r.sourcePath || r.slug}: нет ${missing.join(', ')}`);
  }

  const manifest = {
    generatedAt: scrapedAt,
    source,
    importFile: 'products.jsonl',
    primaryKey: 'sourceUrl',
    products: records.length,
    appProducts,
    stats: {
      withDescription: records.filter((r) => r.descriptionText).length,
      withApplication: records.filter((r) => r.applicationText).length,
      withImages: records.filter((r) => r.images?.length).length,
      withProperties: records.filter((r) => Object.keys(r.properties ?? {}).length).length,
      inStock: records.filter((r) => r.inStock).length,
      onSale: records.filter((r) => r.sale).length,
      propertyRows: propRows.length,
      uniqueProperties: uniqueProps.size,
      categoryNodes: flat.length,
    },
    columns: {
      products: PRODUCT_COLUMNS.map((c) => c.header),
      properties: PROPERTY_COLUMNS.map((c) => c.header),
    },
    incomplete: warnings,
    files: [],
  };

  const write = (name, text, rows = null) => {
    writeFileSync(join(dir, name), text, 'utf8');
    const bytes = Buffer.byteLength(text, 'utf8');
    manifest.files.push(rows === null ? { name, bytes } : { name, bytes, rows });
    return bytes;
  };

  write('products.jsonl', `${records.map((r) => JSON.stringify(r)).join('\n')}${records.length ? '\n' : ''}`, records.length);
  write('products.json', `${JSON.stringify(records, null, 1)}\n`, records.length);
  write('products.csv', toCsv(records, PRODUCT_COLUMNS), records.length);
  write('properties.csv', toCsv(propRows, PROPERTY_COLUMNS), propRows.length);
  write('categories.json', `${JSON.stringify({ tree: tree?.roots ?? [], flat }, null, 2)}\n`, flat.length);

  // Манифест описывает и себя. Размер файла зависит от самого числа байтов,
  // поэтому считаем в цикле до неподвижной точки: обычно хватает двух шагов.
  const selfEntry = { name: 'manifest.json', bytes: 0 };
  manifest.files.push(selfEntry);
  let manifestText = '';
  for (let i = 0; i < 5; i++) {
    manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
    const size = Buffer.byteLength(manifestText, 'utf8');
    if (size === selfEntry.bytes) break;
    selfEntry.bytes = size;
  }
  writeFileSync(join(dir, 'manifest.json'), manifestText, 'utf8');

  return manifest;
}

/**
 * Читает JSONL, пропуская повреждённые строки.
 *
 * При обрыве последняя строка может остаться недописанной — её нельзя
 * терять молча, но и ронять загрузку всего файла из-за неё нельзя.
 */
export function readJsonl(file) {
  if (!existsSync(file)) return { records: [], broken: 0 };
  const lines = readFileSync(file, 'utf8').split('\n');
  const records = [];
  let broken = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line));
    } catch {
      broken++;
    }
  }
  return { records, broken };
}
