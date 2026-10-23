"use client";

import { useOptimistic, useRef, useState, useTransition, type CSSProperties } from "react";
import { dayState, formatDay, habitStatus, todayStreak, type DayState, type Kind } from "@/lib/habits";
import { ease, gsap, useMotion } from "@/lib/motion";
import { CoilButton } from "./coil-button";

export type HabitView = {
  id: number;
  name: string;
  kind: Kind;
  target: number;
  color: string;
  count: number;
  before: number; // the streak that ended yesterday
  first?: string;
  days: { day: string; count: number; target: number }[];
};

// Rings: how much of the target a day used, in thirds, drawn like turns of the coil.
const rings = (n: number, target: number) => Math.min(3, Math.ceil((n / target) * 3));

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

export function HabitRow({
  habit,
  today,
  index,
  add,
}: {
  habit: HabitView;
  today: string;
  index: number;
  add: (habitId: number) => Promise<void>;
}) {
  const { id, name, kind, target } = habit;
  const [count, addOne] = useOptimistic(habit.count, (c, n: number) => c + n);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const [said, setSaid] = useState("");
  // A ref, not state: it's set in the same tick as the first log, before React re-renders.
  const busy = useRef(false);
  const row = useRef<HTMLElement>(null);

  const status = habitStatus(kind, count, target);
  const first = habit.first ?? (count > 0 ? today : undefined);
  const streak = first ? todayStreak(kind, target, count, habit.before) : 0;
  const cells = habit.days.map(({ day, count: c, target: of }) => {
    const n = day === today ? count : c;
    const state = dayState(kind, of, n, day, today, first);
    // A limit day under target shows how much of it went; a day with none looks like a missed goal.
    const under = kind === "limit" && state === "met";
    return {
      day,
      n,
      of,
      state: under && n === 0 ? ("missed" as const) : state,
      rings: state === "partial" || (under && n > 0) ? rings(n, of) : undefined,
      quiet: state === "future" || state === "before",
    };
  });
  // The key names only what this grid shows.
  const seen = new Set(cells.map((c) => (c.rings ? "rings" : c.state)));
  const key = (kind === "goal" ? GOAL_KEY : LIMIT_KEY).filter((k) => seen.has(k.rings ? "rings" : k.state));

  function fire() {
    if (busy.current || pending) return;
    busy.current = true;
    setFailed(false);
    setSaid(`${name}, ${count + 1} of ${target}. ${habitStatus(kind, count + 1, target).label}.`);
    startTransition(async () => {
      addOne(1);
      try {
        await add(id);
      } catch {
        setFailed(true);
        setSaid("Didn't save. Try again.");
      } finally {
        busy.current = false;
      }
    });
  }

  const shown = useRef(count);
  useMotion(
    row,
    () => {
      if (count === shown.current) return;
      const up = count > shown.current;
      shown.current = count;
      gsap.from(".count__n", { yPercent: up ? 35 : -35, opacity: 0.35, duration: 0.5, ease: ease.out });
      gsap.from(".habit__status", { opacity: 0, duration: 0.35, ease: ease.soft });
    },
    [count],
  );

  return (
    <section ref={row} className="habit" aria-labelledby={`habit-${id}-name`} style={{ "--habit": habit.color } as CSSProperties}>
      <h2 id={`habit-${id}-name`} className="habit__name">
        {name}
      </h2>

      <p className="habit__streak">
        {!first
          ? "Nothing logged yet"
          : streak
            ? `${streak}-day streak`
            : habit.before
              ? `Streak ended after ${habit.before} ${habit.before === 1 ? "day" : "days"}`
              : "No streak"}
      </p>

      <div className="habit__today" id={`habit-${id}-today`}>
        <p className="count">
          <span className="count__n">{count}</span>
          <span className="count__of">/{target}</span>
        </p>
        <p className="habit__status" data-tone={status.tone}>
          {status.label}
        </p>
      </div>

      <div className="habit__days">
        <div className="days__grid" role="group" aria-label="Last five weeks">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <span key={i} aria-hidden className="days__weekday">
              {d}
            </span>
          ))}
          {cells.map(({ day, n, of, state, rings, quiet }) => (
            <span
              key={day}
              className="cell"
              data-state={state}
              data-rings={rings}
              // Ringed because an unfinished goal day isn't a miss yet.
              data-today={day === today || undefined}
              role={quiet ? undefined : "img"}
              aria-label={quiet ? undefined : `${formatDay(day)}: ${n} of ${of}`}
              aria-hidden={quiet || undefined}
            />
          ))}
        </div>
        {key.length > 0 && (
          <ul className="days__key" aria-hidden>
            {key.map(({ label, state, rings }) => (
              <li key={label}>
                <span className="cell" data-state={state} data-rings={rings} />
                {label}
              </li>
            ))}
          </ul>
        )}
      </div>

      <CoilButton
        label={`Add one ${name}`}
        kind={kind}
        target={target}
        count={count}
        busy={pending}
        failed={failed}
        delay={index * 0.06}
        describedBy={`habit-${id}-today`}
        onFire={fire}
      />

      <p className="sr-only" aria-live="polite">
        {said}
      </p>
    </section>
  );
}
