import type { CSSProperties } from "react";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { addDays, habitStatus, onTrack, osloDay, streak, toneClass, type Kind } from "@/lib/habits";
import { createClient } from "@/lib/supabase/server";
import { AddButton } from "./add-button";

const WEEKS = 5;

// A Server Action is its own POST endpoint, so the page's auth check doesn't cover it.
async function addLog(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data) redirect("/login");

  const habit = formData.get("habit");
  if (typeof habit !== "string") return;
  await supabase.from("logs").insert({ habit_slug: habit, source: "manual" }).throwOnError();
  refresh();
}

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth) redirect("/login");

  // ponytail: loads every logged day per habit. PostgREST caps a response at max_rows
  // (1000 by default); move streaks into SQL before a habit has years of days.
  const { data: habits } = await supabase
    .from("habits")
    .select("slug, name, kind, daily_target, color, daily_counts(day, count)")
    .order("name")
    .throwOnError();

  // Server Components render once per request, so this is just the request time.
  // eslint-disable-next-line react-hooks/purity
  const today = osloDay(Date.now());
  const monday = addDays(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7));
  const days = Array.from({ length: WEEKS * 7 }, (_, i) => addDays(monday, i - 7 * (WEEKS - 1)));

  return (
    <main className="mx-auto max-w-sm px-6 pt-12 pb-16">
      <h1 className="text-2xl font-semibold">Today</h1>

      <div className="mt-6 flex flex-col gap-4">
        {habits.map((h) => {
          const kind = h.kind as Kind;
          // View columns are typed nullable, but a group by never yields null here.
          const counts = new Map(h.daily_counts.map((r) => [r.day!, r.count!]));
          const first = [...counts.keys()].sort()[0];
          const count = counts.get(today) ?? 0;
          const status = habitStatus(kind, count, h.daily_target);
          const run = streak(kind, h.daily_target, counts, today, first);

          const cell = (day: string): { className?: string; style?: CSSProperties } => {
            if (day > today) return {};
            if (!first || day < first) return { className: "border border-neutral-200 dark:border-neutral-800" };
            const c = counts.get(day) ?? 0;
            if (onTrack(kind, c, h.daily_target)) return { style: { backgroundColor: h.color } };
            if (kind === "limit") return { className: "bg-red-500" };
            return c > 0
              ? { style: { backgroundColor: h.color, opacity: 0.35 } }
              : { className: "bg-neutral-200 dark:bg-neutral-800" };
          };

          return (
            <section key={h.slug} className="rounded-3xl bg-neutral-50 p-5 dark:bg-neutral-900/60">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2.5 text-lg font-semibold">
                  <span className="size-3 rounded-full" style={{ backgroundColor: h.color }} />
                  {h.name}
                </h2>
                <p className="text-sm text-neutral-500">{run ? `${run}-day streak` : "No streak"}</p>
              </div>

              <p className={`mt-3 text-5xl font-bold tabular-nums ${toneClass[status.tone]}`}>
                {count}
                <span className="text-2xl font-semibold text-neutral-400"> / {h.daily_target}</span>
              </p>
              <p className={`text-sm font-medium ${toneClass[status.tone]}`}>{status.label}</p>
              <div className="mt-3 h-2 rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(count / Math.max(h.daily_target, 1), 1) * 100}%`,
                    backgroundColor: h.color,
                  }}
                />
              </div>

              <div className="mt-5 grid grid-cols-7 gap-1.5">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <span key={i} aria-hidden className="text-center text-xs text-neutral-400">
                    {d}
                  </span>
                ))}
                {days.map((day) => {
                  const { className = "", style } = cell(day);
                  const label = `${day}: ${counts.get(day) ?? 0}`;
                  return (
                    <div
                      key={day}
                      role="img"
                      aria-label={label}
                      title={label}
                      className={`aspect-square rounded-md ${className}`}
                      style={style}
                    />
                  );
                })}
              </div>

              <form action={addLog} className="mt-5">
                <input type="hidden" name="habit" value={h.slug} />
                <AddButton name={h.name} />
              </form>
            </section>
          );
        })}
      </div>
    </main>
  );
}
