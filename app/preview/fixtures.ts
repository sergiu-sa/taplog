import { addDays } from "@/lib/habits";
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

const habit = (id: number, name: string, kind: string, daily_target: number, color: string, daily_counts: HabitRecord["daily_counts"]) => ({
  id,
  name,
  kind,
  color,
  daily_counts,
  // Like a habit from before target history: one row from today, earlier days take it too.
  habit_targets: [{ from_day: today, target: daily_target }],
});

const water = (todayCount: number) =>
  habit(1, "Water", "goal", 8, "#3B82F6", series("2026-09-10", (i, d) =>
    d === today ? todayCount : d >= "2026-10-09" ? 8 + (wave(i, 1) % 3) : 4 + wave(i, 2) + (i % 3 === 0 ? 2 : 0),
  ));

export const fixtures: Record<string, HabitRecord[]> = {
  // A goal met, a running streak with today unfinished, a limit over target.
  dashboard: [
    habit(3, "Move", "goal", 1, "#22C55E", series("2026-09-28", (i, d) => (d === today || i % 6 !== 3 ? 1 : 0))),
    habit(2, "Smokes", "limit", 10, "#F97316", series("2026-09-10", (i, d) => (d === today ? 12 : 6 + wave(i, 0) + (i % 7 === 2 ? 3 : 0)))),
    water(5),
  ],
  // Early in the day: a habit with nothing logged yet, a limit exactly at target, a goal at 0.
  morning: [
    habit(3, "Move", "goal", 1, "#22C55E", []),
    habit(2, "Smokes", "limit", 10, "#F97316", series("2026-09-10", (i, d) => (d === today ? 10 : 5 + wave(i, 3)))),
    water(0),
  ],
};
