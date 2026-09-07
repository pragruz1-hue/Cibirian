'use client';

import { useState } from 'react';
import Img from './Img';

export default function Gallery({ images, name, brand }: { images: string[]; name: string; brand: string }) {
  const list = images.length ? images : [''];
  const [i, setI] = useState(0);

  return (
    <div>
      <div className="gallery-main">
        <Img src={list[i]} alt={`${name} — фото ${i + 1}`} fallbackLabel={brand} />
      </div>
      {list.length > 1 && (
        <div className="gallery-thumbs">
          {list.map((src, idx) => (
            <button
              key={idx}
              className={idx === i ? 'on' : ''}
              onClick={() => setI(idx)}
              aria-label={`Фото ${idx + 1}`}
              aria-current={idx === i}
            >
              <Img src={src} alt="" fallbackLabel={brand} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
