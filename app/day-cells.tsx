import { dayState, formatDay, weekStart, type DayState, type Kind } from "@/lib/habits";

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

export type WeekCell = { start: string; n: number; of: number; state: DayState; quiet: boolean; days: { day: string; n: number; quiet: boolean }[] };

// A weekly habit's days, Monday first, as one strip per week in that week's state. `count` is
// the current week's as the page shows it, so today's day takes the difference from the server's.
export function toWeeks(kind: Kind, days: Day[], count: number, today: string, first: string | undefined): WeekCell[] {
  const now = weekStart(today);
  const saved = days.reduce((s, d) => (weekStart(d.day) === now && d.day <= today ? s + d.count : s), 0);
  const weeks: WeekCell[] = [];
  for (let i = 0; i < days.length; i += 7) {
    const row = days.slice(i, i + 7).map((d) => ({ day: d.day, n: d.day === today ? d.count + count - saved : d.count }));
    const n = row.reduce((s, d) => s + d.n, 0);
    // Its Sunday's target (periodTarget).
    const of = days[i + 6].target;
    const state = dayState(kind, of, n, row[0].day, now, first && weekStart(first));
    const quiet = state === "future" || state === "before";
    weeks.push({
      start: row[0].day,
      n,
      of,
      // A limit week within, with taps, is drawn like a goal's part week; with none, like a missed one.
      state: kind === "limit" && state === "met" ? (n > 0 ? "partial" : "missed") : state,
      quiet,
      days: row.map((d) => ({ ...d, quiet: quiet || d.day > today })),
    });
  }
  return weeks;
}

export const weekLabel = (w: WeekCell) => `Week of ${formatDay(w.start, "date")}: ${w.n} of ${w.of}`;

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
const WEEK_KEY: Record<Kind, Key[]> = {
  goal: [
    { label: "Met", state: "met" },
    { label: "Part", state: "partial" },
    { label: "None", state: "missed" },
  ],
  limit: [
    { label: "None", state: "missed" },
    { label: "Within", state: "partial" },
    { label: "Over", state: "over" },
  ],
};

// Names only the states these cells or weeks show.
export function CellKey({ kind, cells, weeks }: { kind: Kind; cells?: Cell[]; weeks?: WeekCell[] }) {
  const seen = new Set(weeks ? weeks.filter((w) => !w.quiet).map((w) => w.state) : cells!.map((c) => (c.rings ? "rings" : c.state)));
  const key = weeks ? WEEK_KEY[kind].filter((k) => seen.has(k.state)) : (kind === "goal" ? GOAL_KEY : LIMIT_KEY).filter((k) => seen.has(k.rings ? "rings" : k.state));
  if (key.length === 0) return null;
  return (
    <ul className="days__key" aria-hidden>
      {key.map(({ label, state, rings }) => (
        <li key={label}>
          <span className={weeks ? "week" : "cell"} data-state={state} data-rings={rings} />
          {label}
        </li>
      ))}
    </ul>
  );
}
