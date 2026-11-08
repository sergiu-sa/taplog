import type { CSSProperties } from "react";

// Today's desktop sheet runs in balanced rows: n habits in rows of at most `max`, as even as
// they go (5 → 3 + 2, 7 → 4 + 3).
export const sheetCols = (n: number, max: number) => Math.ceil(n / Math.ceil(n / max));

// The maxima globals.css picks between by width: four up to 1712 px, then one more every 17rem.
export const SHEET_MAX = [4, 5, 6, 7, 8] as const;

export const sheetVars = (n: number) =>
  Object.fromEntries(SHEET_MAX.map((max) => [`--c${max}`, sheetCols(n, max)])) as CSSProperties;
