/**
 * Очистка HTML описания товара.
 *
 * Описания приходят с сайта-оригинала дословно — менять формулировки нельзя,
 * иначе клиент сверит карточку с сайтом и увидит расхождение. Но вместе с
 * текстом может приехать чужая разметка: скрипты, обработчики событий, iframe,
 * ссылки на внешние страницы. Здесь остаётся только белый список тегов,
 * поэтому вставить в страницу исполняемый код нельзя.
 *
 * Функция вызывается на каждый рендер описания — она должна быть дешёвой
 * и не использовать DOM (работает и на сервере при статической генерации).
 */

/** Разрешённые теги. Всё остальное разворачивается в текст. */
const ALLOWED = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup',
  'ul', 'ol', 'li', 'h3', 'h4', 'h5',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
]);

/** Эти теги удаляются вместе с содержимым, а не разворачиваются в текст. */
const DROP_WITH_CONTENT =
  /<(script|style|iframe|object|embed|svg|math|noscript|template|form|input|button|select|textarea)\b[\s\S]*?(?:<\/\1\s*>|$)/gi;

/** Одиночный тег, который не нужно закрывать */
const VOID_TAGS = new Set(['br']);

/** Домен-оригинал: оттуда берутся и фото товаров, и картинки внутри описаний. */
const SITE_ORIGIN = 'https://sibcirulnik.ru';

const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;

/**
 * <img> из описания сохраняем — в карточках косметики это обычно схема
 * нанесения или палитра. Но только с домена-оригинала, только из /upload/
 * и только атрибутом src: всё остальное (onerror, data-*, внешние счётчики)
 * снимается вместе с прочими атрибутами.
 */
function sanitizeImg(tag: string): string {
  const rawSrc = tag.match(/\ssrc\s*=\s*["']([^"']+)["']/i)?.[1] ?? '';
  if (!rawSrc) return '';
  const path = rawSrc.startsWith('/')
    ? rawSrc
    : `/${rawSrc.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+/, '')}`;
  if (!/^\/upload\//i.test(path)) return '';
  if (/["'<>]/.test(path)) return '';
  return `<img src="${SITE_ORIGIN}${path}" alt="" loading="lazy">`;
}

/**
 * @param html сырой фрагмент описания
 * @returns безопасный HTML из тегов белого списка без посторонних атрибутов
 */
export function sanitizeHtml(html: string | undefined | null): string {
  const src = String(html ?? '');
  if (!src.trim()) return '';

  let out = src
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(DROP_WITH_CONTENT, ' ');

  // <a href> разворачиваем в текст: ссылки из чужого описания не нужны,
  // а пропускать href нельзя — через javascript: выполняется код.
  out = out.replace(/<a\b[^>]*>/gi, '').replace(/<\/a\s*>/gi, '');

  out = out.replace(TAG_RE, (m, slash: string, rawName: string) => {
    const name = rawName.toLowerCase();
    if (name === 'img') return slash ? '' : sanitizeImg(m);
    // Никаких атрибутов: через class/style в страницу можно протащить
    // чужую вёрстку, а тексту описания они не нужны.
    if (!ALLOWED.has(name)) return '';
    if (VOID_TAGS.has(name)) return slash ? '' : `<${name}>`;
    return `<${slash ? '/' : ''}${name}>`;
  });

  // Экранируем «<», который не был тегом (например «5<10» в тексте)
  out = out.replace(/<(?![a-zA-Z/])/g, '&lt;');

  return out
    .replace(/&nbsp;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Только текст, без разметки — для мета-описания и анонса в списке */
export function htmlToText(html: string | undefined | null): string {
  return String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
