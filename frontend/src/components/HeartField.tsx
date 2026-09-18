import { useId } from 'react';
import {
  HEARTS,
  HEART_PATH,
  HEART_STOPS,
  HEART_VIEWBOX_H,
  HEART_VIEWBOX_W,
} from '../lib/heart-field';

/**
 * The matrimony home template's field of struck-gold heart outlines.
 *
 * Mounted once behind the whole app, fixed to the viewport, so every page
 * sits on it; panels and cards cover it with their own white. It takes no
 * pointer events.
 */
export default function HeartField({ fixed = false }: { fixed?: boolean }) {
  // Ids are per instance: two fields on one page must not share a gradient.
  const id = useId().replace(/:/g, '');
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${HEART_VIEWBOX_W} ${HEART_VIEWBOX_H}`}
      preserveAspectRatio="xMidYMin slice"
      className={`pointer-events-none ${fixed ? 'fixed' : 'absolute'} inset-0 -z-10 h-full w-full opacity-50`}
    >
      <defs>
        <linearGradient id={`leaf-${id}`} x1="0%" y1="0%" x2="72%" y2="100%">
          {HEART_STOPS.map(([offset, token]) => (
            <stop key={offset} offset={offset} style={{ stopColor: `rgb(var(--${token}))` }} />
          ))}
        </linearGradient>
        <path
          id={`heart-${id}`}
          d={HEART_PATH}
          fill="none"
          stroke={`url(#leaf-${id})`}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </defs>
      {HEARTS.map((h, i) => (
        <use key={i} href={`#heart-${id}`} transform={h.transform} />
      ))}
    </svg>
  );
}
