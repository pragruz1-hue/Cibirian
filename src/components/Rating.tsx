import { seededRating, seededReviews } from '@/lib/format';

export function Stars({ value, size = 12 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span className="stars" style={{ fontSize: size }} aria-label={`Рейтинг ${value} из 5`}>
      {'★'.repeat(full)}
      <span style={{ opacity: 0.28 }}>{'★'.repeat(Math.max(0, 5 - full))}</span>
    </span>
  );
}

export function Rating({ id, showCount = true }: { id: number; showCount?: boolean }) {
  const value = seededRating(id);
  const count = seededReviews(id);
  return (
    <div className="card-rating">
      <Stars value={value} />
      {showCount && <span>{value.toFixed(1)}</span>}
      {showCount && count > 0 && <span>· {count} отзыва</span>}
    </div>
  );
}
