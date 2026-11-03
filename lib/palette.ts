// The habit colours, each a 3:1 trace on both grounds through --trace (globals.css).
// habits_color_check in the database holds the same eight: change both together.
export const PALETTE = [
  { name: "Orange", hex: "#F97316" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Green", hex: "#22C55E" },
  { name: "Teal", hex: "#14B8A6" },
  { name: "Sky", hex: "#0EA5E9" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Violet", hex: "#8B5CF6" },
  { name: "Fuchsia", hex: "#D946EF" },
] as const;

// The page ground (--color-ground in globals.css) for what CSS can't colour: the theme-color
// tags and the manifest. Change both together.
export const GROUND = { light: "#F3F4F1", dark: "#0D0E0D" } as const;

// A new habit starts in the first colour none of the others wear.
export function freeColor(habits: { color: string }[]) {
  return (PALETTE.find((c) => !habits.some((h) => h.color === c.hex)) ?? PALETTE[5]).hex;
}
