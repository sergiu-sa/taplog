import type { CSSProperties } from "react";

// Today's desktop sheet: n habits in the fewest rows of at most `max`, even while there are two
// (5 → 3 + 2, 7 → 4 + 3); from a third, the last row takes what's left (10 → 4 + 4 + 2).
export const sheetCols = (n: number, max: number) => Math.ceil(n / Math.ceil(n / max));

// The maxima globals.css picks between by width: four up to 1712 px, then one more every 17rem.
export const SHEET_MAX = [4, 5, 6, 7, 8] as const;

export const sheetVars = (n: number) =>
  Object.fromEntries(SHEET_MAX.map((max) => [`--c${max}`, sheetCols(n, max)])) as CSSProperties;
