#!/usr/bin/env node
/**
 * Парсер полного каталога sibcirulnik.ru → src/data/products.json + categories.json
 *
 * Как работает
 * ------------
 * 1. Читает robots.txt, находит директиву Sitemap: и проверяет Disallow-правила.
 * 2. Раскрывает индекс sitemap'ов (sitemap.xml → sitemap-iblock-*.xml) и собирает
 *    ВСЕ URL каталога. Это принципиально: robots.txt запрещает *PAGEN_* (пагинацию),
 *    поэтому обход по страницам листинга был бы и невежливым, и ненадёжным.
 * 3. Различает разделы и товары по префиксам: URL является разделом, если какой-то
 *    другой URL начинается с него. Листья — товары.
 * 4. Запрашивает страницы товаров с задержкой, ограничением параллелизма и ретраями.
 * 5. Разбирает каждую страницу в несколько слоёв (JSON-LD → meta/itemprop → DOM →
 *    регулярные запасные варианты), потому что вёрстка может отличаться от ожидания.
 * 6. Путь раздела берётся прямо из URL, названия разделов — из хлебных крошек,
 *    поэтому categories.json строится автоматически.
 * 7. Пишет результат в схеме приложения. Прогресс сохраняется, обрыв не страшен.
 *
 * Зависимостей нет — нужен только Node 18+ (встроенный fetch).
 *
 * Использование
 * -------------
 *   node scripts/scrape-catalog.mjs --dry-run            # только разведка, ничего не качает
 *   node scripts/scrape-catalog.mjs --limit 20           # пробный прогон на 20 товарах
 *   node scripts/scrape-catalog.mjs                      # полный прогон
 *   node scripts/scrape-catalog.mjs --resume             # продолжить после обрыва
 *   node scripts/scrape-catalog.mjs --html page.html     # отладка парсера на сохранённой странице
 *   node scripts/scrape-catalog.mjs --urls-only out.txt  # только выгрузить список URL
 *
 * Полный список опций: --help
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, copyFileSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { guessBrand, guessLine, normalizeVolume, toNumber, translit } from './import-bitrix.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const DEFAULT_BASE = 'https://sibcirulnik.ru';
// ВАЖНО: только ASCII. Значения HTTP-заголовков — это ByteString (Latin-1),
// кириллица здесь роняет fetch с «Cannot convert argument to a ByteString».
const USER_AGENT =
  'CibirianCatalogBot/1.0 (+https://github.com/pragruz1-hue/Cibirian; one-off catalog export)';

/* ================================================================== */
/* Опции                                                               */
/* ================================================================== */

function parseArgs(argv) {
  const o = {
    base: DEFAULT_BASE,
    sitemap: null,
    out: join(ROOT, 'src', 'data'),
    cache: join(ROOT, '.scrape-cache'),
    delay: 400,
    concurrency: 2,
    timeout: 30000,
    retries: 3,
    limit: null,
    only: null,
    skip: null,
    dryRun: false,
    resume: false,
    urlsOnly: null,
    html: null,
    pageUrl: null,
    saveHtml: false,
    respectRobots: true,
    quiet: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--base': o.base = next().replace(/\/+$/, ''); break;
      case '--sitemap': o.sitemap = next(); break;
      case '--out': o.out = resolve(next()); break;
      case '--cache': o.cache = resolve(next()); break;
      case '--delay': o.delay = Number(next()); break;
      case '--concurrency': o.concurrency = Math.max(1, Number(next())); break;
      case '--timeout': o.timeout = Number(next()); break;
      case '--retries': o.retries = Number(next()); break;
      case '--limit': o.limit = Number(next()); break;
      case '--only': o.only = next(); break;
      case '--skip': o.skip = next(); break;
      case '--dry-run': o.dryRun = true; break;
      case '--resume': o.resume = true; break;
      case '--urls-only': o.urlsOnly = resolve(next()); break;
      case '--html': o.html = resolve(next()); break;
      case '--save-html': o.saveHtml = true; break;
      case '--no-respect-robots': o.respectRobots = false; break;
      case '--quiet': o.quiet = true; break;
      case '-h': case '--help': o.help = true; break;
      default:
        // Голый URL — адрес страницы для режима --html
        if (/^https?:\/\//i.test(a)) { o.pageUrl = a; break; }
        throw new Error(`Неизвестная опция: ${a} (см. --help)`);
    }
  }
  if (Number.isNaN(o.delay) || Number.isNaN(o.concurrency)) throw new Error('Некорректное число в опциях');
  return o;
}

const HELP = `
Парсер каталога sibcirulnik.ru

  node scripts/scrape-catalog.mjs [опции]

Разведка и отладка
  --dry-run            найти все URL и показать статистику, ничего не запрашивать
  --limit N            обработать только первые N товаров (пробный прогон)
  --html <файл>        разобрать сохранённый HTML и показать, что извлечено
                       (главный инструмент подстройки, если вёрстка изменилась)
  --urls-only <файл>   выгрузить найденные URL в файл и выйти
  --save-html          складывать сырой HTML в --cache/html для разбора ошибок

Источник
  --base <url>         адрес сайта (по умолчанию ${DEFAULT_BASE})
  --sitemap <url>      sitemap явно, минуя robots.txt
  --only <подстрока>   обрабатывать только URL, содержащие подстроку
  --skip <подстрока>   пропускать URL, содержащие подстроку

Вежливость и надёжность
  --delay <мс>         пауза между запросами (по умолчанию 400)
  --concurrency <N>    параллельных запросов (по умолчанию 2)
  --timeout <мс>       таймаут запроса (по умолчанию 30000)
  --retries <N>        повторов при ошибке (по умолчанию 3)
  --no-respect-robots  не проверять robots.txt (не рекомендуется)

Результат
  --out <каталог>      куда писать products.json и categories.json
  --cache <каталог>    кэш прогресса для --resume
  --resume             продолжить прерванный прогон
`;

/* ================================================================== */
/* robots.txt                                                          */
/* ================================================================== */

export function parseRobots(text, ua = '*') {
  const groups = new Map();
  let current = null;

  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();

    if (key === 'user-agent') {
      current = val.toLowerCase();
      if (!groups.has(current)) groups.set(current, { allow: [], disallow: [] });
    } else if (current && (key === 'allow' || key === 'disallow')) {
      if (val) groups.get(current)[key].push(val);
    }
  }

  const rules = groups.get(ua.toLowerCase()) ?? groups.get('*') ?? { allow: [], disallow: [] };
  const sitemaps = [...String(text).matchAll(/^\s*Sitemap\s*:\s*(\S+)/gim)].map((m) => m[1]);

  return { rules, sitemaps };
}

/** Битрикс использует * как «любая последовательность» и $ как «конец строки». */
function robotsPatternToRegex(pattern) {
  let src = '';
  for (const ch of pattern) {
    if (ch === '*') src += '.*';
    else if (ch === '$') src += '$';
    else src += ch.replace(/[.+?^{}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${src}`);
}

export function isAllowed(pathname, robots) {
  if (!robots) return true;
  const { allow, disallow } = robots.rules;
  let allowed = true;
  let bestLen = -1;

  // Наиболее специфичное (длинное) совпадение побеждает — как в стандарте
  for (const p of allow) {
    if (p.length > bestLen && robotsPatternToRegex(p).test(pathname)) {
      allowed = true; bestLen = p.length;
    }
  }
  for (const p of disallow) {
    if (p.length > bestLen && robotsPatternToRegex(p).test(pathname)) {
      allowed = false; bestLen = p.length;
    }
  }
  return allowed;
}

/* ================================================================== */
/* HTTP с ретраями и вежливой задержкой                                */
/* ================================================================== */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url, opts, attempt = 0) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeout);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.6',
      },
    });

    if (res.status === 429 || res.status >= 500) {
      throw new Error(`HTTP ${res.status}`);
    }
    if (res.status === 404) return { status: 404, text: '' };
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const buf = Buffer.from(await res.arrayBuffer());
    return { status: res.status, text: buf.toString('utf8') };
  } catch (err) {
    if (attempt < opts.retries) {
      // Экспоненциальная пауза: 429 и сетевые сбои обычно проходят
      const wait = opts.delay * 2 ** attempt + 500;
      if (!opts.quiet) process.stderr.write(`  ↻ ${basename(url)}: ${err.message}, повтор через ${wait}мс\n`);
      await sleep(wait);
      return fetchText(url, opts, attempt + 1);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/* ================================================================== */
/* Sitemap                                                             */
/* ================================================================== */

function extractSitemapUrls(xml) {
  // <loc>…</loc> встречается и в <sitemap>, и в <url> — собираем все
  return [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^>\]]+?)\s*(?:\]\]>)?\s*<\/loc>/gi)]
    .map((m) => m[1].trim())
    .filter(Boolean);
}

function isSitemapIndex(xml) {
  return /<sitemapindex[\s>]/i.test(xml);
}

async function collectSitemap(url, opts, seen = new Set(), depth = 0) {
  if (seen.has(url) || depth > 5) return [];
  seen.add(url);

  if (!opts.quiet) process.stderr.write(`  sitemap: ${url}\n`);
  const { status, text } = await fetchText(url, opts);
  if (status !== 200 || !text) {
    process.stderr.write(`  ⚠ sitemap недоступен (${status}): ${url}\n`);
    return [];
  }

  const urls = extractSitemapUrls(text);
  if (isSitemapIndex(text)) {
    const nested = [];
    for (const child of urls) {
      await sleep(opts.delay);
      nested.push(...(await collectSitemap(child, opts, seen, depth + 1)));
    }
    return nested;
  }
  return urls;
}

/* ================================================================== */
/* Классификация URL: раздел vs товар                                  */
/* ================================================================== */

function pathOf(url, base) {
  try {
    const u = new URL(url, base);
    return u.pathname.replace(/\/+$/, '');
  } catch {
    return url.replace(/\/+$/, '');
  }
}

/**
 * Раздел — это URL, который является строгим префиксом другого URL.
 * Товары всегда листья. Не требует ни одного запроса к сайту.
 */
export function classifyUrls(urls, base) {
  const paths = [...new Set(urls.map((u) => pathOf(u, base)).filter(Boolean))].sort();
  const categories = new Set();

  for (let i = 0; i < paths.length; i++) {
    for (let j = i + 1; j < paths.length; j++) {
      if (paths[j].startsWith(`${paths[i]}/`)) categories.add(paths[i]);
      else break; // отсортировано, дальше префиксов нет
    }
  }

  return {
    categories: paths.filter((p) => categories.has(p)),
    products: paths.filter((p) => !categories.has(p)),
    all: paths,
  };
}

/* ================================================================== */
/* Разбор HTML товара — несколько слоёв надёжности                     */
/* ================================================================== */

function decodeEntities(s) {
  return String(s ?? '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(s) {
  return decodeEntities(String(s ?? '').replace(/<[^>]*>/g, ' '));
}

/** Убирает script/style/noscript — там цены из JSON и счётчиков, не из карточки. */
function stripScripts(html) {
  return String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
}

function extractJsonLd(html) {
  const out = [];
  const re = /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    try {
      const parsed = JSON.parse(decodeEntities(m[1]));
      out.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    } catch {
      // Битрикс иногда выдаёт JSON с переносами внутри строк — пробуем починить
      try {
        const fixed = m[1].replace(/[\r\n\t]+/g, ' ').trim();
        out.push(...(Array.isArray(JSON.parse(fixed)) ? JSON.parse(fixed) : [JSON.parse(fixed)]));
      } catch { /* пропускаем */ }
    }
  }
  return out;
}

function findByType(nodes, type) {
  return nodes.find((n) => {
    const t = n?.['@type'];
    return Array.isArray(t) ? t.includes(type) : t === type;
  }) ?? null;
}

function metaContent(html, name, attr = 'property') {
  const re = new RegExp(
    `<meta[^>]+${attr}\\s*=\\s*["']${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`,
    'i',
  );
  const tag = html.match(re)?.[0];
  if (!tag) return '';
  return decodeEntities(tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1] ?? '');
}

/** Первая <h1> — название товара на карточке */
function extractH1(html) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? stripTags(m[1]) : '';
}

/**
 * Цена. Слои: JSON-LD → itemprop/meta → текст вида «1 320 руб».
 * Возвращает { price, oldPrice } — старая цена обычно больше текущей.
 */
/** Классы и слова служебных блоков, откуда цену товара брать нельзя. */
const NOISE_ZONE_RE =
  /(related|similar|recommend|viewed|crossell|cross[-_ ]?sell|popular_items|похож|рекоменд|с этим товаром|также смотр|ранее смотр|доставк|delivery|shipping|footer|подвал|basket|корзин)/i;

/** Блоки, где лежит зачёркнутая старая цена. */
const OLD_PRICE_ZONE_RE =
  /class\s*=\s*["'][^"']*(?:price[_ -]?old|old[_ -]?price|priceold|discount|skidka|oldprice)[^"']*["'][\s\S]{0,300}?>([\s\S]{0,300}?)</gi;

const RUB_RE = /([\d][\d\s\u00a0]{0,9}(?:[.,]\d+)?)\s*(?:руб|₽)/gi;

/** Цены из текстовых блоков, класс которых содержит «price», вне служебных зон. */
function textualPrices(ctx) {
  const out = [];
  const re = /class\s*=\s*["'][^"']*price[^"']*["'][\s\S]{0,600}?>([\s\S]{0,600}?)</gi;
  for (const m of ctx.matchAll(re)) {
    // Смотрим и сам блок, и 400 символов перед ним: «Похожие товары»
    // объявлены в родительском div и внутрь совпадения не попадают.
    const before = ctx.slice(Math.max(0, m.index - 400), m.index);
    if (NOISE_ZONE_RE.test(m[0]) || NOISE_ZONE_RE.test(before)) continue;
    for (const pm of m[0].matchAll(RUB_RE)) {
      const v = toNumber(pm[1]);
      if (v !== null && v > 0) out.push(v);
    }
  }
  return out;
}

/**
 * Цена товара.
 *
 * Источники идут уровнями по надёжности, и берётся ПЕРВЫЙ непустой уровень —
 * смешивать их нельзя: цена похожего товара из блока «Рекомендуем» (120 руб)
 * перевесила бы настоящую (850 руб), если брать минимум по всем находкам.
 * Старая цена ищется отдельно, чтобы скидка не терялась, когда в JSON-LD
 * указана только текущая.
 */
function extractPrices(html, ld) {
  const ctx = stripScripts(html);
  const tiers = [];

  // Уровень 1 — JSON-LD offers: машиночитаемо, надёжнее всего
  const fromLd = [];
  const offers = ld?.offers ?? ld?.Offer;
  if (offers) {
    for (const off of Array.isArray(offers) ? offers : [offers]) {
      const v = toNumber(off.price ?? off.lowPrice ?? off.PriceForUnit);
      if (v !== null) fromLd.push(v);
    }
  }
  tiers.push(fromLd);

  // Уровень 2 — микроразметка itemprop="price" и meta
  const micro = [];
  for (const m of html.matchAll(/itemprop\s*=\s*["']price["'][^>]*content\s*=\s*["']([^"']+)["']/gi)) {
    const v = toNumber(m[1]);
    if (v !== null) micro.push(v);
  }
  for (const name of ['product:price:amount', 'price']) {
    for (const attr of ['property', 'name']) {
      const v = toNumber(metaContent(html, name, attr));
      if (v !== null) micro.push(v);
    }
  }
  tiers.push(micro);

  // Уровень 3 — текст внутри блоков с class~"price"
  tiers.push(textualPrices(ctx));

  // Уровень 4 — вообще все «N руб» на странице, с проверкой контекста.
  // Сюда попадает «доставка бесплатно от 3 000 руб», поэтому фильтр обязателен.
  const anywhere = [];
  for (const m of ctx.matchAll(RUB_RE)) {
    const around = ctx.slice(Math.max(0, m.index - 160), m.index + m[0].length + 60);
    if (NOISE_ZONE_RE.test(around)) continue;
    const v = toNumber(m[1]);
    if (v !== null && v > 10) anywhere.push(v);
  }
  tiers.push(anywhere);

  const values = tiers.map((t) => [...new Set(t.filter((v) => v > 0))]).find((t) => t.length);
  if (!values?.length) return { price: null, oldPrice: null };

  const price = Math.min(...values);

  // Старая цена: явный блок price_old/discount, иначе максимум своего уровня
  let oldPrice = null;
  for (const m of ctx.matchAll(OLD_PRICE_ZONE_RE)) {
    if (NOISE_ZONE_RE.test(m[0])) continue;
    for (const pm of m[0].matchAll(RUB_RE)) {
      const v = toNumber(pm[1]);
      if (v !== null && v > price) oldPrice = Math.max(oldPrice ?? 0, v);
    }
  }
  if (oldPrice === null) {
    const max = Math.max(...values);
    if (max > price) oldPrice = max;
  }

  return { price, oldPrice };
}

/* ------------------------------------------------------------------ */
/* Описание карточки — дословно с сайта                                */
/* ------------------------------------------------------------------ */

/**
 * Чистит фрагмент описания перед записью в products.json.
 *
 * Формулировки не меняются — клиент сверяет карточку с сайтом, расхождение
 * его запутает. Снимается только то, что не является текстом описания:
 * скрипты, комментарии, обработчики событий, чужие формы. Окончательный
 * белый список тегов применяет приложение в src/lib/sanitize.ts.
 */
export function cleanHtml(html) {
  let out = String(html ?? '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(
      /<(script|style|iframe|object|embed|svg|math|noscript|template|form|input|button|select|textarea)\b[\s\S]*?(?:<\/\1\s*>|$)/gi,
      ' ',
    )
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
    // относительные пути картинок достраиваем до абсолютных
    .replace(/(<img\b[^>]*?\ssrc\s*=\s*["'])\/(?!\/)/gi, `$1${DEFAULT_BASE}/`);

  // Обрезанный по границе хвост может окончиться на середине тега — убираем
  out = out.replace(/<[^>]*$/, '');

  return out
    .replace(/&nbsp;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Содержимое первого блока, чей класс подходит под признак зоны описания.
 * Блочную структуру целиком регуляркой не взять, поэтому берём окно после
 * открывающего тега и обрезаем его по границе следующего смыслового блока.
 */
function zoneContent(html, classRe, maxLen = 12000) {
  const openRe = new RegExp(
    `<div[^>]*class\\s*=\\s*["'][^"']*${classRe.source}[^"']*["'][^>]*>`,
    'i',
  );
  const m = html.match(openRe);
  if (!m) return '';
  const start = m.index + m[0].length;
  const chunk = html.slice(start, start + maxLen);

  // Границы, за которыми начинается не описание
  const stops = [
    /<div[^>]*class\s*=\s*["'][^"']*(?:related|recommend|similar|viewed|reviews|comments|tabs|delivery|basket|buy_one_click|props|characteristics|stickers|footer)/i,
    /<h2[\s>]/i,
    /<form[\s>]/i,
    /<footer[\s>]/i,
  ];
  let cut = chunk.length;
  for (const re of stops) {
    const sm = chunk.match(re);
    if (sm && sm.index !== undefined && sm.index < cut) cut = sm.index;
  }
  return cleanHtml(chunk.slice(0, cut));
}

const DESCRIPTION_ZONES = [
  /detail[_ ]?text/i,
  /item[_ -]?description/i,
  /product[_ -]?description/i,
  /description[_ -]?text/i,
  /tab[_ -]?description/i,
];

const APPLICATION_HEADING_RE =
  /<h[2-5][^>]*>(?:\s|<[^>]+>)*(?:Способ применения|Применение|Как применять|Инструкция(?:\s+по\s+применению)?)(?:\s|<[^>]+>)*<\/h[2-5]>/i;

/**
 * Описание и способ применения — как на сайте.
 *
 * JSON-LD берётся только запасным путём и только если текст достаточно
 * длинный: Битрикс кладёт туда автогенерацию вида «Название — цена — купить
 * в …», показывать её в карточке нельзя.
 */
export function extractDescription(html, ld, props = {}) {
  let descriptionHtml = '';

  // itemprop="description" — отдельная форма, не через class
  const micro = html.match(/itemprop\s*=\s*["']description["'][^>]*>([\s\S]{0,12000}?)<\/div>/i);
  if (micro) descriptionHtml = cleanHtml(micro[1]);

  for (const re of DESCRIPTION_ZONES) {
    if (descriptionHtml.length > 40) break;
    descriptionHtml = zoneContent(html, re);
  }

  // JSON-LD description — обычный текст, а не разметка. Теги вырезаем:
  // экранирование оставило бы в карточке видимый мусор вроде «&lt;b>».
  const ldText = decodeEntities(ld?.description ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (descriptionHtml.length < 40 && ldText.length >= 80) {
    descriptionHtml = `<p>${ldText}</p>`;
  }

  // Способ применения: свойство товара или блок после соответствующего заголовка
  let applicationHtml = '';
  const fromProp = pickProp(props, [
    'способ применения', 'применение', 'как применять', 'инструкция',
  ]);
  if (fromProp) {
    applicationHtml = `<p>${fromProp.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}</p>`;
  } else {
    const hm = html.match(APPLICATION_HEADING_RE);
    if (hm && hm.index !== undefined) {
      const after = html.slice(hm.index + hm[0].length, hm.index + hm[0].length + 4000);
      const nextHeading = after.search(/<h[2-5][\s>]/i);
      applicationHtml = cleanHtml(nextHeading >= 0 ? after.slice(0, nextHeading) : after);
    }
  }

  return {
    descriptionHtml: descriptionHtml.slice(0, 20000),
    applicationHtml: applicationHtml.slice(0, 6000),
  };
}

/** Есть ли на странице машиночитаемая разметка именно товара. */
function hasProductMarkup(html, ld) {
  return Boolean(
    ld ||
      /itemprop\s*=\s*["']price["']/i.test(html) ||
      /itemtype\s*=\s*["']https?:\/\/schema\.org\/Product["']/i.test(html) ||
      /property\s*=\s*["']product:price:amount["']/i.test(html),
  );
}

/** Сколько разных текстовых цен на странице — у раздела их десятки. */
function countDistinctPrices(html) {
  const ctx = stripScripts(html);
  const set = new Set();
  for (const m of ctx.matchAll(RUB_RE)) {
    const v = toNumber(m[1]);
    if (v !== null && v > 10) set.add(v);
  }
  return set.size;
}

function extractStock(html, ld) {
  const avail = ld?.offers?.availability ?? ld?.offers?.Availability;
  if (typeof avail === 'string') {
    if (/InStock|PreOrder|PreSale/i.test(avail)) return true;
    if (/OutOfStock|SoldOut|Discontinued/i.test(avail)) return false;
  }
  const itemprop = html.match(/itemprop\s*=\s*["']availability["'][^>]*content\s*=\s*["']([^"']+)["']/i);
  if (itemprop) {
    if (/InStock/i.test(itemprop[1])) return true;
    if (/OutOfStock/i.test(itemprop[1])) return false;
  }
  const text = stripTags(html);
  if (/Нет в наличии|Под заказ|Ожидается/i.test(text)) {
    // «Есть в наличии» может встретиться в блоке похожих товаров — смотрим точную фразу раньше
    const yes = text.indexOf('Есть в наличии');
    const no = text.search(/Нет в наличии|Под заказ/);
    if (yes >= 0 && (no < 0 || yes < no)) return true;
    return false;
  }
  if (/Есть в наличии/i.test(text)) return true;
  return true; // по умолчанию считаем доступным
}

/**
 * Битрикс отдаёт в списке уменьшенные копии вида
 * /upload/resize_cache/iblock/<hash>/900_900_1/file.jpg,
 * а оригинал лежит в /upload/iblock/<hash>/file.jpg.
 * Возвращаем оригинал — иначе в каталоге будут мыльные превью.
 */
function toOriginalImage(u) {
  return String(u).replace(
    /\/upload\/resize_cache\/iblock\/([a-z0-9]+)\/[^/]+\//i,
    '/upload/iblock/$1/',
  );
}

function extractImages(html, ld, base) {
  const out = [];
  const push = (u) => {
    if (!u) return;
    let abs;
    try {
      abs = new URL(toOriginalImage(String(u).trim()), base).toString();
    } catch {
      return;
    }
    if (!out.includes(abs)) out.push(abs);
  };

  if (Array.isArray(ld?.image)) ld.image.forEach(push);
  else push(ld?.image);

  push(metaContent(html, 'og:image'));

  // Фото товара из галереи: только upload/iblock, без иконок категорий и логотипов
  const gallery =
    html.match(/class\s*=\s*["'][^"']*(?:detail_images|item_images|gallery|slider)[^"']*["'][\s\S]{0,8000}?<\/div>/i)?.[0] ??
    html;
  for (const m of gallery.matchAll(/(?:src|href|data-src|data-large)\s*=\s*["']([^"']*upload\/iblock\/[^"']+)["']/gi)) {
    push(m[1]);
  }

  return out
    .filter((u) => !/(?:noimage|no_image|logo|sprite|icon|blank|pixel)\.(?:png|jpe?g|svg|webp|gif)/i.test(u))
    .slice(0, 12);
}

function extractBadges(html) {
  let zone = html.match(
    /class\s*=\s*["'][^"']*(?:stickers|badges|labels|marks|flags)[^"']*["'][\s\S]{0,600}?<\/div>/i,
  )?.[0];

  // Если блока стикеров нет, смотрим только окрестность <h1>: в шаблонах Аспро
  // стикеры стоят рядом с названием. Сканировать всю страницу нельзя — «Хит»
  // и «Акция» встречаются в блоке похожих товаров и дали бы ложные срабатывания.
  if (!zone) {
    const h1 = html.search(/<h1[^>]*>/i);
    zone = h1 >= 0 ? html.slice(Math.max(0, h1 - 2500), h1 + 2500) : '';
  }
  if (!zone) return { hit: false, recommend: false, sale: false, isNew: false };

  const text = stripTags(zone);
  return {
    hit: /(^|\s)Хит(\s|$)/i.test(text),
    recommend: /Советуем|Рекомендуем/i.test(text),
    sale: /(^|\s)Акция(\s|$)|Скидка/i.test(text),
    isNew: /Новинк/i.test(text),
  };
}

/** Хлебные крошки → названия разделов для categories.json */
function extractBreadcrumbs(html, ld) {
  const list = findByType(extractJsonLd(html), 'BreadcrumbList');
  if (list?.itemListElement?.length) {
    return list.itemListElement
      .map((el) => decodeEntities(el?.name ?? el?.item?.name ?? ''))
      .filter(Boolean);
  }

  const zone =
    html.match(/class\s*=\s*["'][^"']*breadcrumb[^"']*["'][\s\S]{0,4000}?(?:<\/nav>|<\/div>\s*<\/div>)/i)?.[0] ?? '';
  if (!zone) return [];
  return [...zone.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((m) => stripTags(m[1]))
    .filter((t) => t && !/^(Главная|Каталог)$/i.test(t));
}

/** Свойства из таблицы характеристик */
function extractProps(html) {
  const props = {};
  const zone = html.match(/class\s*=\s*["'][^"']*(?:props|characteristics|item_stock|detail_props)[^"']*["'][\s\S]{0,12000}?<\/table>/i)?.[0] ?? '';
  for (const m of zone.matchAll(/<tr[^>]*>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/gi)) {
    const k = stripTags(m[1]).replace(/:$/, '').toLowerCase();
    const v = stripTags(m[2]);
    if (k && v) props[k] = v;
  }
  return props;
}

function pickProp(props, keys) {
  for (const k of keys) {
    const hit = Object.keys(props).find((p) => p.includes(k));
    if (hit && props[hit]) return props[hit];
  }
  return '';
}

/**
 * Главная функция разбора страницы товара.
 * Возвращает объект в схеме приложения либо null, если это не товар.
 */
export function parseProductPage(html, url, base) {
  const ldAll = extractJsonLd(html);
  const ld = findByType(ldAll, 'Product');

  const pathname = pathOf(url, base);
  const segments = pathname.replace(/^\/catalog\//, '').split('/').filter(Boolean);
  // Пустой путь — это сам /catalog/. Один сегмент допустим: в sitemap бывают
  // товары прямо в корне раздела (и мусор вроде ofis_prodazh_* — его отсечёт
  // проверка «название + цена» ниже).
  if (!segments.length) return null;

  const slug = segments[segments.length - 1];
  // category = '' означает товар в корне каталога
  const categoryPath = segments.slice(0, -1).join('/');

  const name =
    decodeEntities(ld?.name) ||
    metaContent(html, 'og:title') ||
    extractH1(html) ||
    decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')
      .replace(/\s*[—|–-]\s*(?:купить|Сибирский цирюльник).*/i, '')
      .trim();

  const { price, oldPrice } = extractPrices(html, ld);

  // Без названия или цены это не товар (например, страница офиса из sitemap)
  if (!name || price === null) {
    return { skipped: true, reason: !name ? 'нет названия' : 'нет цены', url: pathname };
  }

  // Страница раздела — десятки цен и никакой разметки товара. Обычно такие
  // отсеивает classifyUrls, но раздел без товаров в sitemap доходит сюда.
  if (!hasProductMarkup(html, ld) && countDistinctPrices(html) >= 5) {
    return {
      skipped: true,
      reason: 'похоже на раздел: много цен и нет разметки товара',
      url: pathname,
    };
  }

  const props = extractProps(html);
  const badges = extractBadges(html);
  const volume = normalizeVolume(
    pickProp(props, ['объем', 'объём', 'volume', 'фасовка']) ||
      // \b в JS не видит кириллицу как \w, поэтому граница слова здесь не
      // сработала бы — вместо неё «не буква» и «гр» раньше «г»
      (name.match(/(\d[\d\s]*(?:[.,]\d+)?\s*(?:мл|ml|гр|г|л|l))(?![а-яёa-z])/i)?.[1] ?? ''),
  );

  const brand =
    decodeEntities(ld?.brand?.name ?? (typeof ld?.brand === 'string' ? ld?.brand : '')) ||
    pickProp(props, ['бренд', 'brand', 'производитель', 'торговая марка']) ||
    guessBrand(name);

  return {
    skipped: false,
    url: pathname,
    slug,
    category: categoryPath,
    name,
    brand,
    line: guessLine(name, brand),
    price,
    oldPrice,
    volume,
    inStock: extractStock(html, ld),
    hit: badges.hit,
    recommend: badges.recommend,
    sale: badges.sale || Boolean(oldPrice),
    isNew: badges.isNew,
    purpose: splitList(pickProp(props, ['назначение', 'действие', 'эффект'])),
    hairType: splitList(pickProp(props, ['тип волос', 'для волос', 'тип'])),
    palette: splitList(pickProp(props, ['палитра', 'оттенок', 'цвет'])),
    images: extractImages(html, ld, base),
    breadcrumbs: extractBreadcrumbs(html, ld),
    sku: pickProp(props, ['артикул', 'код товара', 'sku']) || decodeEntities(ld?.sku) || '',
    // Описание берём дословно с сайта: клиент сверяет карточку с оригиналом
    ...extractDescription(html, ld, props),
  };
}

function splitList(v) {
  return String(v ?? '')
    .split(/[,;/]/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s && s.length < 60);
}

/* ================================================================== */
/* Построение дерева разделов из хлебных крошек                        */
/* ================================================================== */

export function buildCategoryTree(products) {
  const byPath = new Map();

  for (const p of products) {
    if (!p.category || !p.breadcrumbs?.length) continue;
    const segs = p.category.split('/');
    // breadcrumbs: [.., 'Каталог', 'Раздел', 'Подраздел', 'Название товара']
    const names = p.breadcrumbs.slice(0, -1); // без названия товара
    const offset = names.length - segs.length;

    segs.forEach((slug, i) => {
      const path = segs.slice(0, i + 1).join('/');
      if (!byPath.has(path)) {
        byPath.set(path, { slug, name: names[i + offset] || slug, path, children: [] });
      } else if (names[i + offset]) {
        byPath.get(path).name = names[i + offset];
      }
    });
  }

  const roots = [];
  for (const node of byPath.values()) {
    const parentPath = node.path.split('/').slice(0, -1).join('/');
    if (parentPath && byPath.has(parentPath)) byPath.get(parentPath).children.push(node);
    else roots.push(node);
  }

  const clean = (arr) =>
    arr
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      .map((n) => {
        const out = { slug: n.slug, name: n.name };
        if (n.children.length) out.children = clean(n.children);
        return out;
      });

  return { roots: clean(roots) };
}

/* ================================================================== */
/* Прогресс / checkpoint                                               */
/* ================================================================== */

function loadCheckpoint(file) {
  if (!existsSync(file)) return { done: {}, products: [] };
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return { done: {}, products: [] };
  }
}

function saveCheckpoint(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(data), 'utf8');
  // rename атомарен — при обрыве не получим битый файл
  renameSync(tmp, file);
}

/* ================================================================== */
/* Основной поток                                                      */
/* ================================================================== */

async function discover(opts) {
  let robots = null;
  let sitemapUrls = [];

  if (opts.respectRobots) {
    try {
      const { status, text } = await fetchText(`${opts.base}/robots.txt`, opts);
      if (status === 200 && text) {
        robots = parseRobots(text);
        sitemapUrls = robots.sitemaps;
        if (!opts.quiet) {
          process.stderr.write(
            `→ robots.txt: ${robots.rules.disallow.length} Disallow-правил, sitemap'ов: ${sitemapUrls.length}\n`,
          );
        }
      }
    } catch (e) {
      process.stderr.write(`⚠ robots.txt недоступен (${e.message}), продолжаю без него\n`);
    }
  }

  if (opts.sitemap) sitemapUrls = [opts.sitemap];
  if (!sitemapUrls.length) sitemapUrls = [`${opts.base}/sitemap.xml`];

  const allUrls = [];
  for (const sm of sitemapUrls) {
    await sleep(opts.delay);
    allUrls.push(...(await collectSitemap(sm, opts)));
  }

  const catalogUrls = allUrls.filter((u) => pathOf(u, opts.base).startsWith('/catalog'));
  const { categories, products } = classifyUrls(catalogUrls, opts.base);

  // Фильтр по robots.txt — пагинация и служебные пути там запрещены
  const allowedProducts = opts.respectRobots
    ? products.filter((p) => isAllowed(p, robots))
    : products;

  const blocked = products.length - allowedProducts.length;
  if (blocked > 0 && !opts.quiet) {
    process.stderr.write(`  ⚠ robots.txt запрещает ${blocked} URL — пропущены\n`);
  }

  return { categories, products: allowedProducts, robots, totalSitemap: allUrls.length };
}

function filterUrls(urls, opts) {
  let out = urls;
  if (opts.only) out = out.filter((u) => u.includes(opts.only));
  if (opts.skip) out = out.filter((u) => !u.includes(opts.skip));
  if (opts.limit) out = out.slice(0, opts.limit);
  return out;
}

async function scrapeOne(path, opts, state, idx, total) {
  const url = `${opts.base}${path}`;
  try {
    const { status, text } = await fetchText(url, opts);
    if (status !== 200 || !text) {
      state.done[path] = { error: `HTTP ${status}` };
      return null;
    }

    if (opts.saveHtml) {
      const dir = join(opts.cache, 'html');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${translit(path).slice(-120) || 'index'}.html`), text, 'utf8');
    }

    const parsed = parseProductPage(text, url, opts.base);
    if (!parsed) {
      state.done[path] = { error: 'не товар' };
      return null;
    }
    if (parsed.skipped) {
      state.done[path] = { error: parsed.reason };
      if (!opts.quiet) process.stderr.write(`  ⚠ ${path}: ${parsed.reason}\n`);
      return null;
    }

    state.done[path] = { ok: true };
    if (!opts.quiet) {
      process.stderr.write(
        `  [${idx + 1}/${total}] ${parsed.price} руб · ${parsed.brand} · ${parsed.name.slice(0, 58)}\n`,
      );
    }
    return parsed;
  } catch (e) {
    state.done[path] = { error: e.message };
    if (!opts.quiet) process.stderr.write(`  ✗ ${path}: ${e.message}\n`);
    return null;
  }
}

async function runQueue(urls, opts, state, onItem) {
  let cursor = 0;
  const total = urls.length;

  async function worker(workerId) {
    while (cursor < total) {
      const i = cursor++;
      const path = urls[i];

      if (state.done[path]?.ok && opts.resume) continue;

      const result = await onItem(path, i, total);
      if (result) state.products.push(result);

      // checkpoint каждые 25 товаров — обрыв не теряет много работы
      if ((i + 1) % 25 === 0) saveCheckpoint(join(opts.cache, 'progress.json'), state);

      await sleep(opts.delay + workerId * 10);
    }
  }

  await Promise.all(Array.from({ length: opts.concurrency }, (_, i) => worker(i)));
  saveCheckpoint(join(opts.cache, 'progress.json'), state);
}

function dedupe(products) {
  const byKey = new Map();
  for (const p of products) {
    const key = `${p.category}::${p.slug}`;
    if (!byKey.has(key)) byKey.set(key, p);
  }
  const out = [...byKey.values()];
  out.forEach((p, i) => { p.id = i + 1; });
  return out;
}

/**
 * Приводит разбор страницы к схеме Product из src/lib/types.ts.
 * Убираются только служебные поля: breadcrumbs нужны для дерева разделов,
 * url — для отчётов. sku, descriptionHtml и applicationHtml остаются —
 * они в схеме есть и показываются в карточке.
 */
function toAppSchema(p) {
  const { breadcrumbs, url, skipped, reason, ...rest } = p;
  const out = { ...rest };
  if (!out.sku) delete out.sku;
  if (!out.descriptionHtml) delete out.descriptionHtml;
  if (!out.applicationHtml) delete out.applicationHtml;
  return out;
}

function report(products, categories) {
  const brands = new Map();
  for (const p of products) brands.set(p.brand, (brands.get(p.brand) ?? 0) + 1);

  console.log('\n════ Результат ════');
  console.log(`  разделов:            ${categories.length}`);
  console.log(`  товаров:             ${products.length}`);
  console.log(`  брендов:             ${brands.size}`);
  console.log(`  в наличии:           ${products.filter((p) => p.inStock).length}`);
  console.log(`  под заказ:           ${products.filter((p) => !p.inStock).length}`);
  console.log(`  со скидкой:          ${products.filter((p) => p.oldPrice || p.sale).length}`);
  console.log(`  хиты:                ${products.filter((p) => p.hit).length}`);
  console.log(`  новинки:             ${products.filter((p) => p.isNew).length}`);
  console.log(`  с фото:              ${products.filter((p) => p.images.length).length}`);
  console.log(`  с объёмом:           ${products.filter((p) => p.volume).length}`);
  if (products.length) {
    const prices = products.map((p) => p.price);
    console.log(`  цены:                ${Math.min(...prices)} – ${Math.max(...prices)} руб`);
  }
  const top = [...brands.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  console.log(`  топ брендов:         ${top.map(([b, n]) => `${b} (${n})`).join(', ')}`);
}

/* ================================================================== */

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }

  if (opts.help) {
    console.log(HELP);
    return;
  }

  /* --- Режим отладки парсера на сохранённой странице --- */
  if (opts.html) {
    if (!existsSync(opts.html)) {
      console.error(`✗ Файл не найден: ${opts.html}`);
      process.exit(1);
    }
    const html = readFileSync(opts.html, 'utf8');
    // URL нужен, чтобы отрезать /catalog/ и последний сегмент-слаг.
    // Если его не передали, reconstructируем из имени файла.
    const target =
      opts.pageUrl ??
      `${DEFAULT_BASE}/catalog/${basename(opts.html, '.html').replace(/_/g, '/')}`;
    const parsed = parseProductPage(html, target, DEFAULT_BASE);
    console.log('Разобрано из файла:', opts.html);
    console.log(JSON.stringify(parsed, null, 2));
    if (!parsed || parsed.skipped) {
      console.log('\n⚠ Страница не распознана как товар.');
      console.log('  Проверьте: есть ли application/ld+json с @type Product,');
      console.log('  og:title, <h1>, и цена в формате «N руб».');
      console.log('  При необходимости поправьте селекторы в extractPrices/extractImages.');
    }
    return;
  }

  console.log(`→ Разведка каталога ${opts.base}`);
  let discovery;
  try {
    discovery = await discover(opts);
  } catch (e) {
    const net = /fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ECONNRESET|EPROTO|socket hang up|aborted|certificate|ByteString/i.test(
      String(e?.message ?? e),
    );
    console.error(`\n✗ Разведка не удалась: ${e?.message ?? e}`);
    if (net) {
      console.error(`  Нет связи с ${opts.base}.`);
      console.error('  Проверьте доступ в интернет и что сайт открывается в браузере.');
      console.error(`  Если sitemap известен заранее: --sitemap ${opts.base}/sitemap.xml`);
    }
    console.error('  Разобраться без сети можно так: сохраните страницу карточки в файл');
    console.error('  и запустите  node scripts/scrape-catalog.mjs --html <файл> <url карточки>');
    process.exit(1);
  }
  const { categories, products: productUrls, totalSitemap } = discovery;

  if (!totalSitemap) {
    console.error('\n✗ Из sitemap не удалось прочитать ни одного URL.');
    console.error('  Проверьте адрес: --sitemap <url> и что сайт отдаёт XML, а не страницу ошибки.');
    process.exit(1);
  }

  console.log(`  всего URL в sitemap: ${totalSitemap}`);
  console.log(`  разделов:            ${categories.length}`);
  console.log(`  товаров (листьев):   ${productUrls.length}`);

  if (opts.urlsOnly) {
    mkdirSync(dirname(opts.urlsOnly), { recursive: true });
    writeFileSync(
      opts.urlsOnly,
      [...categories.map((c) => `# section\t${c}`), ...productUrls].join('\n') + '\n',
      'utf8',
    );
    console.log(`\n✓ URL выгружены → ${opts.urlsOnly}`);
    return;
  }

  if (opts.dryRun) {
    console.log('\n--dry-run: страницы товаров не запрашивались.');
    console.log('\nПримеры разделов:');
    categories.slice(0, 8).forEach((c) => console.log(`  ${c}`));
    console.log('\nПримеры товаров:');
    productUrls.slice(0, 8).forEach((p) => console.log(`  ${p}`));
    const est = productUrls.length;
    const mins = (est * (opts.delay + 400)) / 60000 / opts.concurrency;
    console.log(
      `\nОценка времени полного прогона: ~${Math.ceil(mins)} мин ` +
        `(задержка ${opts.delay}мс, параллелизм ${opts.concurrency})`,
    );
    return;
  }

  const targets = filterUrls(productUrls, opts);
  console.log(`\n→ Запрашиваю ${targets.length} страниц товаров…\n`);

  const ckpt = join(opts.cache, 'progress.json');
  const state = opts.resume ? loadCheckpoint(ckpt) : { done: {}, products: [] };
  if (opts.resume) {
    const done = Object.values(state.done).filter((d) => d.ok).length;
    console.log(`  resume: уже обработано ${done}, продолжаю\n`);
  }

  const started = Date.now();
  await runQueue(targets, opts, state, (path, i, total) => scrapeOne(path, opts, state, i, total));

  const failed = Object.entries(state.done).filter(([, v]) => v.error);
  const products = dedupe(state.products.map(toAppSchema));
  const tree = buildCategoryTree(state.products);

  report(products, categories);

  if (failed.length) {
    console.log(`\n  ⚠ с ошибкой: ${failed.length} (подробности в ${ckpt})`);
    const errLog = join(opts.cache, 'errors.log');
    mkdirSync(dirname(errLog), { recursive: true });
    writeFileSync(errLog, failed.map(([u, v]) => `${u}\t${v.error}`).join('\n') + '\n', 'utf8');
    console.log(`    список → ${errLog}`);
    console.log(`    повторить только их: --resume`);
  }

  mkdirSync(opts.out, { recursive: true });
  const prodPath = join(opts.out, 'products.json');
  const catPath = join(opts.out, 'categories.scraped.json');

  // Перезапись products.json необратима — сохраняем прежнюю версию
  if (existsSync(prodPath)) {
    const backup = join(opts.cache, 'products.backup.json');
    mkdirSync(dirname(backup), { recursive: true });
    copyFileSync(prodPath, backup);
    console.log(`\n  прежний products.json → ${backup}`);
  }

  writeFileSync(prodPath, `${JSON.stringify(products, null, 1)}\n`, 'utf8');
  console.log(`\n✓ ${products.length} товаров → ${prodPath}`);

  writeFileSync(catPath, `${JSON.stringify(tree, null, 2)}\n`, 'utf8');
  console.log(`✓ дерево разделов → ${catPath}`);
  console.log('  (слить с categories.json вручную: там есть иконки разделов,');
  console.log('   которых нет в scraped-версии)');

  console.log(`\nВремя: ${((Date.now() - started) / 1000).toFixed(1)} с`);
  console.log('Дальше: npm run build && npm start');
}

/** Запускать main() только когда файл вызван напрямую — иначе его нельзя импортировать в тестах. */
const invokedDirectly = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(entry).href;
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  main().catch((e) => {
    console.error(`\n✗ ${e.stack ?? e.message}`);
    process.exit(1);
  });
}
