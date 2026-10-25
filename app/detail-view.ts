import { addDays, bestStreak, osloDay, osloHour, osloTime, perDay, runBefore, targetOn, weekStart, type Kind } from "@/lib/habits";
import { countsOf, type HabitRecord } from "./dashboard";
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
  archived: string | null; // the Oslo day it was archived on
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

// The day the stepper or the heatmap asked for: a real date, never after today.
export function pickDay(asked: string | string[] | undefined, today: string) {
  return typeof asked === "string" && /^\d{4}-\d{2}-\d{2}$/.test(asked) && addDays(asked, 0) === asked && asked <= today ? asked : today;
}

// `taps` are the selected day's; `recent` the last 30 days' tap times, for the hours strip.
export function toDetailView(h: HabitRecord, today: string, day: string, taps: TapRecord[], recent: string[]): DetailView {
  const kind = h.kind as Kind;
  const { counts, first } = countsOf(h);
  const archived = h.archived_at && osloDay(h.archived_at);
  // An archived habit's figures stand as they were on its archive day: nothing after was tracked.
  const end = archived && archived < today ? archived : today;
  const start = addDays(weekStart(today), -7 * (WEEKS - 1));
  const hours = Array<number>(24).fill(0);
  for (const t of recent) hours[osloHour(t)]++;
  return {
    id: h.id,
    name: h.name,
    kind,
    color: h.color,
    archived,
    target: targetOn(h.habit_targets, end),
    count: counts.get(end) ?? 0,
    before: runBefore(kind, h.habit_targets, counts, end, first),
    first,
    best: bestStreak(kind, h.habit_targets, counts, end, first),
    perDay: perDay(counts, end, first),
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

export type EditorView = {
  id: number;
  name: string;
  kind: Kind;
  target: number;
  color: string;
  archived: boolean;
  taps: number; // all of them: the kind locks at the first, and Delete says how many go
};

export function toEditorView(h: HabitRecord, today: string): EditorView {
  return {
    id: h.id,
    name: h.name,
    kind: h.kind as Kind,
    target: targetOn(h.habit_targets, today),
    color: h.color,
    archived: h.archived_at !== null,
    taps: h.daily_counts.reduce((n, r) => n + r.count!, 0),
  };
}
