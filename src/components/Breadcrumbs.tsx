import Link from 'next/link';
import type { Crumb } from '@/lib/catalog';

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="crumbs" aria-label="Хлебные крошки">
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${c.href}-${i}`} style={{ display: 'flex', gap: 7, alignItems: 'center', minWidth: 0 }}>
            {last ? (
              <span className="cur" title={c.label}>{c.label}</span>
            ) : (
              <Link href={c.href}>{c.label}</Link>
            )}
            {!last && <span className="sep">›</span>}
          </span>
        );
      })}
    </nav>
  );
}
