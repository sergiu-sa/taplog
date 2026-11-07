import Link from "next/link";
import type { CSSProperties } from "react";
import { coil } from "@/lib/coil";
import { addDays, formatDay, nextFrom, periodCounts, periodOf, periodTarget, runBefore, targetOn, weekStart, type Kind, type Period } from "@/lib/habits";
import type { Tables } from "@/lib/supabase/types";
import { Footer, NewHabit, type Frame } from "./frame";
import { HabitRow, type HabitView } from "./habit-row";
import { PageTurn } from "./page-turn";
import { Refresh } from "./refresh";
import type { Add, Remove } from "./use-tally";

const WEEKS = 5;

// The shape the dashboard query returns. Fixtures use it too, so the preview goes
// through the same conversion as real data.
export type HabitRecord = Pick<Tables<"habits">, "id" | "name" | "kind" | "period" | "color" | "archived_at" | "spacing_minutes"> & {
  daily_counts: Pick<Tables<"daily_counts">, "day" | "count">[];
  habit_targets: Pick<Tables<"habit_targets">, "from_day" | "target">[];
  stickers?: Pick<Tables<"stickers">, "id" | "label" | "last_tap_at">[];
  logs?: Pick<Tables<"logs">, "created_at">[]; // the newest tap alone, for "Next from"
};

// Each logged day's count, and the first logged day: tracking starts there.
export function countsOf(h: HabitRecord) {
  // View columns are typed nullable, but a group by never yields null here.
  const counts = new Map(h.daily_counts.map((r) => [r.day!, r.count!]));
  return { counts, first: [...counts.keys()].sort()[0] };
}

// Count, target and run are the current period's: today, or this week for a weekly habit.
export function toHabitView(h: HabitRecord, today: string, instant: number): HabitView {
  const kind = h.kind as Kind;
  const period = h.period as Period;
  const { counts, first } = countsOf(h);
  const now = periodOf(period, today);
  const monday = weekStart(today);
  return {
    id: h.id,
    name: h.name,
    kind,
    period,
    target: periodTarget(h.habit_targets, period, now),
    color: h.color,
    count: periodCounts(counts, period).get(now) ?? 0,
    before: runBefore({ kind, period, targets: h.habit_targets, counts }, today, first),
    first,
    spacing: h.spacing_minutes,
    next: nextFrom(h.logs?.[0]?.created_at, h.spacing_minutes, instant),
    days: Array.from({ length: WEEKS * 7 }, (_, i) => {
      const day = addDays(monday, i - 7 * (WEEKS - 1));
      return { day, count: counts.get(day) ?? 0, target: targetOn(h.habit_targets, day) };
    }),
  };
}

export type Shelved = { id: number; name: string };

// Today's habits, and the archived ones by name for the shelf under them.
export function splitHabits(records: HabitRecord[], today: string, now: number) {
  return {
    habits: records.filter((h) => !h.archived_at).map((h) => toHabitView(h, today, now)),
    archived: records.filter((h) => h.archived_at).map(({ id, name }) => ({ id, name })),
  };
}

// Up to three habits sit side by side as before; from four the sheet runs in balanced rows of
// at most four (5 → 3 + 2, 7 → 4 + 3), which the desktop CSS reads from data-cols.
const sheetCols = (n: number) => (n < 4 ? undefined : Math.ceil(n / Math.ceil(n / 4)));

export function Dashboard({
  today,
  habits,
  archived,
  loose,
  habitHref = "/h/",
  stickerHref = "/stickers/",
  newHref = "/habits/new",
  add,
  remove,
  frame,
}: {
  today: string;
  habits: HabitView[];
  archived: Shelved[];
  loose: Shelved[]; // stickers whose habit was deleted: no other page lists them
  habitHref?: string;
  stickerHref?: string;
  newHref?: string;
  add: Add;
  remove: Remove;
  frame: Frame;
}) {
  const cols = sheetCols(habits.length);
  const weekly = habits.some((h) => h.period === "week");
  return (
    <PageTurn>
      <Refresh />
      <div className="page">
        <header className="masthead">
          <Link href="/" prefetch={false} className="trace" aria-current="page">
            taplog
          </Link>
          {/* An empty Today's slot is the way to a first habit, so the header leaves it alone. */}
          {habits.length > 0 && <NewHabit href={newHref} />}
        </header>

        <main id="main" tabIndex={-1}>
          <div className="title-row">
            <h1 className="title">Today</h1>
            <time dateTime={today}>
              <span className="desk:hidden">{formatDay(today)}</span>
              <span className="hidden desk:inline">{formatDay(today, "long")}</span>
            </time>
          </div>
          {habits.length > 0 ? (
            <>
              <div className="habits" data-cols={cols} style={cols ? ({ "--cols": cols } as CSSProperties) : undefined}>
                {habits.map((h, i) => (
                  <HabitRow key={h.id} habit={h} today={today} index={i} href={`${habitHref}${h.id}`} add={add} remove={remove} />
                ))}
              </div>
              {(archived.length > 0 || loose.length > 0) && (
                <div className="shelf">
                  <ShelfLine title="Archived" items={archived} href={habitHref} />
                  <ShelfLine title="Stickers with no habit" items={loose} href={stickerHref} />
                </div>
              )}
            </>
          ) : (
            <div className="empty">
              {archived.length > 0 ? (
                <p>
                  <strong>Nothing on Today</strong>
                  Make a habit, or restore an archived one from its page.
                </p>
              ) : (
                <p>
                  <strong>No habits yet</strong>
                  Make one, then give it a sticker. Every tap winds a turn.
                </p>
              )}
              <Link href={newHref} prefetch={false} className="empty__slot">
                <EmptySlot />
                New habit
              </Link>
              <ShelfLine title="Archived" items={archived} href={habitHref} />
              <ShelfLine title="Stickers with no habit" items={loose} href={stickerHref} />
            </div>
          )}
        </main>

        <Footer {...frame} weekly={weekly} />
      </div>
    </PageTurn>
  );
}

function ShelfLine({ title, items, href }: { title: string; items: Shelved[]; href: string }) {
  if (items.length === 0) return null;
  return (
    <p className="shelf__archived">
      {title}:{" "}
      {items.map((h, i) => (
        <span key={h.id}>
          {i > 0 && ", "}
          <Link href={`${href}${h.id}`} prefetch={false}>
            {h.name}
          </Link>
        </span>
      ))}
    </p>
  );
}

// Where a sticker would sit on the sheet: the die-cut edge with nothing wound inside.
function EmptySlot() {
  return (
    <span className="coil slot" aria-hidden="true">
      <svg viewBox="0 0 100 100" className="coil__svg" focusable="false">
        <path className="slot__edge" d={coil("goal", 0, 0).edgePath} />
        <path className="slot__plus" d="M50 42V58M42 50H58" />
      </svg>
    </span>
  );
}
