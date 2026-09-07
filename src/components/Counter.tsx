'use client';

interface CounterProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}

export default function Counter({ value, onChange, min = 1, max = 999 }: CounterProps) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="counter">
      <button type="button" onClick={() => onChange(clamp(value - 1))} aria-label="Уменьшить">
        −
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          onChange(Number.isNaN(n) ? min : clamp(n));
        }}
        aria-label="Количество"
      />
      <button type="button" onClick={() => onChange(clamp(value + 1))} aria-label="Увеличить">
        +
      </button>
    </div>
  );
}
