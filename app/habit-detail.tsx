"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useRef, useState, useTransition, type CSSProperties } from "react";
import { addDays, formatDay, habitStatus, osloTime, todayStreak, type Kind } from "@/lib/habits";
import { arrived, curtainFrom, ease, gsap, useMotion } from "@/lib/motion";
import { CoilButton } from "./coil-button";
import { PageTurn } from "./page-turn";
import { CellKey, toCells, type Cell } from "./day-cells";
import { WEEKS, type DetailView, type Tap } from "./detail-view";
import { UNDO_S, useTally, type Add, type Remove } from "./use-tally";

export function HabitDetail({
  view,
  today,
  now,
  backHref = "/",
  add,
  remove,
}: {
  view: DetailView;
  today: string;
  now: string; // the Oslo time the server rendered at, for the time field
  backHref?: string;
  add: Add;
  remove: Remove;
}) {
  const { id, name, kind, target } = view;
  const tally = useTally(view, add, remove);
  const { count } = tally;
  const root = useRef<HTMLDivElement>(null);

  const status = habitStatus(kind, count, target);
  const first = view.first ?? (count > 0 ? today : undefined);
  const current = first ? todayStreak(kind, target, count, view.before) : 0;
  const cells = toCells(kind, view.year, count, today, first);

  // Arriving from the dashboard, the year draws in row by row and the hours rise. A page
  // load already painted them from the server, so it shows them as they are.
  useMotion(
    root,
    () => {
      if (!arrived()) return;
      gsap.from(".year__week .cell", { opacity: 0, scale: 0.4, duration: 0.5, delay: 0.5, ease: ease.out, stagger: { each: 0.06, grid: [WEEKS, 7], axis: "x" } });
      // Scaled, not drawn: the strip stretches to its box, so dash lengths wouldn't hold.
      gsap.from(".hours__trace", { scaleY: 0, transformOrigin: "50% 100%", duration: 0.7, delay: 0.6, ease: ease.out, stagger: 0.02 });
    },
    [],
  );

  const shown = useRef(count);
  useMotion(
    root,
    () => {
      if (count === shown.current) return;
      const up = count > shown.current;
      shown.current = count;
      gsap.from(".poster .count__n", { yPercent: up ? 35 : -35, opacity: 0.35, duration: 0.5, ease: ease.out });
      gsap.from(".poster .habit__status", { opacity: 0, duration: 0.35, ease: ease.soft });
    },
    [count],
  );

  return (
    <PageTurn>
      <div ref={root} className="page detail" style={{ "--habit": view.color } as CSSProperties}>
        <header className="masthead">
          <Link
            href={backHref}
            prefetch={false}
            className="trace"
            transitionTypes={["nav-back"]}
            onClick={() => curtainFrom(root.current?.querySelector(".coil"), true)}
          >
            ← Today
          </Link>
          <time dateTime={today}>
            <span className="desk:hidden">{formatDay(today)}</span>
            <span className="hidden desk:inline">{formatDay(today, "long")}</span>
          </time>
        </header>

        <main id="main" tabIndex={-1}>
          <section className="poster" aria-labelledby="habit-name">
            <CoilButton
              habitId={id}
              label={`Add one ${name}`}
              kind={kind}
              target={target}
              count={count}
              busy={tally.pending}
              failed={tally.failed}
              delay={0}
              describedBy={`habit-${id}-today`}
              added={tally.added}
              onFire={tally.fire}
              onUndo={tally.undo}
            />
            <h1 id="habit-name" className="title poster__name">
              {name}
            </h1>
            <p className="poster__kind">
              {kind === "goal" ? "Goal" : "Limit"} · {kind === "goal" ? `${target} a day` : `at most ${target} a day`}
            </p>
            <div className="poster__today" id={`habit-${id}-today`}>
              <p className="count">
                <span className="count__n">{count}</span>
                <span className="count__of">/{target}</span>
              </p>
              <p className="habit__status" data-tone={status.tone}>
                {status.label}
              </p>
            </div>
            {first ? (
              <dl className="facts">
                <div>
                  <dt>current streak</dt>
                  <dd>{current}</dd>
                </div>
                <div>
                  <dt>best streak</dt>
                  <dd>{Math.max(view.best, current)}</dd>
                </div>
                <div>
                  <dt>a day on average</dt>
                  <dd>{view.perDay.toFixed(1)}</dd>
                </div>
              </dl>
            ) : (
              <p className="poster__empty">Nothing logged yet</p>
            )}
            <p className="sr-only" aria-live="polite">
              {tally.said}
            </p>
          </section>

          {first && <Year kind={kind} cells={cells} today={today} day={view.day} />}

          {/* Keyed, so a removal's Undo never follows the list to another day. */}
          <DaySection key={view.day} view={view} today={today} now={now} count={count} change={tally.change} add={add} remove={remove} />

          {first && <Hours hours={view.hours} />}
        </main>

        <footer className="colophon">
          <p>Counts reset at midnight, Oslo time.</p>
        </footer>
      </div>
    </PageTurn>
  );
}

// Three letters each: en-GB's short month for September is "Sept".
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function Year({ kind, cells, today, day }: { kind: Kind; cells: Cell[]; today: string; day: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [picked, pick] = useOptimistic(day);

  const tracked = cells.filter((c) => !c.quiet);
  const summary =
    kind === "goal"
      ? `Last 12 months: ${tracked.filter((c) => c.n > 0).length} days logged, ${tracked.filter((c) => c.state === "met").length} met.`
      : `Last 12 months: ${tracked.length} days tracked, ${tracked.filter((c) => c.state === "over").length} over your limit.`;
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));

  return (
    <section className="year" aria-labelledby="year-title">
      <h2 id="year-title" className="section__title">
        Last 12 months
      </h2>
      {/* A pointer shortcut to the day section; the day stepper is the keyboard path. */}
      <div
        className="year__scroll"
        role="img"
        aria-label={summary}
        tabIndex={0}
        onClick={(e) => {
          const target = (e.target as HTMLElement).dataset.day;
          if (!target || target > today) return;
          startTransition(() => {
            pick(target);
            router.replace(`?day=${target}`, { scroll: false });
          });
        }}
      >
        <div className="year__weeks">
          {weeks.map((week) => {
            const month = week.find((c) => c.day.endsWith("-01"));
            return (
              <div key={week[0].day} className="year__week" data-month={month ? "" : undefined}>
                {month && <span className="year__month">{MONTHS[Number(month.day.slice(5, 7)) - 1]}</span>}
                {week.map((c) => (
                  <span
                    key={c.day}
                    className="cell"
                    data-day={c.day}
                    data-state={c.state}
                    data-rings={c.rings}
                    data-today={c.day === today || undefined}
                    data-picked={c.day === picked || undefined}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <CellKey kind={kind} cells={cells} />
    </section>
  );
}

// A past day: a goal day is over, so it's short rather than still to go.
function dayStatus(kind: Kind, n: number, target: number, past: boolean) {
  if (!past) return habitStatus(kind, n, target).label;
  if (kind === "goal") return n >= target ? "Goal reached" : `${target - n} short`;
  return n <= target ? "Within your limit" : `${n - target} over your limit`;
}

type Row = Tap & { gone?: boolean };

function DaySection({
  view,
  today,
  now,
  count: todayCount,
  change,
  add,
  remove,
}: {
  view: DetailView;
  today: string;
  now: string;
  count: number;
  change: (n: number) => void;
  add: Add;
  remove: Remove;
}) {
  const { id: habitId, kind, day, dayTarget } = view;
  const isToday = day === today;
  const [taps, update] = useOptimistic(view.taps, (rows, a: { drop: number } | { put: Tap }) =>
    "drop" in a ? rows.filter((r) => r.id !== a.drop) : [...rows, a.put],
  );
  const [removed, setRemoved] = useState<Tap | null>(null);
  const [said, setSaid] = useState("");
  // Shown, not only announced: a change that didn't stick has to be visible.
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  // The removed row stays as "Removed 11:02 · Undo" for as long as the coil's Undo would.
  useEffect(() => {
    if (!removed) return;
    const timer = gsap.delayedCall(UNDO_S, () => setRemoved(null));
    return () => void timer.kill();
  }, [removed]);

  const failed = () => setError("Didn't save. Try again.");

  function removeTap(tap: Tap) {
    setRemoved(null);
    setError("");
    setSaid(`Removed the ${tap.time} tap.`);
    startTransition(async () => {
      update({ drop: tap.id });
      if (isToday) change(-1);
      try {
        // Nothing deleted means it was already gone; Undo would add a tap that never existed.
        if (await remove(tap.id)) setRemoved(tap);
        else setSaid(`The ${tap.time} tap was already gone.`);
      } catch {
        failed();
      }
    });
  }

  function undoRemove() {
    if (!removed) return;
    const tap = removed;
    setRemoved(null);
    setError("");
    setSaid(`Put back the ${tap.time} tap.`);
    startTransition(async () => {
      // A session can only add taps by hand, so that's what comes back.
      update({ put: { ...tap, label: null } });
      if (isToday) change(1);
      try {
        if (!(await add(habitId, tap.createdAt))) failed();
      } catch {
        failed();
      }
    });
  }

  async function addAt(form: FormData) {
    const time = String(form.get("time") ?? "");
    if (!/^\d{2}:\d{2}$/.test(time)) return;
    // Compared as Oslo wall times; the database refuses a future time anyway.
    if (`${day}T${time}` > `${today}T${osloTime(Date.now())}`) {
      setError("That time hasn't come yet.");
      return;
    }
    setError("");
    setSaid(`Added one at ${time}.`);
    // A negative id until the server answers: unique as a key, and its Remove stays disabled.
    update({ put: { id: -Date.now(), createdAt: `${day}T${time}`, time, label: null } });
    if (isToday) change(1);
    try {
      if (!(await add(habitId, `${day}T${time}`))) failed();
    } catch {
      failed();
    }
  }

  // Today follows the coil, holds included; another day follows its own list.
  const count = isToday ? todayCount : view.dayCount + taps.length - view.taps.length;
  const rows: Row[] = [...taps, ...(removed ? [{ ...removed, gone: true }] : [])].toSorted((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
  const yesterday = addDays(today, -1);
  const title = isToday ? "Today" : day === yesterday ? "Yesterday" : formatDay(day);
  const quiet = !view.first || day < view.first;

  return (
    <section className="day" aria-labelledby="day-title">
      <div className="day__nav">
        <h2 id="day-title" className="section__title">
          <time dateTime={day}>
            {title}
            {(isToday || day === yesterday) && <span className="day__date">{formatDay(day)}</span>}
          </time>
        </h2>
        <Link href={`?day=${addDays(day, -1)}`} replace scroll={false} prefetch={false} className="day__step trace" aria-label="Previous day">
          ‹
        </Link>
        {isToday ? (
          <span className="day__step" aria-disabled="true" aria-hidden="true">
            ›
          </span>
        ) : (
          <Link href={`?day=${addDays(day, 1)}`} replace scroll={false} prefetch={false} className="day__step trace" aria-label="Next day">
            ›
          </Link>
        )}
      </div>
      <p className="day__count">
        {count} of {dayTarget}
        {!quiet && ` · ${dayStatus(kind, count, dayTarget, !isToday)}`}
      </p>

      {/* Above the list: a limit day can run to 15 rows, and adding is the common case. */}
      <form action={addAt} className="add-at">
        <label htmlFor="add-at-time">Add one at</label>
        <input
          id="add-at-time"
          name="time"
          type="time"
          required
          defaultValue={now}
        />
        <button type="submit" className="button">
          Add
        </button>
      </form>
      {error && (
        <p className="day__error" role="alert">
          {error}
        </p>
      )}

      {rows.length > 0 ? (
        <ul className="taps">
          {rows.map((t) =>
            t.gone ? (
              <li key={`gone-${t.id}`} className="tap" data-gone>
                <span>Removed {t.time} · </span>
                <button type="button" className="undo" onClick={undoRemove}>
                  Undo
                </button>
              </li>
            ) : (
              <li key={t.id} className="tap">
                <time dateTime={t.createdAt} className="tap__time">
                  {t.time}
                </time>
                <span className="tap__source">{t.label ?? "by hand"}</span>
                <button type="button" className="undo" aria-label={`Remove the ${t.time} tap`} disabled={t.id < 0} onClick={() => removeTap(t)}>
                  Remove
                </button>
              </li>
            ),
          )}
        </ul>
      ) : (
        // A habit never logged already says so above.
        view.first && <p className="day__none">No taps this day.</p>
      )}


      <p className="sr-only" aria-live="polite">
        {said}
      </p>
    </section>
  );
}

const hourLabel = (h: number) => String(h).padStart(2, "0");

function Hours({ hours }: { hours: number[] }) {
  const total = hours.reduce((a, b) => a + b, 0);
  const max = Math.max(...hours, 1);
  const busiest = hours.indexOf(Math.max(...hours));
  const label = total
    ? `Taps by hour, last 30 days. Busiest: ${hourLabel(busiest)}:00 to ${hourLabel((busiest + 1) % 24)}:00, ${Math.round((hours[busiest] / total) * 100)}% of ${total}.`
    : "No taps in the last 30 days.";

  return (
    <section className="hours" aria-labelledby="hours-title">
      <h2 id="hours-title" className="section__title">
        Time of day
      </h2>
      <p className="hours__range">Last 30 days</p>
      <svg viewBox="0 0 240 64" preserveAspectRatio="none" className="hours__svg" role="img" aria-label={label}>
        {hours.map((n, h) =>
          n ? (
            <path key={h} className="hours__trace" d={`M${h * 10 + 5} 62V${62 - (n / max) * 58}`} />
          ) : (
            <path key={h} className="hours__none" d={`M${h * 10 + 5} 62h0`} />
          ),
        )}
      </svg>
      <div className="hours__labels" aria-hidden>
        {[0, 6, 12, 18, 24].map((h) => (
          <span key={h}>{hourLabel(h)}</span>
        ))}
      </div>
    </section>
  );
}
