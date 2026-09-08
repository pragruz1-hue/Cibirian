#!/usr/bin/env node
/**
 * Тесты парсера каталога и общих функций импортёра — без сети и без зависимостей.
 *
 *   npm run test:parser
 *
 * Зачем: если sibcirulnik.ru поменяет вёрстку, вы сначала правите селекторы в
 * scripts/scrape-catalog.mjs, а этим прогоном проверяете, что ничего не сломали.
 * Фикстуры повторяют реальную разметку Битрикс/Аспро: JSON-LD, itemprop,
 * стикеры, галерея с resize_cache, блок «Похожие товары» и текст про доставку.
 */

import {
  parseProductPage,
  classifyUrls,
  buildCategoryTree,
  parseRobots,
  isAllowed,
  cleanHtml,
  extractDescription,
} from './scrape-catalog.mjs';
import { normalizeVolume, toNumber, guessBrand, guessLine, translit } from './import-bitrix.mjs';

const BASE = 'https://sibcirulnik.ru';

/* ------------------------------------------------------------------ */
/* Фикстуры                                                            */
/* ------------------------------------------------------------------ */

/** Полная карточка: JSON-LD, стикеры, галерея, похожие товары, доставка */
const RICH = `<!DOCTYPE html><html lang="ru"><head>
<meta charset="utf-8">
<title>Шампунь OLLIN CARE для придания объема 1000мл — купить в Сибирский цирюльник</title>
<meta property="og:title" content="Шампунь OLLIN CARE для придания объема 1000мл">
<meta property="og:image" content="${BASE}/upload/resize_cache/iblock/b9e/900_900_1/ollin_care_volume_1000.jpg">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Product","name":"Шампунь OLLIN CARE для придания объема 1000мл",
 "image":["${BASE}/upload/iblock/b9e/ollin_care_volume_1000.jpg"],
 "brand":{"@type":"Brand","name":"OLLIN"},"sku":"720105",
 "offers":{"@type":"Offer","price":"850","priceCurrency":"RUB",
           "availability":"https://schema.org/InStock"}}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
 {"@type":"ListItem","position":1,"name":"Главная"},
 {"@type":"ListItem","position":2,"name":"Каталог"},
 {"@type":"ListItem","position":3,"name":"Профессиональная косметика для волос"},
 {"@type":"ListItem","position":4,"name":"Средства для ухода за волосами"},
 {"@type":"ListItem","position":5,"name":"Шампуни"},
 {"@type":"ListItem","position":6,"name":"Шампунь OLLIN CARE для придания объема 1000мл"}]}
</script>
</head><body>
<div class="bx-breadcrumb"><a href="/">Главная</a><a href="/catalog/">Каталог</a></div>
<div class="item_detail">
  <div class="stickers"><span class="sticker hit">Хит</span><span class="sticker new">НОВИНКИ</span></div>
  <div class="detail_images slider">
    <a data-large="/upload/iblock/b9e/ollin_care_volume_1000.jpg"><img src="/upload/resize_cache/iblock/b9e/300_300_1/ollin_care_volume_1000.jpg"></a>
    <a data-large="/upload/iblock/1c2/ollin_care_back.jpg"><img src="/upload/resize_cache/iblock/1c2/300_300_1/ollin_care_back.jpg"></a>
    <img src="/upload/resize_cache/iblock/9f9/60_60_1/noimage.png">
  </div>
  <h1>Шампунь OLLIN CARE для придания объема 1000мл</h1>
  <div class="item_price"><span class="price_value">850 руб</span><span class="price_old">1 100 руб</span></div>
  <div class="hidden-artifact">850 rub.</div>
  <div class="item_stock">Есть в наличии</div>
  <button class="btn">В корзину</button>
  <table class="props characteristics">
    <tr><td>Артикул</td><td>720105</td></tr>
    <tr><td>Бренд:</td><td>OLLIN Professional</td></tr>
    <tr><td>Объем</td><td>1000 мл</td></tr>
    <tr><td>Назначение</td><td>Придание объема, Уплотнение</td></tr>
    <tr><td>Тип волос</td><td>Тонкие, Лишенные объема</td></tr>
  </table>
  <div class="delivery_info">Доставка по России бесплатно от 3 000 руб</div>
  <div class="detail_text">
    <p>Шампунь мягко очищает волосы и кожу головы, обеспечивая деликатный антиоксидантный уход.</p>
    <p>Экстракт ламинарии нормализует работу сальных желез, насыщает волосы влагой и необходимыми микроэлементами, поддерживая естественный гидробаланс. Подходит для всех типов волос.</p>
    <p><strong>АКТИВНЫЕ КОМПОНЕНТЫ:</strong></p>
    <p>экстракт ламинарии</p>
    <p><strong>ПРЕИМУЩЕСТВА/ДЕЙСТВИЕ:</strong></p>
    <ul>
      <li>подходит для ежедневного применения</li>
      <li>мягко очищает волосы и кожу головы</li>
      <li>нормализует работу сальных желез</li>
      <li>обеспечивает интенсивное увлажнение</li>
      <li>придает гладкость и шелковистость</li>
      <li>оказывает антиоксидантное действие</li>
    </ul>
    <img src="/upload/iblock/b9e/ollin_care_scheme.jpg" alt="Схема нанесения">
    <script>console.log('tracker');</script>
    <img src="/upload/iblock/x/pixel.gif" onerror="alert(1)">
    <h3>Способ применения</h3>
    <p>нанести на влажные волосы. Вспенить легкими массажными движениями. Смыть водой.</p>
    <h3>Состав</h3>
    <p>Aqua, Sodium Laureth Sulfate.</p>
  </div>
  <div class="related_items_bottom"><h2>Рекомендуем</h2><span class="price">999 руб</span></div>
</div>
<div class="related_items"><h2>Похожие товары</h2>
  <div class="item"><a href="/catalog/x/">Шампунь другой</a><span class="price">250 руб</span></div>
  <div class="item"><a href="/catalog/y/">Маска</a><span class="price">120 руб</span></div>
</div>
</body></html>`;

/** Без JSON-LD: только h1, itemprop и текст цены. Товар прямо в корне /catalog/ */
const MINIMAL = `<!DOCTYPE html><html lang="ru"><head><title>Пудра Kaaral для объема 60 гр купить</title></head><body>
<div class="catalog_item">
 <h1>Пудра Kaaral для объема 60 гр</h1>
 <img src="/upload/iblock/7ab/kaaral_powder.jpg">
 <div itemprop="offers" itemscope itemtype="https://schema.org/Offer">
   <span itemprop="price" content="1320">1 320 руб</span>
   <meta itemprop="priceCurrency" content="RUB">
   <link itemprop="availability" href="https://schema.org/OutOfStock">
 </div>
 <div class="hidden">1320 rub.</div>
 <div class="stock">Нет в наличии</div>
 <div class="labels"><span>Акция</span><span>Советуем</span></div>
</div>
</body></html>`;

/** Мусор из реального sitemap: страница офиса продаж, не товар */
const OFFICE = `<!DOCTYPE html><html lang="ru"><head>
<title>Офис продаж Карболитовская 16а — Сибирский цирюльник</title></head><body>
<h1>Офис продаж, ул. Карболитовская 16а</h1>
<div class="contacts">Телефон: +7 (3842) 00-00-00, режим работы 9:00–18:00</div>
</body></html>`;

/** Страница раздела: много цен, разметки товара нет */
const LISTING = `<html><body><h1>Шампуни</h1>${Array.from(
  { length: 12 },
  (_, i) => `<div class="catalog_item"><a href="/catalog/x/p${i}/">Шампунь ${i}</a><span class="prc">${300 + i * 50} руб</span></div>`,
).join('')}</body></html>`;

/** Настоящий robots.txt sibcirulnik.ru */
const ROBOTS = `User-Agent: *
Allow: /*
Disallow: *PAGEN_*=
Disallow: /cgi-bin
Disallow: /bitrix/
Disallow: *bitrix_*=
Disallow: /local/
Disallow: /*index.php$
Disallow: /auth/
Disallow: /personal/*
Disallow: */search/
Disallow: */feed
Disallow: */rss
Disallow: /404.php
Disallow: /*clear/apply/
Disallow: /register/
Disallow: /pay/
Disallow: /brands/?SYMBOL=*
Clean-param: sort_order
Sitemap: ${BASE}/sitemap.xml
`;

/** Настоящие пути из sitemap-iblock-11.xml: разделы, товары и мусор вперемешку */
const SITEMAP_PATHS = [
  '/catalog/professionalnaya_kosmetika_dlya_volos/',
  '/catalog/professionalnaya_kosmetika_dlya_volos/sredstva_dlya_ukhoda_za_volosami/',
  '/catalog/professionalnaya_kosmetika_dlya_volos/sredstva_dlya_ukhoda_za_volosami/shampuni/',
  '/catalog/professionalnaya_kosmetika_dlya_volos/sredstva_dlya_ukhoda_za_volosami/shampuni/shampun_ollin_care_dlya_pridaniya_obema_1000ml/',
  '/catalog/krem_vosk_concept_7_v1_100ml/',
  '/catalog/pudra_kaaral_dlya_obema_60_gr/',
  '/catalog/ofis_prodazh_karbolitovskaya_16_a/',
  '/catalog/ofis_prodazh_severo_zapadnaya_5_a/',
];

/* ------------------------------------------------------------------ */
/* Проголосование                                                      */
/* ------------------------------------------------------------------ */

let pass = 0;
let fail = 0;

function chk(name, got, want) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) {
    pass++;
    console.log(`  ✓ ${name}: ${g}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}\n      получено: ${g}\n      ожидалось: ${w}`);
  }
}

const section = (t) => console.log(`\n=== ${t} ===`);

/* --- 1. Полная карточка ------------------------------------------- */
section('1. Полная карточка товара');
const rich = parseProductPage(
  RICH,
  `${BASE}/catalog/professionalnaya_kosmetika_dlya_volos/sredstva_dlya_ukhoda_za_volosami/shampuni/shampun_ollin_care_dlya_pridaniya_obema_1000ml/`,
  BASE,
);
chk('название', rich.name, 'Шампунь OLLIN CARE для придания объема 1000мл');
chk('бренд', rich.brand, 'OLLIN');
chk('цена — 850, а не 120 из «Похожих товаров»', rich.price, 850);
chk('старая цена из price_old', rich.oldPrice, 1100);
chk('скидка', rich.sale, true);
chk('в наличии', rich.inStock, true);
chk('хит', rich.hit, true);
chk('новинка', rich.isNew, true);
chk('«советуем» не проставлен без стикера', rich.recommend, false);
chk('slug', rich.slug, 'shampun_ollin_care_dlya_pridaniya_obema_1000ml');
chk('категория', rich.category, 'professionalnaya_kosmetika_dlya_volos/sredstva_dlya_ukhoda_za_volosami/shampuni');
chk('объём без разделителя тысяч', rich.volume, '1000 мл');
chk('артикул', rich.sku, '720105');
chk('resize_cache → оригинал, noimage отброшен', rich.images, [
  `${BASE}/upload/iblock/b9e/ollin_care_volume_1000.jpg`,
  `${BASE}/upload/iblock/1c2/ollin_care_back.jpg`,
]);
chk('назначение', rich.purpose, ['придание объема', 'уплотнение']);
chk('тип волос', rich.hairType, ['тонкие', 'лишенные объема']);
chk('хлебных крошек', rich.breadcrumbs.length, 6);

/* --- 2. Минимальная карточка --------------------------------------- */
section('2. Карточка без JSON-LD, товар в корне каталога');
const min = parseProductPage(MINIMAL, `${BASE}/catalog/pudra_kaaral_dlya_obema_60_gr/`, BASE);
chk('название из h1', min.name, 'Пудра Kaaral для объема 60 гр');
chk('цена из itemprop', min.price, 1320);
chk('скрытый артефакт «1320 rub.» проигнорирован', min.oldPrice, null);
chk('категория пуста', min.category, '');
chk('нет в наличии', min.inStock, false);
chk('акция из стикера', min.sale, true);
chk('советуем', min.recommend, true);
chk('бренд угадан по названию', min.brand, 'KAARAL');
chk('объём из названия (кириллическая единица)', min.volume, '60 гр');
chk('фото', min.images, [`${BASE}/upload/iblock/7ab/kaaral_powder.jpg`]);

/* --- 3. Мусор и разделы -------------------------------------------- */
section('3. Не-товары из sitemap не должны попасть в каталог');
const office = parseProductPage(OFFICE, `${BASE}/catalog/ofis_prodazh_karbolitovskaya_16_a/`, BASE);
chk('страница офиса помечена на пропуск', office?.skipped, true);
chk('причина', office?.reason, 'нет цены');
const listing = parseProductPage(
  LISTING,
  `${BASE}/catalog/professionalnaya_kosmetika_dlya_volos/shampuni/`,
  BASE,
);
chk('страница раздела отклонена', listing?.skipped, true);

/* --- 4. Общие функции импортёра ------------------------------------ */
section('4. normalizeVolume — общая с импортёром');
chk('1000 мл', normalizeVolume('1000 мл'), '1000 мл');
chk('«1 000 мл» → «1000 мл»', normalizeVolume('1 000 мл'), '1000 мл');
chk('неразрывный пробел', normalizeVolume('1\u00a0000\u00a0мл'), '1000 мл');
chk('60 гр сохраняет «гр»', normalizeVolume('60 гр'), '60 гр');
chk('500 g → г', normalizeVolume('500 g'), '500 г');
chk('«0,5 л» → «0.5 л»', normalizeVolume('0,5 л'), '0.5 л');
chk('голое число считается миллилитрами', normalizeVolume('250'), '250 мл');
chk('набор «2×100 мл» не схлопывается', normalizeVolume('2×100 мл'), '2×100 мл');
chk('пустая строка', normalizeVolume(''), '');
chk('toNumber с пробелами', toNumber('1 320'), 1320);
chk('toNumber мусора', toNumber('по запросу'), null);
chk('guessBrand', guessBrand('Маска KAARAL Purify 500мл'), 'KAARAL PURIFY');

/* --- 5. Классификация URL ------------------------------------------ */
section('5. classifyUrls на реальных путях sitemap');
const cls = classifyUrls(SITEMAP_PATHS, BASE);
chk('разделов', cls.categories.length, 3);
chk('товаров', cls.products.length, 5);
chk('корневой раздел', cls.categories.includes('/catalog/professionalnaya_kosmetika_dlya_volos'), true);
chk('shampuni — раздел, не товар', cls.categories.includes('/catalog/professionalnaya_kosmetika_dlya_volos/sredstva_dlya_ukhoda_za_volosami/shampuni'), true);
chk('лист в корне — товар', cls.products.includes('/catalog/krem_vosk_concept_7_v1_100ml'), true);
chk('глубокий лист — товар', cls.products.includes('/catalog/professionalnaya_kosmetika_dlya_volos/sredstva_dlya_ukhoda_za_volosami/shampuni/shampun_ollin_care_dlya_pridaniya_obema_1000ml'), true);

/* --- 6. Дерево разделов -------------------------------------------- */
section('6. buildCategoryTree из хлебных крошек');
const tree = buildCategoryTree([
  rich,
  { ...min, breadcrumbs: ['Главная', 'Каталог', 'Средства для укладки', 'Пудра Kaaral для объема 60 гр'] },
]);
const flat = [];
(function walk(nodes, d) {
  for (const n of nodes) {
    flat.push(`${'  '.repeat(d)}${n.slug} → ${n.name}`);
    if (n.children) walk(n.children, d + 1);
  }
})(tree.roots, 0);
console.log(flat.map((l) => `  ${l}`).join('\n'));
// Товар с category === '' лежит в корне каталога — отдельного узла не создаёт
chk('корень один: товар в корне каталога узла не добавляет', tree.roots.length, 1);
chk('имя корня из крошек, не из слага', tree.roots.find((r) => r.slug === 'professionalnaya_kosmetika_dlya_volos')?.name, 'Профессиональная косметика для волос');
chk('вложенность shampuni', tree.roots.find((r) => r.slug === 'professionalnaya_kosmetika_dlya_volos')?.children[0]?.children[0]?.slug, 'shampuni');

/* --- 7. robots.txt -------------------------------------------------- */
section('7. robots.txt: правила сайта соблюдаются');
const robots = parseRobots(ROBOTS);
chk('Disallow-правил', robots.rules.disallow.length, 16);
chk('sitemap найден', robots.sitemaps[0], `${BASE}/sitemap.xml`);
chk('карточка товара разрешена', isAllowed('/catalog/krem_vosk_concept_7_v1_100ml/', robots), true);
chk('пагинация PAGEN запрещена', isAllowed('/catalog/x/?PAGEN_1=2', robots), false);
chk('/personal/ запрещён', isAllowed('/personal/cart/', robots), false);
chk('/bitrix/ запрещён', isAllowed('/bitrix/admin/', robots), false);
chk('/search/ запрещён', isAllowed('/catalog/x/search/', robots), false);
chk('index.php$ запрещён', isAllowed('/catalog/index.php', robots), false);
chk('/blog/ разрешён', isAllowed('/blog/', robots), true);

/* --- 8. Бренд и линейка -------------------------------------------- */
section('8. Бренд и линейка угадываются из названия');
const card = (title) =>
  parseProductPage(
    `<html><body><h1>${title}</h1><div class="price_value">850 руб</div></body></html>`,
    `${BASE}/catalog/ukhod/krem_${translit(title).slice(0, 40)}/`,
    BASE,
  );
const cases = [
  ['Шампунь для волос с экстрактом ламинарии OLLIN SALON BEAUTY 1000мл', 'OLLIN', 'SALON BEAUTY'],
  ['Шампунь OLLIN CARE для придания объема 1000мл', 'OLLIN', 'CARE'],
  ['Крем-воск Concept 7 в 1 100мл', 'CONCEPT', ''],
  ['Маска KAARAL PURIFY восстанавливающая 500мл', 'KAARAL PURIFY', ''],
  ['Масло для волос ARAVIA PROFESSIONAL 150 мл', 'ARAVIA PROFESSIONAL', ''],
  // BACO нет в списке известных брендов: берём первый капс-токен, а не «SOFT»
  ['Краситель BACO SOFT 10.0 очень светлый блондин 60мл', 'BACO', 'SOFT'],
];
for (const [title, brand, line] of cases) {
  const c = card(title);
  chk(`бренд: ${title.slice(0, 44)}…`, c.brand, brand);
  chk(`линейка того же товара`, c.line, line);
}

/* --- 8б. Линейка, когда бренд из свойства написан иначе ------------- */
section('8б. guessLine: бренд из свойства ≠ бренд в названии');
// Свойство CML2_MANUFACTURER даёт «OLLIN Professional», в названии «OLLIN SALON BEAUTY»
chk('якорь находится по известным брендам',
  guessLine('Шампунь для волос с экстрактом ламинарии OLLIN SALON BEAUTY 1000мл', 'OLLIN Professional'),
  'SALON BEAUTY');
chk('совпадение без запасного якоря', guessLine('Шампунь OLLIN CARE 1000мл', 'OLLIN'), 'CARE');
chk('неизвестный бренд — пустая линейка', guessLine('Шампунь Ромашка 1000мл', 'OOO Ромашка'), '');
chk('«Без бренда» — пустая линейка', guessLine('Шампунь OLLIN CARE 1000мл', 'Без бренда'), '');

/* --- 8в. Описание карточки — дословно с сайта ----------------------- */
section('8в. Описание берётся с сайта дословно и чистится от постороннего');
chk('формулировка сохранена без изменений',
  rich.descriptionHtml.includes('обеспечивая деликатный антиоксидантный уход'), true);
chk('абзацы остались абзацами', (rich.descriptionHtml.match(/<p>/g) ?? []).length >= 2, true);
chk('список сохранён', rich.descriptionHtml.includes('<li>подходит для ежедневного применения</li>'), true);
chk('жирное начертание сохранено', rich.descriptionHtml.includes('<strong>АКТИВНЫЕ КОМПОНЕНТЫ:</strong>'), true);
chk('скрипт вырезан', /<script|console\.log/i.test(rich.descriptionHtml), false);
chk('обработчик onerror снят', /onerror/i.test(rich.descriptionHtml), false);
chk('относительный src картинки достроен',
  rich.descriptionHtml.includes('src="https://sibcirulnik.ru/upload/iblock/b9e/ollin_care_scheme.jpg"'), true);
chk('блок «Рекомендуем» в описание не попал', /Рекомендуем|999 руб/.test(rich.descriptionHtml), false);
chk('условия доставки в описание не попали', /Доставка по России/.test(rich.descriptionHtml), false);
chk('способ применения вынесен отдельно',
  rich.applicationHtml.includes('нанести на влажные волосы. Вспенить легкими массажными движениями'), true);
chk('в способ применения не попал состав', /Aqua, Sodium/.test(rich.applicationHtml), false);

section('8г. cleanHtml и запасные источники описания');
chk('комментарий и style вырезаются', cleanHtml('<p>Текст</p><!-- коммент --><style>.a{}</style>'), '<p>Текст</p>');
chk('onclick снимается', cleanHtml('<p onclick="evil()">Текст</p>'), '<p>Текст</p>');
chk('обрезанный тег в хвосте не остаётся', cleanHtml('<p>Текст</p><div class="x'), '<p>Текст</p>');
chk('пусто на пустом входе', cleanHtml(''), '');
// Короткая автогенерация из JSON-LD в карточку попасть не должна
chk('короткий текст из JSON-LD отклонён',
  extractDescription('<div></div>', { description: 'Купите shampoo 850 руб в магазине' }, {}).descriptionHtml, '');
chk('длинный текст из JSON-LD принят как запасной',
  extractDescription('<div></div>',
    { description: 'Профессиональный шампунь для объёма деликатно очищает волосы и придаёт стойкий объём у корней на весь день.' }, {})
    .descriptionHtml.startsWith('<p>Профессиональный шампунь'), true);
const escaped = extractDescription('<div></div>',
  { description: 'Опасный <b>текст</b> длиной больше восьмидесяти символов, чтобы пройти порог отсечки автогенерации.' }, {})
  .descriptionHtml;
chk('разметка из запасного текста вырезана, формулировка цела',
  escaped, '<p>Опасный текст длиной больше восьмидесяти символов, чтобы пройти порог отсечки автогенерации.</p>');
chk('видимого мусора вроде «&lt;b>» в карточке не будет', /&lt;/.test(escaped), false);
chk('itemprop="description" тоже читается',
  extractDescription('<div itemprop="description">Текст описания товара прямо из микроразметки схемы.</div>', null, {})
    .descriptionHtml.includes('Текст описания товара прямо из микроразметки'), true);

/* --- 9. Соответствие схеме приложения ------------------------------- */
section('9. Выход парсера совпадает со схемой Product из src/lib/types.ts');
const APP_FIELDS = [
  'id', 'slug', 'name', 'brand', 'line', 'category', 'price', 'oldPrice',
  'volume', 'inStock', 'hit', 'recommend', 'sale', 'isNew',
  'purpose', 'hairType', 'palette', 'images',
  'sku', 'descriptionHtml', 'applicationHtml',
];
const scrapedFields = Object.keys(rich).filter(
  (k) => !['skipped', 'url', 'breadcrumbs'].includes(k),
);
chk('нет лишних полей', scrapedFields.filter((k) => !APP_FIELDS.includes(k)), []);
chk('все обязательные поля на месте', APP_FIELDS.filter((k) => k !== 'id' && !(k in rich)), []);

/* ------------------------------------------------------------------ */
console.log(`\n═══════ ИТОГ: ${pass} пройдено, ${fail} провалено ═══════`);
process.exit(fail ? 1 : 0);
