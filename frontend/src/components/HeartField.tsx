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
      <g fill="none" stroke="rgb(var(--rose-300))" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
        <path d="M16 630 C 82 560, 90 470, 66 380 C 54 332, 66 274, 112 224" strokeWidth="4" />
        <path d="M66 380 C 24 352, 10 322, 8 284 M74 334 C 118 312, 138 280, 148 242" strokeWidth="2.5" />
        <path d="M1424 1420 C 1366 1332, 1372 1238, 1412 1154 C 1436 1102, 1434 1048, 1404 992" strokeWidth="4" />
        <path d="M1398 1184 C 1350 1168, 1324 1134, 1310 1092 M1400 1268 C 1442 1240, 1452 1208, 1454 1172" strokeWidth="2.5" />
      </g>
      <g fill="rgb(var(--rose-200))" opacity="0.78">
        <path d="M34 293 C 6 254, 18 218, 58 222 C 74 252, 66 278, 34 293 Z" />
        <path d="M108 244 C 104 196, 132 174, 164 196 C 160 228, 140 246, 108 244 Z" />
        <path d="M1340 1100 C 1302 1068, 1304 1034, 1338 1022 C 1366 1040, 1368 1070, 1340 1100 Z" />
        <path d="M1402 1202 C 1442 1170, 1470 1184, 1468 1222 C 1440 1240, 1416 1232, 1402 1202 Z" />
      </g>
      {HEARTS.map((h, i) => (
        <use key={i} href={`#heart-${id}`} transform={h.transform} />
      ))}
    </svg>
  );
}
