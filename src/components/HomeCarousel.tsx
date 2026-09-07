'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Img from './Img';

interface Slide {
  brand: string;
  image: string;
}

/** Промо-слайдер брендов на главной: автопрокрутка + ручные стрелки. */
export default function HomeCarousel({ slides }: { slides: Slide[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 4200);
    return () => clearInterval(t);
  }, [paused, slides.length]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const child = el.children[index] as HTMLElement | undefined;
    if (child) el.scrollTo({ left: child.offsetLeft - el.offsetLeft, behavior: 'smooth' });
  }, [index]);

  const step = (dir: 1 | -1) =>
    setIndex((i) => (i + dir + slides.length) % slides.length);

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="brand-strip" ref={trackRef} style={{ scrollBehavior: 'smooth', gap: 14, padding: 0 }}>
        {slides.map((s, i) => (
          <Link
            key={`${s.brand}-${i}`}
            href={`/search?q=${encodeURIComponent(s.brand)}`}
            className="brand-card"
            style={{
              width: 'clamp(240px, 32%, 400px)',
              height: 168,
              flexDirection: 'column',
              gap: 10,
              background: `linear-gradient(150deg,#fff 0%, ${i % 2 ? '#f3f8f7' : '#fdf7ec'} 100%)`,
            }}
          >
            <Img src={s.image} alt={s.brand} fallbackLabel={s.brand} />
            <span style={{ fontSize: 12, letterSpacing: '.12em' }}>{s.brand}</span>
          </Link>
        ))}
      </div>

      <button
        onClick={() => step(-1)}
        aria-label="Предыдущий слайд"
        style={arrowStyle('left')}
      >
        ‹
      </button>
      <button
        onClick={() => step(1)}
        aria-label="Следующий слайд"
        style={arrowStyle('right')}
      >
        ›
      </button>
    </div>
  );
}

function arrowStyle(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute',
    top: '50%',
    [side]: -6,
    transform: 'translateY(-50%)',
    width: 38,
    height: 38,
    borderRadius: '50%',
    border: '1px solid var(--line)',
    background: 'rgba(255,255,255,.94)',
    boxShadow: 'var(--shadow-2)',
    color: 'var(--brand)',
    fontSize: 20,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  } as React.CSSProperties;
}
