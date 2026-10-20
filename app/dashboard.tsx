import Link from "next/link";
import { addDays, formatDay, runBefore, type Kind } from "@/lib/habits";
import type { Tables } from "@/lib/supabase/types";
import { HabitRow, type HabitView } from "./habit-row";

const WEEKS = 5;

// The shape the dashboard query returns. Fixtures use it too, so the preview goes
// through the same conversion as real data.
export type HabitRecord = Pick<Tables<"habits">, "slug" | "name" | "kind" | "daily_target" | "color"> & {
  daily_counts: Pick<Tables<"daily_counts">, "day" | "count">[];
};

export function toHabitView(h: HabitRecord, today: string): HabitView {
  const kind = h.kind as Kind;
  // View columns are typed nullable, but a group by never yields null here.
  const counts = new Map(h.daily_counts.map((r) => [r.day!, r.count!]));
  const first = [...counts.keys()].sort()[0];
  const monday = addDays(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7));
  return {
    slug: h.slug,
    name: h.name,
    kind,
    target: h.daily_target,
    color: h.color,
    count: counts.get(today) ?? 0,
    before: runBefore(kind, h.daily_target, counts, today, first),
    first,
    days: Array.from({ length: WEEKS * 7 }, (_, i) => {
      const day = addDays(monday, i - 7 * (WEEKS - 1));
      return { day, count: counts.get(day) ?? 0 };
    }),
  };
}

export function Dashboard({
  today,
  habits,
  add,
}: {
  today: string;
  habits: HabitView[];
  add: (slug: string) => Promise<void>;
}) {
  return (
    <div className="page">
      <header className="masthead">
        <Link href="/" prefetch={false} className="trace" aria-current="page">
          taplog
        </Link>
        <time dateTime={today}>
          <span className="desk:hidden">{formatDay(today)}</span>
          <span className="hidden desk:inline">{formatDay(today, "long")}</span>
        </time>
      </header>

      <main id="main" tabIndex={-1}>
        <h1 className="title">Today</h1>
        <div className="habits">
          {habits.map((h, i) => (
            <HabitRow key={h.slug} habit={h} today={today} index={i} add={add} />
          ))}
        </div>
      </main>

      <footer className="colophon">
        <p>Every sticker tap winds one more turn. Hold a coil to add one by hand.</p>
        <p>The outlined day is today. Dots are days before tracking began or still to come.</p>
        <p>Counts reset at midnight, Oslo time.</p>
      </footer>
    </div>
  );
}
