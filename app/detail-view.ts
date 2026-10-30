import { addDays, bestStreak, formatDay, osloDay, osloHour, osloTime, perDay, runBefore, targetOn, weekStart, type Kind } from "@/lib/habits";
import { countsOf, type HabitRecord } from "./dashboard";
import type { Day } from "./day-cells";

// The habit page's data, shaped on the server (and from fixtures) for the client component.
export const WEEKS = 53;

export type Tap = { id: number; createdAt: string; time: string; label: string | null };
type TapRecord = { id: number; created_at: string; source: string; stickers: { label: string } | null };

export type StickerRow = { id: number; label: string; lastTap: string | null };

// "today 14:02", "yesterday 09:15", or the day: when a sticker was last held to the phone.
export function lastTap(at: string | null, today: string) {
  if (!at) return null;
  const day = osloDay(at);
  if (day === today) return `today\u00a0${osloTime(at)}`;
  if (day === addDays(today, -1)) return `yesterday\u00a0${osloTime(at)}`;
  return formatDay(day);
}

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
  stickers: StickerRow[];
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
    stickers: (h.stickers ?? []).map((s) => ({ id: s.id, label: s.label, lastTap: lastTap(s.last_tap_at, today) })),
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
  stickers: number;
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
    stickers: h.stickers?.length ?? 0,
  };
}

export type HabitChoice = { id: number; name: string; kind: Kind; target: number; color: string };

export type StickerView = {
  id: number;
  label: string;
  taps: number;
  lastTap: string | null;
  habit: (HabitChoice & { archived: boolean }) | null;
  habits: HabitChoice[]; // the active ones it can be moved to
};

type StickerSource = { id: number; label: string; last_tap_at: string | null; habit_id: number | null; taps: number };
type PickSource = Pick<HabitRecord, "id" | "name" | "kind" | "color" | "archived_at" | "habit_targets">;

// `habits` are all the owner's, archived too: the sticker's own habit may be one of them.
export function toStickerView(s: StickerSource, habits: PickSource[], today: string): StickerView {
  const pick = (h: PickSource): HabitChoice => ({ id: h.id, name: h.name, kind: h.kind as Kind, target: targetOn(h.habit_targets, today), color: h.color });
  const own = habits.find((h) => h.id === s.habit_id);
  return {
    id: s.id,
    label: s.label,
    taps: s.taps,
    lastTap: lastTap(s.last_tap_at, today),
    habit: own ? { ...pick(own), archived: own.archived_at !== null } : null,
    habits: habits.filter((h) => !h.archived_at).map(pick),
  };
}
