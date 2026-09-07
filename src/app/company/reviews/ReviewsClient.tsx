'use client';

import { useState } from 'react';
import { Stars } from '@/components/Rating';
import { useShop } from '@/store/ShopProvider';

interface Review {
  id: number;
  author: string;
  role: string;
  date: string;
  rating: number;
  text: string;
}

/** Демонстрационные отзывы: показывают механику блока, не являются реальными. */
const SEED: Review[] = [
  {
    id: 1,
    author: 'Марина К.',
    role: 'салон «Атмосфера», Новосибирск',
    date: '12 августа 2025',
    rating: 5,
    text: 'Заказываю уход и окрашивание для студии уже не первый раз. Удобно, что наличие видно по складу города — сразу понятно, что успеет прийти к записи клиента. Менеджер помог собрать стартовую закупку под наш поток.',
  },
  {
    id: 2,
    author: 'Ольга П.',
    role: 'частный мастер',
    date: '28 июля 2025',
    rating: 5,
    text: 'Понравился фильтр по назначению и типу волос: быстро нашла средства для повреждённых окрашенных волос в большом объёме, выходит заметно экономичнее, чем маленькие упаковки.',
  },
  {
    id: 3,
    author: 'Ирина В.',
    role: 'барбершоп, Кемерово',
    date: '15 июля 2025',
    rating: 4,
    text: 'Доставка в Кемерово заняла четыре дня, всё пришло целое и в срок. Одной позиции не оказалось в наличии — предложили замену и предупредили заранее, это плюс.',
  },
  {
    id: 4,
    author: 'Дарья Н.',
    role: 'колорист',
    date: '2 июля 2025',
    rating: 5,
    text: 'Отдельное спасибо за консультацию технолога: разбирали схему тонирования блонда, подсказали, как нейтрализовать желтизну. Такое редко встретишь в обычных магазинах.',
  },
  {
    id: 5,
    author: 'Екатерина С.',
    role: 'покупатель',
    date: '21 июня 2025',
    rating: 5,
    text: 'Брала подарочный набор — пришёл в нормальной упаковке, с запасом по срокам. Цена набора ниже, чем если собирать те же средства по отдельности.',
  },
  {
    id: 6,
    author: 'Алексей Р.',
    role: 'салон красоты, Барнаул',
    date: '9 июня 2025',
    rating: 4,
    text: 'Работаем по безналу, документы приходят вовремя. Хотелось бы больше стайлинга в наличии под нашу нагрузку, но по уходу вопросов нет.',
  },
];

export default function ReviewsClient() {
  const { notify } = useShop();
  const [reviews, setReviews] = useState<Review[]>(SEED);
  const [form, setForm] = useState({ author: '', rating: 5, text: '' });
  const [hover, setHover] = useState(0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r: Review = {
      id: Date.now(),
      author: form.author.trim() || 'Гость',
      role: 'покупатель',
      date: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
      rating: form.rating,
      text: form.text.trim(),
    };
    setReviews([r, ...reviews]);
    setForm({ author: '', rating: 5, text: '' });
    notify('Спасибо! Отзыв добавлен (демо-режим, без публикации)');
  };

  return (
    <>
      <div className="card-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1 }}>
              {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)}
            </div>
            <Stars value={reviews.reduce((s, r) => s + r.rating, 0) / reviews.length} size={15} />
          </div>
          <div style={{ color: 'var(--ink-3)', fontSize: 13.5 }}>
            Средняя оценка на основе {reviews.length} демонстрационных отзывов
          </div>
        </div>

        {reviews.map((r) => (
          <div className="review" key={r.id}>
            <div className="review-head">
              <span className="avatar">{r.author[0]}</span>
              <span>
                <b>{r.author}</b>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', fontWeight: 400 }}>{r.role}</span>
              </span>
              <span>{r.date}</span>
            </div>
            <Stars value={r.rating} size={13} />
            <p style={{ marginTop: 7 }}>{r.text}</p>
          </div>
        ))}
      </div>

      <div className="card-panel">
        <h2 style={{ fontSize: 18, marginBottom: 6 }}>Оставить отзыв</h2>
        <p className="panel-sub">Форма работает локально — отзыв появится в списке выше, но никуда не отправится.</p>
        <form onSubmit={submit}>
          <div className="field-row">
            <div className="field">
              <label htmlFor="r-author">Ваше имя *</label>
              <input id="r-author" required value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Как подписать отзыв" />
            </div>
            <div className="field">
              <label>Оценка *</label>
              <div style={{ display: 'flex', gap: 4, fontSize: 26, marginTop: 2 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm({ ...form, rating: n })}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    aria-label={`Оценка ${n}`}
                    style={{
                      background: 'none', border: 'none', padding: 0,
                      color: n <= (hover || form.rating) ? 'var(--accent)' : 'var(--line)',
                      fontSize: 26, lineHeight: 1,
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="field">
            <label htmlFor="r-text">Текст отзыва *</label>
            <textarea id="r-text" required minLength={20} value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              placeholder="Что заказывали, как прошла доставка, понравилось ли средство" />
          </div>
          <button className="btn btn-primary btn-lg" type="submit">Отправить отзыв</button>
        </form>
      </div>
    </>
  );
}
