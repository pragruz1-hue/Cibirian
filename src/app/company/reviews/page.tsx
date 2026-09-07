import type { Metadata } from 'next';
import Breadcrumbs from '@/components/Breadcrumbs';
import ReviewsClient from './ReviewsClient';

export const metadata: Metadata = {
  title: 'Отзывы покупателей',
  description: 'Отзывы мастеров и салонов о профессиональной косметике и работе магазина.',
};

export default function ReviewsPage() {
  return (
    <div className="container page-shell">
      <Breadcrumbs
        items={[
          { label: 'Главная', href: '/' },
          { label: 'Компания', href: '/company' },
          { label: 'Отзывы', href: '/company/reviews' },
        ]}
      />
      <h1 className="page-title">Отзывы</h1>
      <p className="page-lead">
        Отзывы мастеров и салонов о продукции и работе магазина. Ниже — демонстрационные записи,
        показывающие, как выглядит блок отзывов в интерфейсе.
      </p>
      <ReviewsClient />
    </div>
  );
}
