"use client";

import Link from "next/link";
import { useRef, type CSSProperties } from "react";
import { formatDay, habitStatus, todayStreak, type Kind } from "@/lib/habits";
import { curtainFrom, ease, gsap, useMotion } from "@/lib/motion";
import { CoilButton } from "./coil-button";
import { CellKey, toCells, type Day } from "./day-cells";
import { useTally, type Add, type Remove } from "./use-tally";

export type HabitView = {
  id: number;
  name: string;
  kind: Kind;
  target: number;
  color: string;
  count: number;
  before: number; // the streak that ended yesterday
  first?: string;
  days: Day[];
};

export function HabitRow({
  habit,
  today,
  index,
  href,
  add,
  remove,
}: {
  habit: HabitView;
  today: string;
  index: number;
  href: string;
  add: Add;
  remove: Remove;
}) {
  const { id, name, kind, target } = habit;
  const tally = useTally(habit, add, remove);
  const { count } = tally;
  const row = useRef<HTMLElement>(null);

  const status = habitStatus(kind, count, target);
  const first = habit.first ?? (count > 0 ? today : undefined);
  const streak = first ? todayStreak(kind, target, count, habit.before) : 0;
  const cells = toCells(kind, habit.days, count, today, first);

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
        <Link
          href={href}
          prefetch={false}
          className="trace"
          transitionTypes={["nav-forward"]}
          onClick={() => curtainFrom(row.current?.querySelector(".coil"))}
        >
          {name}
        </Link>
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
        <CellKey kind={kind} cells={cells} />
      </div>

      <CoilButton
        habitId={id}
        label={`Add one ${name}`}
        kind={kind}
        target={target}
        count={count}
        busy={tally.pending}
        failed={tally.failed}
        delay={index * 0.06}
        describedBy={`habit-${id}-today`}
        added={tally.added}
        onFire={tally.fire}
        onUndo={tally.undo}
      />

      <p className="sr-only" aria-live="polite">
        {tally.said}
      </p>
    </section>
  );
}
