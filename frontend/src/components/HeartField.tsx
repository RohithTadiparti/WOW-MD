import { useId } from 'react';

/**
 * The matrimony home template's field of struck-gold heart outlines.
 *
 * One heart per cell of a jittered grid, so no two ever touch, generated from
 * a fixed seed so the pattern is the same on every load. It sits behind the
 * page and takes no pointer events; text that must stay legible over it sits
 * on a `.plate`.
 */
const COLS = 9;
const ROWS = 12;
const CELL_W = 160;
const CELL_H = 165;

const HEARTS = (() => {
  let seed = 20260918;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const hearts: { x: number; y: number; rotate: number; scale: number }[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      hearts.push({
        x: 40 + col * CELL_W + rand() * 40,
        y: 45 + row * CELL_H + rand() * 45,
        rotate: (rand() - 0.5) * 52,
        scale: 0.46 + rand() * 0.58,
      });
    }
  }
  return hearts;
})();

const stop = (offset: string, token: 'gold' | 'gold-lit' | 'gold-deep') => (
  <stop offset={offset} style={{ stopColor: `rgb(var(--${token}))` }} />
);

export default function HeartField({ className = '' }: { className?: string }) {
  // Ids are per instance: two fields on one page must not share a gradient.
  const id = useId().replace(/:/g, '');
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${COLS * CELL_W} ${ROWS * CELL_H}`}
      preserveAspectRatio="xMidYMin slice"
      className={`pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-50 ${className}`}
    >
      <defs>
        <linearGradient id={`leaf-${id}`} x1="0%" y1="0%" x2="72%" y2="100%">
          {stop('0%', 'gold-deep')}
          {stop('18%', 'gold')}
          {stop('34%', 'gold-lit')}
          {stop('46%', 'gold')}
          {stop('62%', 'gold-deep')}
          {stop('76%', 'gold-lit')}
          {stop('100%', 'gold')}
        </linearGradient>
        <path
          id={`heart-${id}`}
          d="M20 33 C 20 33, 4 23, 4 13 C 4 6, 10 2, 15.5 4 C 18 5, 20 7.4, 20 9.6 C 20 7.4, 22 5, 24.5 4 C 30 2, 36 6, 36 13 C 36 23, 20 33, 20 33 Z"
          fill="none"
          stroke={`url(#leaf-${id})`}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </defs>
      {HEARTS.map((h, i) => (
        <use
          key={i}
          href={`#heart-${id}`}
          transform={`translate(${h.x.toFixed(1)} ${h.y.toFixed(1)}) rotate(${h.rotate.toFixed(1)} 20 18) scale(${h.scale.toFixed(2)})`}
        />
      ))}
    </svg>
  );
}
