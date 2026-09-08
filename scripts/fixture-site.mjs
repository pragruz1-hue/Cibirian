/**
 * Локальная копия структуры sibcirulnik.ru для сквозной проверки парсера.
 * Отдаёт robots.txt, индекс sitemap, sitemap каталога и страницы карточек —
 * ровно в той форме, в которой их отдаёт Битрикс/Аспро.
 */
import { createServer } from 'node:http';

/**
 * Адрес сайта-фикстуры определяется из заголовка Host запроса.
 * Жёстко прописывать порт нельзя: сквозной тест поднимает сервер на
 * свободном порту, и тогда robots.txt уводил бы парсер в никуда.
 */
const ROBOTS = (ORIGIN) => `User-Agent: *
Allow: /*
Disallow: *PAGEN_*=
Disallow: /bitrix/
Disallow: /personal/*
Disallow: */search/
Sitemap: ${ORIGIN}/sitemap.xml
`;

/** Разделы и товары, включая мусор, который реально встречается в sitemap */
const SECTIONS = [
  '/catalog/professionalnaya_kosmetika_dlya_volos/',
  '/catalog/professionalnaya_kosmetika_dlya_volos/sredstva_dlya_ukhoda_za_volosami/',
  '/catalog/professionalnaya_kosmetika_dlya_volos/sredstva_dlya_ukhoda_za_volosami/shampuni/',
];

const PRODUCTS = [
  {
    slug: 'shampun_ollin_salon_beauty_1000ml',
    name: 'Шампунь для волос с экстрактом ламинарии OLLIN SALON BEAUTY 1000мл',
    brand: 'OLLIN',
    price: 850,
    old: 1100,
    sku: '773168',
    stock: true,
    stickers: ['Хит'],
    img: 'b9e/ollin_salon_beauty.jpg',
    volume: '1000 мл',
    purpose: 'Увлажнение, Гладкость',
    hair: 'Все типы',
    desc: '<p>Шампунь мягко очищает волосы и кожу головы, обеспечивая деликатный антиоксидантный уход.</p><p><strong>АКТИВНЫЕ КОМПОНЕНТЫ:</strong></p><p>экстракт ламинарии</p><ul><li>подходит для ежедневного применения</li><li>нормализует работу сальных желез</li></ul>',
    apply: 'нанести на влажные волосы. Вспенить легкими массажными движениями. Смыть водой.',
  },
  {
    slug: 'lipidnyy_shampun_ollin_l_p_system_1000ml',
    name: 'Липидный шампунь для волос 1000мл OLLIN PROFESSIONAL L&P SYSTEM',
    brand: 'OLLIN',
    price: 1320,
    old: null,
    sku: '774394',
    stock: true,
    stickers: ['НОВИНКИ'],
    img: '9bf/ollin_l_p_system.jpg',
    volume: '1000 мл',
    purpose: 'Восстановление, Питание',
    hair: 'Сухие, Поврежденные',
    desc: '<p>Новая серия L&amp;P SYSTEM от OLLIN PROFESSIONAL – комплексный уход для глубокого восстановления и питания волос.</p><p>Сбалансированная формула деликатно очищает и обеспечивает глубокое восстановление сухих и сильно поврежденных волос.</p>',
    apply: 'нанести на влажные волосы, деликатно вспенить массажными движениями в течение 1-2 минут. Смыть водой.',
  },
  {
    slug: 'kebren_hydra_therapy_300_ml',
    name: 'KEBREN HYDRA THERAPY 300 мл Шампунь для интенсивного увлажнения волос с трегалозой',
    brand: 'KEBREN',
    price: 770,
    old: null,
    sku: 'KKC2002',
    stock: false,
    stickers: ['Акция', 'Советуем'],
    img: '745/kebren_hydra.jpg',
    volume: '300 мл',
    purpose: 'Увлажнение',
    hair: 'Сухие, Обезвоженные',
    desc: '<p>pH 5.0-5.5. ГЛУБОКОЕ УВЛАЖНЕНИЕ СУХИХ ВОЛОС.</p><p><strong>СОСТАВ:</strong> AQUA, SODIUM LAURETH SULFATE, TREHALOSE.</p>',
    apply: 'Равномерно нанести на влажные волосы и кожу головы. Вспенив, мягко помассировать и смыть водой.',
  },
  {
    slug: 'pudra_kaaral_dlya_obema_60_gr',
    name: 'Пудра Kaaral для объема 60 гр',
    brand: 'KAARAL',
    price: 1320,
    old: null,
    sku: 'K4421',
    stock: true,
    stickers: [],
    img: '7ab/kaaral_powder.jpg',
    volume: '60 гр',
    purpose: 'Объем',
    hair: 'Все типы',
    desc: '<p>Пудра для прикорневого объема фиксирует укладку и сохраняет подвижность пряди.</p>',
    apply: 'нанести на сухие волосы у корней, распределить пальцами.',
  },
  {
    slug: 'krem_vosk_concept_7_v1_100ml',
    name: 'Крем-воск Concept 7 в 1 100мл',
    brand: 'CONCEPT',
    price: 640,
    old: 800,
    sku: 'CT100',
    stock: true,
    stickers: ['Хит', 'Акция'],
    img: '1c2/concept_wax.jpg',
    volume: '100 мл',
    purpose: 'Стайлинг, Фиксация',
    hair: 'Все типы',
    desc: '<p>Крем-воск для укладки с матовым финишем и подвижной фиксацией.</p>',
    apply: 'растереть небольшое количество в ладонях, нанести на сухие или влажные волосы.',
  },
];

/** Мусорные листья из реального sitemap: страницы офисов продаж */
const JUNK = [
  '/catalog/ofis_prodazh_karbolitovskaya_16_a/',
  '/catalog/ofis_prodazh_severo_zapadnaya_5_a/',
];

function productPage(p, path, ORIGIN) {
  const img = `/upload/iblock/${p.img}`;
  const crumbs = [
    'Главная',
    'Каталог',
    'Профессиональная косметика для волос',
    'Средства для ухода за волосами',
    'Шампуни',
    p.name,
  ];
  return `<!DOCTYPE html><html lang="ru"><head>
<meta charset="utf-8"><title>${p.name} — купить | Сибирский цирюльник</title>
<meta property="og:title" content="${p.name}">
<meta property="og:image" content="${ORIGIN}/upload/resize_cache/iblock/${p.img.split('/')[0]}/900_900_1/${p.img.split('/')[1]}">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Product","name":"${p.name.replace(/&/g, '&amp;')}",
 "image":["${ORIGIN}${img}"],"sku":"${p.sku}",
 "brand":{"@type":"Brand","name":"${p.brand}"},
 "offers":{"@type":"Offer","price":"${p.price}","priceCurrency":"RUB",
 "availability":"https://schema.org/${p.stock ? 'InStock' : 'OutOfStock'}"}}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
${crumbs.map((c, i) => ` {"@type":"ListItem","position":${i + 1},"name":"${c}"}`).join(',\n')}]}
</script></head><body>
<div class="item_detail">
  <div class="stickers">${p.stickers.map((s) => `<span class="sticker">${s}</span>`).join('')}</div>
  <div class="detail_images slider">
    <a data-large="${img}"><img src="/upload/resize_cache/iblock/${p.img.split('/')[0]}/300_300_1/${p.img.split('/')[1]}"></a>
    <img src="/upload/resize_cache/iblock/9f9/60_60_1/noimage.png">
  </div>
  <h1>${p.name}</h1>
  <div class="item_price"><span class="price_value">${p.price} руб</span>${p.old ? `<span class="price_old">${p.old} руб</span>` : ''}</div>
  <div class="hidden-artifact">${p.price} rub.</div>
  <div class="item_stock">${p.stock ? 'Есть в наличии' : 'Нет в наличии'}</div>
  <div class="p-rating"><span>Код товара: ${p.sku}</span></div>
  <table class="props characteristics">
    <tr><td>Артикул</td><td>${p.sku}</td></tr>
    <tr><td>Бренд:</td><td>${p.brand}</td></tr>
    <tr><td>Объем</td><td>${p.volume}</td></tr>
    <tr><td>Назначение</td><td>${p.purpose}</td></tr>
    <tr><td>Тип волос</td><td>${p.hair}</td></tr>
    <tr><td>Способ применения</td><td>${p.apply}</td></tr>
  </table>
  <div class="detail_text">${p.desc}<h3>Способ применения</h3><p>${p.apply}</p></div>
  <div class="delivery_info">Доставка по России бесплатно от 3 000 руб</div>
</div>
<div class="related_items"><h2>Похожие товары</h2>
  <div class="item"><a href="/catalog/x/">Другой шампунь</a><span class="price">250 руб</span></div>
  <div class="item"><a href="/catalog/y/">Маска</a><span class="price">120 руб</span></div>
</div>
</body></html>`;
}

const officePage = (title) => `<!DOCTYPE html><html lang="ru"><head><title>${title}</title></head>
<body><h1>${title}</h1><div class="contacts">Телефон: +7 (3842) 00-00-00</div></body></html>`;

const sectionPage = (title) => `<!DOCTYPE html><html lang="ru"><head><title>${title}</title></head>
<body><h1>${title}</h1>${Array.from(
  { length: 14 },
  (_, i) => `<div class="catalog_item"><a href="/catalog/x/p${i}/">Товар ${i}</a><span class="prc">${300 + i * 50} руб</span></div>`,
).join('')}</body></html>`;

const sitemapIndex = (ORIGIN) => `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${ORIGIN}/sitemap-iblock-11.xml</loc><lastmod>2026-07-03</lastmod></sitemap>
</sitemapindex>`;

function sitemapIblock(ORIGIN) {
  const locs = [...SECTIONS, ...JUNK];
  for (const p of PRODUCTS) {
    locs.push(`/catalog/professionalnaya_kosmetika_dlya_volos/sredstva_dlya_ukhoda_za_volosami/shampuni/${p.slug}/`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${locs.map((l) => `  <url><loc>${ORIGIN}${l}</loc></url>`).join('\n')}
</urlset>`;
}

export function createFixtureSite() {
  return createServer((req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  const ORIGIN = `http://${req.headers.host}`;
  const send = (code, body, type = 'text/html; charset=utf-8') => {
    res.writeHead(code, { 'Content-Type': type });
    res.end(body);
  };

  if (path === '/robots.txt') return send(200, ROBOTS(ORIGIN), 'text/plain; charset=utf-8');
  if (path === '/sitemap.xml') return send(200, sitemapIndex(ORIGIN), 'application/xml; charset=utf-8');
  if (path === '/sitemap-iblock-11.xml') return send(200, sitemapIblock(ORIGIN), 'application/xml; charset=utf-8');

  // Пагинация закрыта в robots.txt — парсер не должен сюда ходить.
  // Отдаём 403, чтобы попытка была заметна в отчёте.
  if (/PAGEN_/.test(req.url)) return send(403, 'закрыто robots.txt');
  if (path.startsWith('/bitrix/') || path.startsWith('/personal/')) return send(403, 'закрыто robots.txt');

  if (JUNK.some((j) => j.replace(/\/$/, '') === path)) {
    return send(200, officePage('Офис продаж, ул. Карболитовская 16а'));
  }
  if (SECTIONS.some((s) => s.replace(/\/$/, '') === path)) {
    return send(200, sectionPage('Шампуни — каталог'));
  }
  for (const p of PRODUCTS) {
    if (path.endsWith(`/${p.slug}`) || path.endsWith(`/${p.slug}/`)) {
      return send(200, productPage(p, path, ORIGIN));
    }
  }
    return send(404, 'не найдено');
  });
}

export const fixtureStats = {
  sections: SECTIONS.length,
  products: PRODUCTS.length,
  junk: JUNK.length,
};

// Запуск вручную — чтобы смотреть страницы глазами или отлаживать селекторы:
//   node scripts/fixture-site.mjs
const invokedDirectly =
  process.argv[1] && process.argv[1].endsWith('fixture-site.mjs');

if (invokedDirectly) {
  createFixtureSite().listen(3999, '0.0.0.0', () => {
    console.log('сайт-фикстура на http://127.0.0.1:3999');
    console.log(
      `разделов: ${SECTIONS.length}, товаров: ${PRODUCTS.length}, мусорных листьев: ${JUNK.length}`,
    );
  });
}
