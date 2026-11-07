import type { CSSProperties } from "react";

// The habit colours. Stored raw (`hex`), which is the trace on the dark ground; `light` is the
// trace on the light ground: the lightest shade at 3.3:1 with the colour's chroma kept, since
// mixing toward black muddied them. palette.test.mjs holds both to 3:1.
// habits_color_check in the database holds the same eight hexes: change both together.
export const PALETTE = [
  { name: "Orange", hex: "#F97316", light: "#db6204" },
  { name: "Amber", hex: "#F59E0B", light: "#ba7601" },
  { name: "Green", hex: "#22C55E", light: "#019944" },
  { name: "Teal", hex: "#14B8A6", light: "#059687" },
  { name: "Sky", hex: "#0EA5E9", light: "#058eca" },
  { name: "Blue", hex: "#3B82F6", light: "#3b82f6" },
  { name: "Violet", hex: "#8B5CF6", light: "#8b5cf6" },
  { name: "Fuchsia", hex: "#D946EF", light: "#d440ea" },
] as const;

// --trace in globals.css reads both, so set them together wherever a habit's colour is set.
export function habitVars(color: string) {
  return { "--habit": color, "--habit-light": PALETTE.find((c) => c.hex === color)?.light ?? color } as CSSProperties;
}

// The page ground (--color-ground in globals.css) for what CSS can't colour: the theme-color
// tags and the manifest. Change both together.
export const GROUND = { light: "#F3F4F1", dark: "#0D0E0D" } as const;

// A new habit starts in the first colour none of the others wear.
export function freeColor(habits: { color: string }[]) {
  return (PALETTE.find((c) => !habits.some((h) => h.color === c.hex)) ?? PALETTE[5]).hex;
}
