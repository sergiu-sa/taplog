import { addDays, weekStart } from "@/lib/habits";
import type { HabitRecord } from "../dashboard";

// Made-up counts for screenshots. A Thursday, so the last grid row has past and future days.
export const today = "2026-10-22";

const wave = (i: number, k: number) => Math.abs(Math.round(Math.sin(i * 1.7 + k) * 3));

function series(from: string, f: (i: number, day: string) => number) {
  const rows = [];
  for (let day = from, i = 0; day <= today; day = addDays(day, 1), i++) {
    const count = f(i, day);
    if (count > 0) rows.push({ day, count });
  }
  return rows;
}

type Targets = HabitRecord["habit_targets"];
const always = (target: number): Targets => [{ from_day: today, target }];

// Taps here are made up like the counts. Front door has no habit, so its page asks which;
// Music stand is on Guitar, archived in `many`.
export const fixtureStickers = [
  { id: 11, habit_id: 1, label: "Water bottle", last_tap_at: `${today}T12:02:00Z`, taps: 212 },
  { id: 12, habit_id: 1, label: "Desk", last_tap_at: null, taps: 0 },
  { id: 13, habit_id: 2, label: "Lighter case", last_tap_at: `${today}T11:40:00Z`, taps: 148 },
  { id: 14, habit_id: 8, label: "Music stand", last_tap_at: "2026-10-12T16:05:00Z", taps: 41 },
  { id: 15, habit_id: null, label: "Front door", last_tap_at: `${today}T06:12:00Z`, taps: 0 },
  { id: 16, habit_id: 3, label: "Gym bag", last_tap_at: "2026-10-21T16:30:00Z", taps: 23 },
];

const habit = (id: number, name: string, kind: string, habit_targets: Targets, color: string, daily_counts: HabitRecord["daily_counts"], archived_at: string | null = null, period = "day") => ({
  id,
  name,
  kind,
  period,
  color,
  archived_at,
  daily_counts,
  habit_targets,
  stickers: fixtureStickers.filter((s) => s.habit_id === id),
});

const water = (todayCount: number) =>
  habit(1, "Water", "goal", always(8), "#3B82F6", series("2026-02-02", (i, d) =>
    d === today ? todayCount : d >= "2026-10-09" ? 8 + (wave(i, 1) % 3) : 4 + wave(i, 2) + (i % 3 === 0 ? 2 : 0),
  ));

// Lowered from 15 to 10 two weeks ago: days before it are scored on 15.
const smokesTargets: Targets = [{ from_day: "2026-09-10", target: 15 }, { from_day: "2026-10-08", target: 10 }];

const monWedFri = (day: string) => [0, 2, 4].some((n) => addDays(weekStart(day), n) === day);
// Mon, Wed, Fri from a Saturday (a short first week); raised to 3 on Wednesday 30 September, so
// that whole week scores on 3; the week of 5 October lost its Friday.
const gym = habit(9, "Gym", "goal", [{ from_day: "2026-09-12", target: 2 }, { from_day: "2026-09-30", target: 3 }], "#8B5CF6",
  series("2026-09-12", (_, d) => (d === "2026-09-12" || (monWedFri(d) && d !== "2026-10-09" && d < today) ? 1 : 0)),
  null, "week");
// At the limit, within, over, a week with none, within, and one so far this week.
const takeaways = ["2026-09-15", "2026-09-19", "2026-09-25", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-16", "2026-10-20"];
const takeaway = habit(10, "Takeaway", "limit", always(2), "#F59E0B", series("2026-09-15", (_, d) => (takeaways.includes(d) ? 1 : 0)), null, "week");

export const fixtures: Record<string, HabitRecord[]> = {
  // A goal met, a running streak with today unfinished, a limit over target.
  dashboard: [
    habit(3, "Move", "goal", always(1), "#22C55E", series("2026-09-28", (i, d) => (d === today || i % 6 !== 3 ? 1 : 0))),
    habit(2, "Smokes", "limit", smokesTargets, "#F97316", series("2026-09-10", (i, d) => (d === today ? 12 : 6 + wave(i, 0) + (i % 7 === 2 ? 3 : 0)))),
    water(5),
  ],
  // Early in the day: a habit with nothing logged yet, a limit exactly at target, a goal at 0.
  morning: [
    habit(3, "Move", "goal", always(1), "#22C55E", []),
    habit(2, "Smokes", "limit", smokesTargets, "#F97316", series("2026-09-10", (i, d) => (d === today ? 10 : 5 + wave(i, 3)))),
    water(0),
  ],
  // A weekly goal and a weekly limit beside a daily goal.
  weekly: [gym, takeaway, water(5)],
  // A first visit: nothing made yet.
  empty: [],
  // Past four on the sheet (4 + 3 on desktop), a name that wraps, and an archived habit.
  many: [
    habit(3, "Move", "goal", always(1), "#22C55E", series("2026-09-28", (i, d) => (d === today || i % 6 !== 3 ? 1 : 0))),
    habit(2, "Smokes", "limit", smokesTargets, "#F97316", series("2026-09-10", (i, d) => (d === today ? 9 : 6 + wave(i, 0)))),
    water(6),
    habit(4, "Floss", "goal", always(1), "#14B8A6", series("2026-10-01", (i, d) => (d === today ? 0 : i % 4 === 1 ? 0 : 1))),
    habit(5, "Read", "goal", always(2), "#8B5CF6", series("2026-09-20", (i, d) => (d === today ? 1 : wave(i, 4) % 3))),
    habit(6, "Stretch", "goal", always(3), "#F59E0B", series("2026-10-12", (i, d) => (d === today ? 3 : 1 + (wave(i, 5) % 3)))),
    habit(7, "Walk the dog", "goal", always(2), "#0EA5E9", series("2026-09-01", (i, d) => (d === today ? 1 : 2 - (i % 5 === 0 ? 1 : 0)))),
    habit(8, "Guitar", "goal", always(1), "#D946EF", series("2026-08-01", (i, d) => (d > "2026-10-12" ? 0 : i % 3 ? 1 : 0)), "2026-10-12T18:20:00Z"),
  ],
};

const stickers: Record<number, string> = { 1: "Water bottle", 2: "Lighter case" };

// A day's taps spread from 07:00 to 22:30, every third by hand. The instant is built as if
// Oslo were always UTC+2, so winter days read an hour early; they stay on their day.
export function fixtureTaps(h: HabitRecord, day: string) {
  const n = h.daily_counts.find((r) => r.day === day)?.count ?? 0;
  const seed = Number(day.slice(8)) + h.id;
  return Array.from({ length: n }, (_, i) => {
    const minutes = 7 * 60 + Math.round(((i + 0.5) * 930) / n) + wave(seed, i) * 7;
    return {
      id: Number(day.replaceAll("-", "")) * 100 + i,
      created_at: new Date(Date.parse(`${day}T00:00:00Z`) + (minutes - 120) * 60_000).toISOString(),
      source: i % 3 === 2 || !stickers[h.id] ? "manual" : "nfc",
      stickers: i % 3 === 2 || !stickers[h.id] ? null : { label: stickers[h.id] },
    };
  });
}

// The last 30 days' tap times, for the hours strip.
export function fixtureRecent(h: HabitRecord) {
  return Array.from({ length: 30 }, (_, i) => fixtureTaps(h, addDays(today, -i)).map((t) => t.created_at)).flat();
}
