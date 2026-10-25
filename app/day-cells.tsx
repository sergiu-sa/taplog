import { dayState, type DayState, type Kind } from "@/lib/habits";

export type Day = { day: string; count: number; target: number };
export type Cell = { day: string; n: number; of: number; state: DayState; rings?: number; quiet: boolean };

// Rings: how much of the target a day used, in thirds, drawn like turns of the coil.
const rings = (n: number, target: number) => Math.min(3, Math.ceil((n / target) * 3));

// `count` is today's count as the page shows it, which may be ahead of the server's.
export function toCells(kind: Kind, days: Day[], count: number, today: string, first: string | undefined): Cell[] {
  return days.map(({ day, count: c, target: of }) => {
    const n = day === today ? count : c;
    const state = dayState(kind, of, n, day, today, first);
    // A limit day under target shows how much of it went; a day with none looks like a missed goal.
    const under = kind === "limit" && state === "met";
    return {
      day,
      n,
      of,
      state: under && n === 0 ? "missed" : state,
      rings: state === "partial" || (under && n > 0) ? rings(n, of) : undefined,
      quiet: state === "future" || state === "before",
    };
  });
}

type Key = { label: string; state: DayState; rings?: number };
const GOAL_KEY: Key[] = [
  { label: "Met", state: "met" },
  { label: "Part", state: "partial", rings: 2 },
  { label: "None", state: "missed" },
];
const LIMIT_KEY: Key[] = [
  { label: "None", state: "missed" },
  { label: "Within", state: "met", rings: 2 },
  { label: "Over", state: "over" },
];

// Names only the states these cells show.
export function CellKey({ kind, cells }: { kind: Kind; cells: Cell[] }) {
  const seen = new Set(cells.map((c) => (c.rings ? "rings" : c.state)));
  const key = (kind === "goal" ? GOAL_KEY : LIMIT_KEY).filter((k) => seen.has(k.rings ? "rings" : k.state));
  if (key.length === 0) return null;
  return (
    <ul className="days__key" aria-hidden>
      {key.map(({ label, state, rings }) => (
        <li key={label}>
          <span className="cell" data-state={state} data-rings={rings} />
          {label}
        </li>
      ))}
    </ul>
  );
}
