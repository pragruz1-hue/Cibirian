/** Форматирование цены в стиле оригинала: «1 320 руб» */
export function formatPrice(value: number): string {
  return `${value.toLocaleString('ru-RU').replace(/,/g, ' ')} руб`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('ru-RU').replace(/,/g, ' ');
}

/** «товар / товара / товаров» */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

export function productsWord(n: number): string {
  return `${formatNumber(n)} ${plural(n, 'товар', 'товара', 'товаров')}`;
}

export function reviewsWord(n: number): string {
  return plural(n, 'отзыв', 'отзыва', 'отзывов');
}

/** Стабильный псевдослучайный рейтинг/число просмотров по id товара */
export function seededRating(id: number): number {
  const v = ((id * 9301 + 49297) % 233280) / 233280;
  return Math.round((3.6 + v * 1.4) * 10) / 10;
}

export function seededReviews(id: number): number {
  return (id * 7) % 23;
}

export function seededShows(id: number): number {
  return 120 + ((id * 137) % 4800);
}

/** Склонение для строки наличия */
export function stockLabel(inStock: boolean): string {
  return inStock ? 'Есть в наличии' : 'Нет в наличии';
}

export function translitFree(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}
