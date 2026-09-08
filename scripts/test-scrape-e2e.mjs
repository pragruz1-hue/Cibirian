#!/usr/bin/env node
/**
 * Сквозная проверка парсера каталога без выхода в интернет.
 *
 *   npm run test:scrape
 *
 * Поднимает локальную копию структуры сайта (scripts/fixture-site.mjs),
 * прогоняет против неё scripts/scrape-catalog.mjs как обычный пользователь
 * и проверяет весь путь: robots.txt → sitemap → классификация URL → очередь
 * запросов → разбор карточек → products.json и categories.scraped.json.
 *
 * Отдельно проверяется детерминизм: парсер запрашивает страницы параллельно,
 * поэтому порядок ответов зависит от тайминга. Второй прогон обязан дать
 * побайтово тот же результат — иначе id товаров будут плясать, а к id привязаны
 * рейтинг, счётчик просмотров и корзина, сохранённая в браузере покупателя.
 *
 * Имеет смысл запустить перед реальным прогоном: он проверяет то, что
 * test-parser.mjs не покрывает (сеть, очередь, запись файлов).
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFixtureSite, fixtureStats } from './fixture-site.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRAPER = join(HERE, 'scrape-catalog.mjs');

let pass = 0;
let fail = 0;

function chk(name, got, want) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) {
    pass++;
    console.log(`  ✓ ${name}: ${g.length > 70 ? `${g.slice(0, 67)}…` : g}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}\n      получено: ${g}\n      ожидалось: ${w}`);
  }
}

const section = (t) => console.log(`\n=== ${t} ===`);

/* ------------------------------------------------------------------ */

const server = createFixtureSite();
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
console.log(`→ сайт-фикстура: ${base}`);
console.log(`  разделов ${fixtureStats.sections}, товаров ${fixtureStats.products}, мусорных листьев ${fixtureStats.junk}`);

const work = mkdtempSync(join(tmpdir(), 'scrape-e2e-'));

/**
 * Запуск парсера отдельным процессом.
 *
 * Именно spawn, а не spawnSync: сервер-фикстура живёт в этом же процессе,
 * и синхронный вызов остановил бы event loop — парсер дождался бы таймаута,
 * так и не получив ни одного ответа.
 */
function runScraper(args, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`парсер не завершился за ${timeoutMs / 1000} с\n${stdout}${stderr}`));
    }, timeoutMs);
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
  });
}

async function runScrape(tag) {
  const out = join(work, `out-${tag}`);
  const cache = join(work, `cache-${tag}`);
  // Каталог выгрузки задаём явно: по умолчанию это export/ в корне репозитория,
  // и тест не должен оставлять свои файлы в рабочем дереве.
  const exportDir = join(work, `export-${tag}`);
  const res = await runScraper([
    SCRAPER, '--base', base, '--delay', '0', '--out', out, '--cache', cache,
    '--export', exportDir, '--no-update-categories', '--quiet',
  ]);
  if (res.code !== 0) {
    console.error(res.stdout, res.stderr);
    throw new Error(`парсер завершился с кодом ${res.code}`);
  }
  return {
    out,
    cache,
    exportDir,
    stdout: res.stdout,
    products: JSON.parse(readFileSync(join(out, 'products.json'), 'utf8')),
    tree: JSON.parse(readFileSync(join(out, 'categories.scraped.json'), 'utf8')),
    errors: readFileSync(join(cache, 'errors.log'), 'utf8'),
  };
}

let run1;
try {
  run1 = await runScrape('1');
} catch (e) {
  console.error(`\n✗ ${e.message}`);
  server.close();
  process.exit(1);
}

/* --- 1. Состав результата ------------------------------------------ */
section('1. Что собрано');
chk('товаров', run1.products.length, fixtureStats.products);
const bySku = Object.fromEntries(run1.products.map((p) => [p.sku, p]));
chk('артикулы на месте', Object.keys(bySku).sort(), ['773168', '774394', 'CT100', 'K4421', 'KKC2002']);

/* --- 2. Мусор из sitemap отсечён ------------------------------------ */
section('2. Мусорные листья не стали товарами');
chk('страниц офисов в каталоге нет', run1.products.filter((p) => /ofis_prodazh/.test(p.slug)).length, 0);
chk('обе попали в errors.log с причиной', run1.errors.split('\n').filter((l) => l.includes('нет цены')).length, 2);

/* --- 3. Цены и остатки ---------------------------------------------- */
section('3. Цены, скидки, наличие');
chk('цена первого товара (не 120 из «Похожих»)', bySku['773168'].price, 850);
chk('старая цена', bySku['773168'].oldPrice, 1100);
chk('скидка у товара со старой ценой', bySku['773168'].sale, true);
chk('скидка у товара без старой цены, но со стикером «Акция»', bySku['CT100'].sale, true);
chk('товар без скидки', bySku['774394'].sale, false);
chk('нет в наличии', bySku['KKC2002'].inStock, false);
chk('в наличии', bySku['773168'].inStock, true);

/* --- 4. Отметки ------------------------------------------------------ */
section('4. Отметки со стикеров');
chk('хит', bySku['773168'].hit, true);
chk('не хит', bySku['KKC2002'].hit, false);
chk('новинка', bySku['774394'].isNew, true);
chk('советуем', bySku['KKC2002'].recommend, true);

/* --- 5. Описание дословно -------------------------------------------- */
section('5. Описание карточки — дословно с сайта');
const d1 = bySku['773168'].descriptionHtml;
chk('формулировка не изменена', d1.includes('обеспечивая деликатный антиоксидантный уход'), true);
chk('заголовок блока сохранён', d1.includes('<strong>АКТИВНЫЕ КОМПОНЕНТЫ:</strong>'), true);
chk('список сохранён', d1.includes('<li>подходит для ежедневного применения</li>'), true);
chk('разметка сбалансирована', [(d1.match(/<div\b/g) ?? []).length, (d1.match(/<\/div>/g) ?? []).length], [0, 0]);
chk('блок «Похожие товары» не попал', /Похожие|250 руб|120 руб/.test(d1), false);
chk('условия доставки не попали', /Доставка по России/.test(d1), false);
chk('скрытый артефакт «850 rub.» не попал', /rub\./.test(d1), false);
chk('способ применения вынесен отдельно',
  bySku['773168'].applicationHtml.includes('Вспенить легкими массажными движениями'), true);
chk('описание есть у всех товаров',
  run1.products.every((p) => (p.descriptionHtml ?? '').length > 40), true);

/* --- 6. Фото ---------------------------------------------------------- */
section('6. Фотографии');
chk('resize_cache развёрнут в оригинал',
  bySku['773168'].images, [`${base}/upload/iblock/b9e/ollin_salon_beauty.jpg`]);
chk('noimage отброшен', run1.products.every((p) => !p.images.some((u) => /noimage/i.test(u))), true);
chk('фото есть у всех', run1.products.every((p) => p.images.length === 1), true);

/* --- 7. Дерево разделов ------------------------------------------------ */
section('7. Дерево разделов из хлебных крошек');
const root = run1.tree.roots[0];
chk('корень один', run1.tree.roots.length, 1);
chk('имя корня человекочитаемое', root?.name, 'Профессиональная косметика для волос');
chk('вложенность', root?.children?.[0]?.children?.[0]?.slug, 'shampuni');
chk('slug корня', root?.slug, 'professionalnaya_kosmetika_dlya_volos');

/* --- 8. Схема приложения ------------------------------------------------ */
section('8. Выход подходит приложению без правок');
const REQUIRED = ['id', 'slug', 'name', 'brand', 'category', 'price', 'inStock', 'images'];
const FORBIDDEN = ['breadcrumbs', 'url', 'skipped', 'reason'];
chk('обязательные поля есть у всех',
  run1.products.filter((p) => REQUIRED.some((k) => p[k] === undefined)).length, 0);
chk('служебных полей не осталось',
  run1.products.filter((p) => FORBIDDEN.some((k) => k in p)).length, 0);
chk('id идут подряд с единицы',
  run1.products.map((p) => p.id), run1.products.map((_, i) => i + 1));
chk('категория каждой карточки есть в дереве', (() => {
  const paths = new Set();
  (function walk(nodes, prefix) {
    for (const n of nodes) {
      const p = prefix ? `${prefix}/${n.slug}` : n.slug;
      paths.add(p);
      if (n.children) walk(n.children, p);
    }
  })(run1.tree.roots, '');
  return run1.products.filter((p) => !paths.has(p.category)).length;
})(), 0);

/* --- 9. Вежливость ------------------------------------------------------- */
section('9. robots.txt соблюдается');
chk('закрытых адресов в ошибках нет', /HTTP 403/.test(run1.errors + run1.stdout), false);
chk('пагинация не запрашивалась', /PAGEN_/.test(run1.errors + run1.stdout), false);

/* --- 10. Детерминизм ------------------------------------------------------ */
section('10. Повторный прогон даёт тот же результат');
const run2 = await runScrape('2');
chk('products.json побайтово совпадает',
  JSON.stringify(run2.products), JSON.stringify(run1.products));
chk('дерево разделов совпадает',
  JSON.stringify(run2.tree), JSON.stringify(run1.tree));
chk('id не перемешались от тайминга сети',
  run2.products.map((p) => `${p.id}:${p.slug}`), run1.products.map((p) => `${p.id}:${p.slug}`));

/* --- 11. --resume ---------------------------------------------------------- */
section('11. Прерванный прогон продолжается');
const resumeOut = join(work, 'out-resume');
const resumeCache = join(work, 'cache-resume');
const resumeExport = join(work, 'export-resume');
const first = await runScraper([
  SCRAPER, '--base', base, '--delay', '0', '--limit', '2',
  '--out', resumeOut, '--cache', resumeCache, '--no-export', '--quiet',
]);
chk('пробный прогон на 2 товарах', first.code, 0);
const resumed = await runScraper([
  SCRAPER, '--base', base, '--delay', '0', '--resume', '--export', resumeExport,
  '--out', resumeOut, '--cache', resumeCache, '--quiet',
]);
chk('--resume завершился успешно', resumed.code, 0);
const resumedProducts = JSON.parse(readFileSync(join(resumeOut, 'products.json'), 'utf8'));
chk('после --resume собраны все товары', resumedProducts.length, fixtureStats.products);
chk('дубликатов нет', new Set(resumedProducts.map((p) => `${p.category}/${p.slug}`)).size, resumedProducts.length);

/* --- 12. Выгрузка для бэкенда ---------------------------------------------- */
/*
 * Эти файлы — то, ради чего собирается полный каталог: их загружают в базу.
 * Проверяем не «файлы создались», а пригодность к загрузке: целостность JSONL,
 * уникальность первичного ключа, полноту каждой записи, кодировку CSV и
 * совпадение манифеста с реальным содержимым каталога.
 */
section('12. Выгрузка для бэкенда (products.jsonl и компания)');

const EXPORT_FILES = [
  'products.jsonl', 'products.json', 'products.csv',
  'properties.csv', 'categories.json', 'manifest.json',
];
const expDir = run1.exportDir;
chk('на месте все файлы выгрузки', EXPORT_FILES.filter((f) => !existsSync(join(expDir, f))), []);

// JSONL разбираем сами, а не тем же readJsonl, которым пользуется парсер:
// проверка должна ловить ошибку в помощнике, а не наследовать её.
const jsonlRaw = readFileSync(join(expDir, 'products.jsonl'), 'utf8');
const jsonlLines = jsonlRaw.split('\n').filter((l) => l.trim());
const jsonl = jsonlLines.map((l) => JSON.parse(l)); // бросит, если строка битая
chk('строк в JSONL столько же, сколько товаров', jsonlLines.length, fixtureStats.products);
chk('файл заканчивается переносом строки', jsonlRaw.endsWith('\n'), true);

chk('первичный ключ уникален', new Set(jsonl.map((r) => r.sourceUrl)).size, jsonl.length);
chk('sourceUrl абсолютный', jsonl.filter((r) => !r.sourceUrl.startsWith(`${base}/`)).length, 0);
// sourcePath хранится без хвостового слэша, sourceUrl — абсолютный и со слэшем:
// на сайте все карточки живут по адресам с trailingSlash, и ключ должен быть каноническим.
chk('sourceUrl — абсолютный адрес карточки',
  jsonl.filter((r) => r.sourceUrl !== `${base}${r.sourcePath.replace(/\/+$/, '')}/`).length, 0);

const BACKEND_REQUIRED = ['name', 'price', 'currency', 'category', 'descriptionText', 'scrapedAt'];
chk('обязательные поля бэкенда есть у всех',
  jsonl.filter((r) => BACKEND_REQUIRED.some((k) => !r[k])).map((r) => r.slug), []);
chk('цена положительная у всех', jsonl.filter((r) => !(r.price > 0)).length, 0);
chk('валюта одна и та же', [...new Set(jsonl.map((r) => r.currency))], ['RUB']);
chk('фото есть у всех', jsonl.filter((r) => !r.images?.length).map((r) => r.slug), []);
chk('свойства сняты со всех карточек',
  jsonl.filter((r) => !Object.keys(r.properties ?? {}).length).map((r) => r.slug), []);
chk('бренд из таблицы свойств доехал', jsonl.every((r) => r.properties?.['Бренд']), true);
chk('сырой JSON-LD сохранён как страховка', jsonl.filter((r) => !r.jsonLd).length, 0);
chk('наличие согласовано с availability',
  jsonl.filter((r) => r.availability !== (r.inStock ? 'InStock' : 'OutOfStock')).length, 0);

// Объём разложен на число и единицу — иначе бэкенду пришлось бы парсить строку
chk('объём разложен на значение и единицу',
  jsonl.filter((r) => r.volume && !(r.volumeValue > 0 && r.volumeUnit)).map((r) => r.volume), []);

const jsonlProps = jsonl.reduce((n, r) => n + Object.keys(r.properties ?? {}).length, 0);
chk('записей в JSONL больше, чем в витринном products.json по числу полей',
  Object.keys(jsonl[0]).length > Object.keys(run1.products[0]).length, true);
chk('в витринном файле нет полей бэкенда',
  ['sourceUrl', 'properties', 'jsonLd', 'metaTitle'].filter((k) => k in run1.products[0]), []);

/* CSV: русский Excel и 1С ждут BOM и «;» */
const productsCsv = readFileSync(join(expDir, 'products.csv'), 'utf8');
chk('products.csv начинается с BOM', productsCsv.charCodeAt(0), 0xfeff);
chk('разделитель CSV — точка с запятой', productsCsv.slice(1).split('\r\n')[0].includes(';'), true);
chk('первая колонка CSV — первичный ключ', productsCsv.slice(1).split('\r\n')[0].split(';')[0], 'sourceUrl');
chk('строки CSV разделены CRLF', productsCsv.includes('\r\n'), true);
const propsCsv = readFileSync(join(expDir, 'properties.csv'), 'utf8');
chk('properties.csv — длинная таблица', propsCsv.slice(1).split('\r\n')[0], 'sku;sourceUrl;name;property;value');
chk('в properties.csv есть пара «Бренд»', propsCsv.includes('Бренд'), true);
chk('пар свойств в CSV не меньше, чем в JSONL',
  (propsCsv.match(/;Бренд;/g) ?? []).length >= 1 && jsonlProps > 0, true);

/* Разделы: дерево и плоский список со счётчиками */
const expCats = JSON.parse(readFileSync(join(expDir, 'categories.json'), 'utf8'));
chk('в дереве разделов один корень', expCats.tree.length, 1);
chk('плоский список разделов не пуст', expCats.flat.length > 0, true);
chk('счётчики товаров в разделах сходятся',
  expCats.flat.reduce((n, c) => n + c.productCount, 0) >= fixtureStats.products, true);

/* Манифест обязан совпадать с фактическим содержимым файлов */
const manifest = JSON.parse(readFileSync(join(expDir, 'manifest.json'), 'utf8'));
chk('в манифесте верное число записей', manifest.products, fixtureStats.products);
chk('манифест указывает загрузочный файл', manifest.importFile, 'products.jsonl');
chk('манифест указывает первичный ключ', manifest.primaryKey, 'sourceUrl');
chk('в манифесте перечислены все файлы', manifest.files.map((f) => f.name).sort(), [...EXPORT_FILES].sort());
chk('размеры файлов в манифесте настоящие',
  manifest.files.every((f) => statSync(join(expDir, f.name)).size === f.bytes), true);
chk('колонки CSV описаны в манифесте', manifest.columns.products.includes('price'), true);
chk('в фикстуре нет неполных записей', manifest.incomplete, []);
chk('счётчики манифеста совпадают с JSONL', manifest.stats.withImages, jsonl.filter((r) => r.images.length).length);

/* Детерминизм выгрузки: повторный прогон не должен переставлять записи,
   иначе каждая перезагрузка каталога выглядела бы как изменение всех строк. */
const jsonl2 = readFileSync(join(run2.exportDir, 'products.jsonl'), 'utf8')
  .split('\n').filter(Boolean)
  .map((l) => { const r = JSON.parse(l); delete r.scrapedAt; return JSON.stringify(r); });
const jsonl1 = jsonl.map((r) => { const c = { ...r }; delete c.scrapedAt; return JSON.stringify(c); });
chk('выгрузка побайтово воспроизводима (кроме даты сбора)', jsonl2, jsonl1);

/* Экспорт после --resume полный: потерянные при обрыве записи не теряются в выгрузке */
const resumedJsonl = readFileSync(join(resumeExport, 'products.jsonl'), 'utf8').split('\n').filter(Boolean);
chk('после --resume в выгрузке все товары', resumedJsonl.length, fixtureStats.products);
chk('в выгрузке после --resume нет дубликатов',
  new Set(resumedJsonl.map((l) => JSON.parse(l).sourceUrl)).size, fixtureStats.products);

/* ------------------------------------------------------------------ */
server.close();
rmSync(work, { recursive: true, force: true });

console.log(`\n═══════ ИТОГ: ${pass} пройдено, ${fail} провалено ═══════`);
process.exit(fail ? 1 : 0);
