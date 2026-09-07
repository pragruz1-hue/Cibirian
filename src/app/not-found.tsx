import Link from 'next/link';
import { rootCategories } from '@/lib/catalog';

export default function NotFound() {
  return (
    <div className="container page-shell">
      <div className="empty" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '56px 24px' }}>
        <span className="ico">🔍</span>
        <h1 style={{ fontSize: 26, marginBottom: 10 }}>Страница не найдена</h1>
        <p>Неправильно набран адрес или такой страницы не существует.</p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 26 }}>
          <Link href="/" className="btn btn-primary btn-lg">На главную</Link>
          <Link href="/catalog" className="btn btn-outline btn-lg">В каталог</Link>
          <Link href="/search" className="btn btn-outline btn-lg">Поиск</Link>
        </div>

        <div className="section-head" style={{ maxWidth: 720, margin: '0 auto 14px' }}>
          <h2 style={{ fontSize: 15 }}>Разделы каталога</h2>
          <span className="rule" />
        </div>
        <div className="sub-list" style={{ maxWidth: 900, margin: '0 auto' }}>
          {rootCategories.map((r) => (
            <Link key={r.slug} href={`/catalog/${r.slug}`} className="sub-link">
              {r.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
