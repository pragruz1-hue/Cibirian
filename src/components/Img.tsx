'use client';

import { useState } from 'react';

interface ImgProps {
  src?: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  /** Надпись на плейсхолдере, если фото недоступно */
  fallbackLabel?: string;
}

/**
 * Изображение с хотлинка CDN. next/image здесь не используется намеренно:
 * оптимизация идёт через сервер, а браузер пользователя грузит фото напрямую.
 * При недоступности снимка показывается аккуратный плейсхолдер.
 */
export default function Img({ src, alt, className, width, height, fallbackLabel }: ImgProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    const label = (fallbackLabel ?? alt).replace(/[^\p{L}\p{N} ]/gu, ' ').trim();
    const initials = label
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('');
    return (
      <div
        className={`img-fallback ${className ?? ''}`}
        style={{ width: width ? `${width}px` : undefined, height: height ? `${height}px` : undefined }}
        role="img"
        aria-label={alt}
      >
        <span>{initials || 'SBC'}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
