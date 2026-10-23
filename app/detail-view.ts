import { addDays, bestStreak, osloHour, osloTime, perDay, runBefore, targetOn, weekStart, type Kind } from "@/lib/habits";
import type { HabitRecord } from "./dashboard";
import type { Day } from "./day-cells";

// The habit page's data, shaped on the server (and from fixtures) for the client component.
export const WEEKS = 53;

export type Tap = { id: number; createdAt: string; time: string; label: string | null };
type TapRecord = { id: number; created_at: string; source: string; stickers: { label: string } | null };

export type DetailView = {
  id: number;
  name: string;
  kind: Kind;
  color: string;
  target: number;
  count: number;
  before: number;
  first?: string;
  best: number;
  perDay: number;
  year: Day[];
  day: string;
  dayTarget: number;
  dayCount: number;
  taps: Tap[];
  hours: number[];
};

// `taps` are the selected day's; `recent` the last 30 days' tap times, for the hours strip.
export function toDetailView(h: HabitRecord, today: string, day: string, taps: TapRecord[], recent: string[]): DetailView {
  const kind = h.kind as Kind;
  // View columns are typed nullable, but a group by never yields null here.
  const counts = new Map(h.daily_counts.map((r) => [r.day!, r.count!]));
  const first = [...counts.keys()].sort()[0];
  const start = addDays(weekStart(today), -7 * (WEEKS - 1));
  const hours = Array<number>(24).fill(0);
  for (const t of recent) hours[osloHour(t)]++;
  return {
    id: h.id,
    name: h.name,
    kind,
    color: h.color,
    target: targetOn(h.habit_targets, today),
    count: counts.get(today) ?? 0,
    before: runBefore(kind, h.habit_targets, counts, today, first),
    first,
    best: bestStreak(kind, h.habit_targets, counts, today, first),
    perDay: perDay(counts, today, first),
    year: Array.from({ length: WEEKS * 7 }, (_, i) => {
      const d = addDays(start, i);
      return { day: d, count: counts.get(d) ?? 0, target: targetOn(h.habit_targets, d) };
    }),
    day,
    dayTarget: targetOn(h.habit_targets, day),
    dayCount: counts.get(day) ?? 0,
    taps: taps.map((t) => ({
      id: t.id,
      createdAt: t.created_at,
      time: osloTime(t.created_at),
      // A sticker deleted since leaves its taps without a label.
      label: t.stickers?.label ?? (t.source === "nfc" ? "Sticker" : null),
    })),
    hours,
  };
}
