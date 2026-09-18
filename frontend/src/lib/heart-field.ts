/**
 * The matrimony home template's field of struck-gold heart outlines, as data.
 *
 * One heart per cell of a jittered grid, so no two ever touch, generated from
 * a fixed seed so every load and both apps draw the same pattern. Dependency
 * free, which is what lets the mobile app read it from here (mobile/src/shared)
 * rather than keep a copy that drifts.
 */
export const HEART_COLS = 9;
export const HEART_ROWS = 12;
export const HEART_CELL_W = 160;
export const HEART_CELL_H = 165;
export const HEART_VIEWBOX_W = HEART_COLS * HEART_CELL_W;
export const HEART_VIEWBOX_H = HEART_ROWS * HEART_CELL_H;

/** One heart, drawn in a 40×36 box, as the template sets it. */
export const HEART_PATH =
  'M20 33 C 20 33, 4 23, 4 13 C 4 6, 10 2, 15.5 4 C 18 5, 20 7.4, 20 9.6 C 20 7.4, 22 5, 24.5 4 C 30 2, 36 6, 36 13 C 36 23, 20 33, 20 33 Z';

/** The template's gradient stops, by offset and gold token. */
export const HEART_STOPS: [offset: string, token: 'gold' | 'gold-lit' | 'gold-deep'][] = [
  ['0%', 'gold-deep'],
  ['18%', 'gold'],
  ['34%', 'gold-lit'],
  ['46%', 'gold'],
  ['62%', 'gold-deep'],
  ['76%', 'gold-lit'],
  ['100%', 'gold'],
];

export interface Heart {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  /** The SVG transform that places this heart. */
  transform: string;
}

export const HEARTS: Heart[] = (() => {
  let seed = 20260918;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const hearts: Heart[] = [];
  for (let row = 0; row < HEART_ROWS; row++) {
    for (let col = 0; col < HEART_COLS; col++) {
      const x = 40 + col * HEART_CELL_W + rand() * 40;
      const y = 45 + row * HEART_CELL_H + rand() * 45;
      const rotate = (rand() - 0.5) * 52;
      const scale = 0.46 + rand() * 0.58;
      hearts.push({
        x,
        y,
        rotate,
        scale,
        transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotate.toFixed(1)} 20 18) scale(${scale.toFixed(2)})`,
      });
    }
  }
  return hearts;
})();
