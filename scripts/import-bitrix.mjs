#!/usr/bin/env node
/**
 * Импорт каталога из выгрузки 1С-Битрикс в src/data/products.json и categories.json.
 *
 * Поддерживаемые форматы:
 *   1. «Коммерческая информация» (XML, ВерсияСхемы 2.02–2.05+) — штатный экспорт
 *      каталога Битрикса: Классификатор + Каталог + ПакетПредложений.
 *   2. CSV с заголовком (экспорт из админки или Excel-прайс).
 *
 * Использование:
 *   node scripts/import-bitrix.mjs <файл.xml|файл.csv> [опции]
 *
 * Опции:
 *   --dry-run            не записывать файлы, только отчёт
 *   --root <slug>        корневой slug каталога (по умолчанию catalog)
 *   --price-type <код>   код типа цены, например BASE (по умолчанию — первая найденная)
 *   --brand-prop <код>   код свойства с брендом, например BRAND или CML2_MANUFACTURER
 *   --volume-prop <код>  код свойства с объёмом, например VOLUME
 *   --merge              не заменять products.json, а долить новые товары
 *   --out <путь>         каталог для результатов (по умолчанию src/data)
 *
 * Пример:
 *   node scripts/import-bitrix.mjs export/catalog.xml --brand-prop BRAND --merge
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

/* ------------------------------------------------------------------ */
/* Аргументы                                                           */
/* ------------------------------------------------------------------ */

function parseArgs(argv) {
  const opts = {
    file: null,
    dryRun: false,
    root: 'catalog',
    priceType: null,
    brandProp: null,
    volumeProp: null,
    merge: false,
    out: join(ROOT, 'src', 'data'),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--dry-run': opts.dryRun = true; break;
      case '--merge': opts.merge = true; break;
      case '--root': opts.root = argv[++i]; break;
      case '--price-type': opts.priceType = argv[++i]; break;
      case '--brand-prop': opts.brandProp = argv[++i]; break;
      case '--volume-prop': opts.volumeProp = argv[++i]; break;
      case '--out': opts.out = resolve(argv[++i]); break;
      case '-h': case '--help': opts.help = true; break;
      default:
        if (a.startsWith('-')) throw new Error(`Неизвестная опция: ${a}`);
        opts.file = resolve(a);
    }
  }
  return opts;
}

/* ------------------------------------------------------------------ */
/* Минимальный XML-парсер (без зависимостей)                           */
/* ------------------------------------------------------------------ */

const ENTITIES = {
  '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&apos;': "'",
};

function decode(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, t) => t)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&[a-zA-Z]+;/g, (m) => ENTITIES[m] ?? m);
}

/**
 * Разбирает XML в дерево { name, attrs, children, text }.
 * Достаточен для выгрузок Битрикса: без DTD, без пространств имён со сложной семантикой.
 */
export function parseXml(src) {
  let i = 0;
  const n = src.length;

  function skipWs() { while (i < n && /\s/.test(src[i])) i++; }

  function parseAttrs() {
    const attrs = {};
    for (;;) {
      skipWs();
      if (i >= n) break;
      const c = src[i];
      if (c === '>' || c === '/' || c === '?') break;
      const eq = src.indexOf('=', i);
      if (eq < 0) break;
      const name = src.slice(i, eq).trim();
      i = eq + 1;
      skipWs();
      const q = src[i];
      if (q !== '"' && q !== "'") break;
      const end = src.indexOf(q, i + 1);
      if (end < 0) break;
      attrs[name] = decode(src.slice(i + 1, end));
      i = end + 1;
    }
    return attrs;
  }

  function parseNode() {
    skipWs();
    if (src.startsWith('<?', i)) {
      const end = src.indexOf('?>', i);
      i = end < 0 ? n : end + 2;
      return null;
    }
    if (src.startsWith('<!--', i)) {
      const end = src.indexOf('-->', i);
      i = end < 0 ? n : end + 3;
      return null;
    }
    if (src.startsWith('<!', i)) {
      const end = src.indexOf('>', i);
      i = end < 0 ? n : end + 1;
      return null;
    }
    if (src[i] !== '<') return null;

    i++; // '<'
    let name = '';
    while (i < n && !/[\s/>]/.test(src[i])) name += src[i++];
    const attrs = parseAttrs();
    skipWs();

    let selfClose = false;
    if (src[i] === '/') { selfClose = true; i++; }
    if (src[i] === '>') i++;

    const node = { name, attrs, children: [], text: '' };
    if (selfClose) return node;

    let text = '';
    for (;;) {
      if (i >= n) break;
      if (src.startsWith('</', i)) {
        const end = src.indexOf('>', i);
        i = end < 0 ? n : end + 1;
        break;
      }
      if (src[i] === '<') {
        const child = parseNode();
        if (child) node.children.push(child);
        else break;
      } else {
        const next = src.indexOf('<', i);
        const chunk = next < 0 ? src.slice(i) : src.slice(i, next);
        text += chunk;
        i = next < 0 ? n : next;
      }
    }
    node.text = decode(text).trim();
    return node;
  }

  let root = null;
  while (i < n && !root) root = parseNode();
  return root;
}

/* ------------------------------------------------------------------ */
/* Доступ к узлам                                                      */
/* ------------------------------------------------------------------ */

function kids(node, name) {
  return node?.children?.filter((c) => c.name === name) ?? [];
}
function kid(node, name) {
  return node?.children?.find((c) => c.name === name) ?? null;
}
function txt(node, name) {
  return kid(node, name)?.text ?? '';
}
function allDesc(node, name, out = []) {
  for (const c of node?.children ?? []) {
    if (c.name === name) out.push(c);
    allDesc(c, name, out);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Транслитерация slug (по правилам Битрикса)                          */
/* ------------------------------------------------------------------ */

const TR = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

export function translit(s) {
  return (s ?? '')
    .toLowerCase()
    .split('')
    .map((c) => (TR[c] !== undefined ? TR[c] : c))
    .join('')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 200);
}

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

export function parseCsv(src, delim = null) {
  const d = delim ?? (src.split('\n')[0].includes(';') ? ';' : ',');
  const rows = [];
  let row = [];
  let field = '';
  let inQ = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQ) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
      continue;
    }
    if (c === '"') { inQ = true; continue; }
    if (c === d) { row.push(field); field = ''; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    if (c === '\r') continue;
    field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }

  const header = (rows.shift() ?? []).map((h) => h.trim());
  return rows
    .filter((r) => r.some((v) => v.trim()))
    .map((r) => Object.fromEntries(header.map((h, idx) => [h, (r[idx] ?? '').trim()])));
}

/* ------------------------------------------------------------------ */
/* Нормализация значений                                               */
/* ------------------------------------------------------------------ */

const TRUTHY = new Set(['true', '1', 'yes', 'y', 'да', 'д', 'в наличии', 'есть']);
const FALSY = new Set(['false', '0', 'no', 'n', 'нет', 'н', 'отсутствует']);

export function toBool(v, fallback = true) {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return fallback;
  if (TRUTHY.has(s)) return true;
  if (FALSY.has(s)) return false;
  return Number(s) > 0;
}

export function toNumber(v) {
  const s = String(v ?? '').replace(/\s+/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * «1000 мл», «500 г», «10 гр» → нормализованный объём как на сайте.
 * Голые числа из свойства «Объём» считаем миллилитрами (defaultUnit).
 */
export function normalizeVolume(v, defaultUnit = 'мл') {
  const raw = String(v ?? '').trim();
  if (!raw) return '';
  // Наборы вида «2×100 мл» к одному числу не сводим — иначе выйдет «2 мл»
  if (/\d\s*[×xх*]\s*\d/i.test(raw)) return raw.replace(/\s+/g, ' ');
  // Обычный и неразрывный пробел — разделители тысяч: «1 000 мл» → 1000.
  // Простое /[\d.,]+/ взяло бы только «1».
  const num = raw
    .match(/\d[\d\s\u00a0]*(?:[.,]\d+)?/)?.[0]
    ?.replace(/[\s\u00a0]/g, '')
    .replace(',', '.');
  if (!num) return raw;
  const n = Number.parseFloat(num);
  if (!Number.isFinite(n)) return raw;
  // Намеренно без toLocaleString: он даёт «1 000» с неразрывным пробелом,
  // а фасет объёма в каталоге один — «1000 мл». Иначе фильтр раздвоится.
  const pretty = String(n);

  // «гр» раньше «г»: иначе короткая альтернатива съест первую букву
  const unit = raw.match(/(мл|ml|гр|г|g|л|l)(?![а-яёa-z])/i)?.[1]?.toLowerCase();
  if (!unit) return `${pretty} ${defaultUnit}`;
  if (['мл', 'ml'].includes(unit)) return `${pretty} мл`;
  if (['г', 'гр', 'g'].includes(unit)) return `${pretty} ${raw.toLowerCase().includes('гр') ? 'гр' : 'г'}`;
  if (['л', 'l'].includes(unit)) return `${pretty} л`;
  return raw;
}

/** Бренд из свойства или из названия (первое слово капсом) */
const KNOWN_BRANDS = [
  'ARAVIA PROFESSIONAL', 'KAARAL PURIFY', 'OLLIN PROFESSIONAL', 'FREZY GRAN’D',
  'OLLIN', 'TEFIA', 'EXITO', 'KAARAL', 'KEBREN', 'CONCEPT', 'NEXXT', 'KONDOR',
  'DOMIX', 'RUNAIL', 'INDIGO', 'ARAVIA', '360',
];

/**
 * Слова, которые в названии означают линейку или свойство, а не бренд.
 * Без этого «Краситель BACO SOFT 10.0 …» дал бы бренд «SOFT».
 */
const LINE_WORDS = new Set([
  'SOFT', 'CARE', 'PURIFY', 'PRO', 'PLUS', 'COLOR', 'COLOUR', 'KERATIN', 'VOLUME',
  'STYLE', 'TOTAL', 'ACTIVE', 'EXTRA', 'SPECIAL', 'PREMIUM', 'SILK', 'BIO', 'ECO',
  'NEW', 'HIT', 'PROFESSIONAL', 'SALON', 'BEAUTY', 'HAIR', 'SKIN', 'SPA', 'ART',
]);

export function guessBrand(name) {
  const upper = ` ${String(name ?? '').toUpperCase()} `;
  const found = KNOWN_BRANDS
    .filter((b) => upper.includes(` ${b} `) || upper.includes(` ${b},`) || upper.includes(` ${b}.`))
    .sort((a, b) => b.length - a.length)[0];
  if (found) return found;

  // Бренд стоит раньше линейки, поэтому берём ПЕРВЫЙ капс-токен, пропуская
  // слова-характеристики. «BACO SOFT» → BACO.
  const tokens = String(name ?? '').split(/[\s,]+/).filter(Boolean);
  const caps = tokens.filter((t) => /^[A-ZА-ЯЁ0-9’']{3,}$/.test(t));
  const meaningful = caps.filter((t) => !LINE_WORDS.has(t.toUpperCase()));
  return meaningful[0] ?? caps[0] ?? 'Без бренда';
}

/**
 * Линия бренда — идущие подряд слова КАПСОМ сразу после названия бренда:
 * «Шампунь … OLLIN SALON BEAUTY 1000мл» → «SALON BEAUTY».
 *
 * Приводить всё название к верхнему регистру нельзя: тогда «для придания
 * объема» станет неотличимо от имени линии и в line уедет пол-названия.
 */
export function guessLine(name, brand) {
  if (!brand || brand === 'Без бренда') return '';
  const raw = String(name ?? '');
  const upperName = raw.toUpperCase();

  // Бренд из свойства часто написан иначе, чем в названии: свойство даёт
  // «OLLIN Professional», а в названии «OLLIN SALON BEAUTY 1000мл».
  // Без запасного якоря линейка терялась бы у всех таких товаров.
  let anchor = String(brand);
  if (!upperName.includes(anchor.toUpperCase())) {
    const spaced = ` ${upperName} `;
    anchor =
      KNOWN_BRANDS.filter((b) => spaced.includes(` ${b} `)).sort((a, b) => b.length - a.length)[0] ?? '';
  }
  if (!anchor) return '';

  const idx = upperName.indexOf(anchor.toUpperCase());
  if (idx < 0) return '';

  const rest = raw.slice(idx + anchor.length).replace(/^[^A-Za-zА-Яа-яЁё0-9]+/, '');
  const m = rest.match(
    /^[A-ZА-ЯЁ0-9][A-ZА-ЯЁ0-9’'&.\-]*(?:[ \-]+[A-ZА-ЯЁ0-9][A-ZА-ЯЁ0-9’'&.\-]*)*/,
  );
  if (!m) return '';

  // Хвостовая фасовка в название линии не входит: «SALON BEAUTY 1000» → «SALON BEAUTY»
  const line = m[0]
    .replace(/(?:^|[\s\-])\d+(?:[.,]\d+)?(?:\s*(?:МЛ|ML|Г|ГР|Л|L))?$/i, '')
    .trim();

  if (line.length < 2) return '';
  // «OLLIN PROFESSIONAL» — это бренд, а не линейка
  if (KNOWN_BRANDS.some((b) => line.toUpperCase().includes(b))) return '';
  return line;
}

/* ------------------------------------------------------------------ */
/* Импорт XML «Коммерческая информация»                                */
/* ------------------------------------------------------------------ */

export function importBitrixXml(src, opts = {}) {
  const root = parseXml(src);
  if (!root) throw new Error('Не удалось разобрать XML');

  // --- Классификатор: дерево групп ---
  const groups = new Map(); // Ид → { name, parentId }
  const classifier = kid(root, 'Классификатор') ?? kid(root, 'Classifier');
  const groupsRoot = classifier ? (kid(classifier, 'Группы') ?? kid(classifier, 'Groups')) : null;

  function walkGroups(node, parentId) {
    for (const g of kids(node, 'Группа').concat(kids(node, 'Group'))) {
      const id = txt(g, 'Ид') || txt(g, 'Id') || g.attrs?.id || '';
      const name = txt(g, 'Наименование') || txt(g, 'Name') || '';
      const code = txt(g, 'Код') || txt(g, 'Code') || txt(g, 'XML_ID') || translit(name);
      if (!id) continue;
      groups.set(id, { id, name, code, parentId });
      const nested = kid(g, 'Группы') ?? kid(g, 'Groups');
      if (nested) walkGroups(nested, id);
    }
  }
  if (groupsRoot) walkGroups(groupsRoot, null);

  // --- Товары ---
  const catalogNode = kid(root, 'Каталог') ?? kid(root, 'Catalog');
  const goodsNodes = [];
  for (const c of allDesc(catalogNode ?? root, 'Товары').concat(allDesc(catalogNode ?? root, 'Products'))) {
    goodsNodes.push(...kids(c, 'Товар'), ...kids(c, 'Product'));
  }

  // --- Предложения (цены и остатки) ---
  const offers = new Map();
  for (const pack of allDesc(root, 'ПакетПредложений').concat(allDesc(root, 'OffersPackage'))) {
    for (const list of kids(pack, 'Предложения').concat(kids(pack, 'Offers'))) {
      for (const o of kids(list, 'Предложение').concat(kids(list, 'Offer'))) {
        const id = txt(o, 'Ид') || txt(o, 'Id');
        if (!id) continue;

        let price = null;
        let oldPrice = null;
        for (const prices of kids(o, 'Цены').concat(kids(o, 'Prices'))) {
          for (const c of kids(prices, 'Цена').concat(kids(prices, 'Price'))) {
            const type = txt(c, 'ИдТипаЦены') || txt(c, 'PriceTypeId') || '';
            const val = toNumber(txt(c, 'ЦенаЗаЕдиницу') || txt(c, 'PricePerUnit'));
            if (val === null) continue;
            const isOld = /старая|old|discount/i.test(type);
            if (isOld) { if (oldPrice === null) oldPrice = val; continue; }
            if (opts.priceType && type && type !== opts.priceType) continue;
            if (price === null) price = val;
          }
        }

        const qtyRaw = txt(o, 'Количество') || txt(o, 'Quantity');
        const qty = qtyRaw === '' ? null : toNumber(qtyRaw);
        offers.set(id, { price, oldPrice, qty });
      }
    }
  }

  // --- Сборка товаров ---
  const products = [];
  const stats = { total: goodsNodes.length, noPrice: 0, skipped: 0 };

  for (const g of goodsNodes) {
    const id = txt(g, 'Ид') || txt(g, 'Id');
    const name = txt(g, 'Наименование') || txt(g, 'Name');
    if (!name) { stats.skipped++; continue; }

    // Свойства
    const props = {};
    for (const vs of kids(g, 'ЗначенияСвойств').concat(kids(g, 'PropertyValues'))) {
      for (const v of kids(vs, 'ЗначенияСвойства').concat(kids(vs, 'PropertyValue'))) {
        const pid = txt(v, 'Ид') || txt(v, 'Id') || '';
        const val = txt(v, 'Значение') || txt(v, 'Value') || '';
        if (pid) props[pid.toUpperCase()] = val;
      }
    }

    const getProp = (...codes) => {
      for (const c of codes) {
        if (!c) continue;
        const v = props[String(c).toUpperCase()];
        if (v) return v;
      }
      return '';
    };

    const active = getProp('CML2_ACTIVE', 'ACTIVE');
    if (active && !toBool(active, true)) { stats.skipped++; continue; }

    const offer = offers.get(id) ?? {};
    const price = offer.price ?? toNumber(getProp('PRICE', 'CML2_PRICE'));
    if (price === null) stats.noPrice++;

    const oldPrice = offer.oldPrice ?? null;
    const qty = offer.qty;

    // Группа → путь раздела
    const groupIds = [];
    for (const gr of kids(g, 'Группы').concat(kids(g, 'Groups'))) {
      // Основной формат Битрикс «Коммерческая информация»: <Группы><Группа>27</Группа></Группы>.
      // Сам <Группы> при этом имеет пустой .text, значение лежит в дочернем узле.
      for (const gi of kids(gr, 'Группа').concat(kids(gr, 'Group'))) if (gi.text) groupIds.push(gi.text);
      for (const gi of kids(gr, 'Ид').concat(kids(gr, 'Id'))) if (gi.text) groupIds.push(gi.text);
      if (!groupIds.length && gr.text) groupIds.push(gr.text);
    }
    const gid = groupIds[0];
    let catPath = '';
    if (gid && groups.has(gid)) {
      const chain = [];
      let cur = groups.get(gid);
      while (cur) {
        chain.unshift(cur.code || translit(cur.name));
        cur = cur.parentId ? groups.get(cur.parentId) : null;
      }
      catPath = chain.join('/');
    }

    const code = txt(g, 'Код') || txt(g, 'Code') || txt(g, 'XML_ID') || translit(name);
    const slug = translit(code) || translit(name);

    const brand = getProp(opts.brandProp, 'BRAND', 'CML2_MANUFACTURER', 'MANUFACTURER', 'БРЕНД')
      || guessBrand(name);
    const volume = normalizeVolume(
      getProp(opts.volumeProp, 'VOLUME', 'OBYOM', 'ОБЪЕМ', 'ОБЪЁМ', 'SIZE'),
    );

    const pictures = kids(g, 'Картинка')
      .concat(kids(g, 'Picture'))
      .concat(kids(g, 'Фото'))
      .map((k) => k.text)
      .filter(Boolean)
      .map((p) => (p.startsWith('http') ? p : `https://sibcirulnik.ru/${p.replace(/^\/+/, '')}`));

    const purpose = getProp('PURPOSE', 'NAZNACHENIE', 'НАЗНАЧЕНИЕ')
      .split(/[,;]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    const hairType = getProp('HAIR_TYPE', 'TIP_VOLOS', 'ТИП ВОЛОС')
      .split(/[,;]/).map((s) => s.trim().toLowerCase()).filter(Boolean);

    products.push({
      externalId: id,
      slug,
      name: name.trim(),
      brand,
      line: guessLine(name, brand),
      category: catPath,
      price: price ?? 0,
      oldPrice: oldPrice && oldPrice > (price ?? 0) ? oldPrice : null,
      volume,
      inStock: qty === null ? true : qty > 0,
      hit: toBool(getProp('HIT', 'BESTSELLER', 'ХИТ'), false),
      recommend: toBool(getProp('RECOMMEND', 'SOVETUEM', 'СОВЕТУЕМ'), false),
      sale: Boolean(oldPrice && oldPrice > (price ?? 0)) || toBool(getProp('SALE', 'АКЦИЯ'), false),
      isNew: toBool(getProp('NEW', 'NOVINKA', 'НОВИНКА'), false),
      purpose,
      hairType,
      images: pictures,
    });
  }

  return { products, groups, stats };
}

/* ------------------------------------------------------------------ */
/* Импорт CSV                                                          */
/* ------------------------------------------------------------------ */

const CSV_ALIASES = {
  name: ['name', 'наименование', 'товар', 'title', 'название'],
  brand: ['brand', 'бренд', 'manufacturer', 'производитель', 'марка'],
  line: ['line', 'линейка', 'series', 'коллекция'],
  category: ['category', 'раздел', 'категория', 'group', 'группа', 'путь'],
  price: ['price', 'цена', 'розничная цена', 'цена розничная'],
  oldPrice: ['oldprice', 'старая цена', 'цена старая', 'old_price', 'скидка от'],
  volume: ['volume', 'объём', 'объем', 'size', 'фасовка'],
  inStock: ['instock', 'наличие', 'остаток', 'quantity', 'кол-во', 'количество'],
  image: ['image', 'фото', 'картинка', 'изображение', 'images'],
  slug: ['slug', 'code', 'код', 'xml_id', 'символьный код', 'url'],
  hit: ['hit', 'хит', 'bestseller'],
  sale: ['sale', 'акция'],
  recommend: ['recommend', 'советуем'],
  isNew: ['new', 'новинка'],
};

function pickField(row, key) {
  const aliases = CSV_ALIASES[key] ?? [key];
  const keys = Object.keys(row);
  for (const a of aliases) {
    const hitKey = keys.find((k) => k.toLowerCase().trim() === a);
    if (hitKey && row[hitKey]) return row[hitKey];
  }
  return '';
}

export function importCsv(src, opts = {}) {
  const rows = parseCsv(src);
  const products = [];
  const stats = { total: rows.length, noPrice: 0, skipped: 0 };

  for (const r of rows) {
    const name = pickField(r, 'name');
    if (!name) { stats.skipped++; continue; }

    const price = toNumber(pickField(r, 'price'));
    if (price === null) stats.noPrice++;
    const oldPrice = toNumber(pickField(r, 'oldPrice'));

    const stockRaw = pickField(r, 'inStock');
    const stockNum = toNumber(stockRaw);
    const inStock = stockRaw === '' ? true : (stockNum !== null ? stockNum > 0 : toBool(stockRaw, true));

    const brand = pickField(r, 'brand') || guessBrand(name);
    const category = (pickField(r, 'category') || '')
      .split(/[>|]/)
      .map((s) => translit(s.trim()))
      .filter(Boolean)
      .join('/');

    const images = (pickField(r, 'image') || '')
      .split(/[;|]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((p) => (p.startsWith('http') ? p : `https://sibcirulnik.ru/${p.replace(/^\/+/, '')}`));

    products.push({
      externalId: pickField(r, 'slug') || '',
      slug: translit(pickField(r, 'slug')) || translit(name),
      name: name.trim(),
      brand,
      line: pickField(r, 'line') || guessLine(name, brand),
      category,
      price: price ?? 0,
      oldPrice: oldPrice && oldPrice > (price ?? 0) ? oldPrice : null,
      volume: normalizeVolume(pickField(r, 'volume')),
      inStock,
      hit: toBool(pickField(r, 'hit'), false),
      recommend: toBool(pickField(r, 'recommend'), false),
      sale: Boolean(oldPrice && oldPrice > (price ?? 0)) || toBool(pickField(r, 'sale'), false),
      isNew: toBool(pickField(r, 'isNew'), false),
      purpose: [],
      hairType: [],
      images,
    });
  }

  return { products, groups: new Map(), stats };
}

/* ------------------------------------------------------------------ */
/* Запись                                                              */
/* ------------------------------------------------------------------ */

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help || !opts.file) {
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8')
      .split('\n').slice(1, 30).join('\n').replace(/^ \* ?/gm, ''));
    process.exit(opts.file ? 0 : 1);
  }

  if (!existsSync(opts.file)) {
    console.error(`✗ Файл не найден: ${opts.file}`);
    process.exit(1);
  }

  const src = readFileSync(opts.file, 'utf8').replace(/^\uFEFF/, '');
  const isXml = /\.xml$/i.test(opts.file) || src.trimStart().startsWith('<');

  console.log(`→ Читаю ${isXml ? 'XML (Коммерческая информация)' : 'CSV'}: ${opts.file}`);
  const { products, groups, stats } = isXml
    ? importBitrixXml(src, opts)
    : importCsv(src, opts);

  // Де-дубликация по slug+category
  const seen = new Map();
  for (const p of products) {
    const key = `${p.category}::${p.slug}`;
    if (!seen.has(key)) seen.set(key, p);
  }
  const unique = [...seen.values()];

  // Проставляем id
  unique.forEach((p, i) => { p.id = i + 1; });

  console.log(`  всего записей:    ${stats.total}`);
  console.log(`  импортировано:    ${unique.length}`);
  console.log(`  пропущено:        ${stats.skipped}`);
  console.log(`  без цены:         ${stats.noPrice}`);
  if (groups.size) console.log(`  разделов в дереве: ${groups.size}`);

  const brands = new Map();
  for (const p of unique) brands.set(p.brand, (brands.get(p.brand) ?? 0) + 1);
  console.log(`  брендов:          ${brands.size}`);
  console.log(`  в наличии:        ${unique.filter((p) => p.inStock).length}`);
  console.log(`  со скидкой:       ${unique.filter((p) => p.oldPrice || p.sale).length}`);
  console.log(`  с фото:           ${unique.filter((p) => p.images.length).length}`);

  const noCat = unique.filter((p) => !p.category).length;
  if (noCat) console.log(`  ⚠ без пути раздела: ${noCat} (проверьте соответствие групп)`);

  const prodPath = join(opts.out, 'products.json');

  let final = unique;
  if (opts.merge && existsSync(prodPath)) {
    const existing = JSON.parse(readFileSync(prodPath, 'utf8'));
    const existingKeys = new Set(existing.map((e) => `${e.category}::${e.slug}`));
    const fresh = unique.filter((p) => !existingKeys.has(`${p.category}::${p.slug}`));
    final = [...existing, ...fresh];
    final.forEach((p, i) => { p.id = i + 1; });
    console.log(`  merge: было ${existing.length}, добавлено ${fresh.length}, стало ${final.length}`);
  }

  if (opts.dryRun) {
    console.log('\n--dry-run: файлы не записаны.');
    console.log('\nПример первых 3 записей:');
    for (const p of final.slice(0, 3)) {
      console.log(`  [${p.id}] ${p.name}`);
      console.log(`      ${p.brand} | ${p.price} руб | ${p.volume || '—'} | ${p.inStock ? 'в наличии' : 'нет'}`);
      console.log(`      ${p.category || '(без раздела)'}`);
    }
    return;
  }

  mkdirSync(opts.out, { recursive: true });
  writeFileSync(prodPath, `${JSON.stringify(final, null, 1)}\n`, 'utf8');
  console.log(`\n✓ Записано ${final.length} товаров → ${prodPath}`);

  // Дерево разделов из Классификатора, если оно есть
  if (groups.size) {
    const catPath = join(opts.out, 'categories.imported.json');
    const nodes = new Map();
    for (const g of groups.values()) {
      nodes.set(g.id, { slug: g.code || translit(g.name), name: g.name, children: [] });
    }
    const roots = [];
    for (const g of groups.values()) {
      const node = nodes.get(g.id);
      if (g.parentId && nodes.has(g.parentId)) nodes.get(g.parentId).children.push(node);
      else roots.push(node);
    }
    const clean = (arr) => arr.map((n) => {
      const out = { slug: n.slug, name: n.name };
      if (n.children.length) out.children = clean(n.children);
      return out;
    });
    writeFileSync(catPath, `${JSON.stringify({ roots: clean(roots) }, null, 2)}\n`, 'utf8');
    console.log(`✓ Дерево разделов → ${catPath} (слить с categories.json вручную)`);
  }

  console.log('\nДальше: npm run build && npm start');
}

// Запуск только когда файл исполняется напрямую, а не импортируется
const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
