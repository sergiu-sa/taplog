import "server-only";
import { nextFrom, osloDay, periodEnd, periodOf, periodTarget, type Kind, type Period } from "@/lib/habits";
import { supabaseAdmin } from "@/lib/supabase/admin";

// One logged tap as /logged shows it and a silent tap answers it, so the two never disagree.
// Read with the secret key: the caller has checked the signature, or just made the row.
export async function loadLog(id: number, now: number) {
  const { data: log } = await supabaseAdmin
    .from("logs")
    .select("created_at, habit_id, habits(name, kind, period, color, spacing_minutes, habit_targets(from_day, target))")
    .eq("id", id)
    .maybeSingle()
    .throwOnError();
  if (!log) return null;

  const habit = log.habits;
  const kind = habit.kind as Kind;
  const period = habit.period as Period;
  const start = periodOf(period, osloDay(log.created_at));

  const [{ data: counted }, { data: prev }, { data: newest }] = await Promise.all([
    supabaseAdmin
      .from("daily_counts")
      .select("count")
      .eq("habit_id", log.habit_id)
      .gte("day", start)
      .lte("day", periodEnd(period, start))
      .throwOnError(),
    kind === "limit"
      ? supabaseAdmin
          .from("logs")
          .select("created_at")
          .eq("habit_id", log.habit_id)
          .lt("created_at", log.created_at)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .throwOnError()
      : { data: null },
    // A later tap may have come since this link was made; the pace runs from the newest.
    habit.spacing_minutes
      ? supabaseAdmin
          .from("logs")
          .select("created_at")
          .eq("habit_id", log.habit_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .throwOnError()
      : { data: null },
  ]);

  const current = start === periodOf(period, osloDay(now));
  return {
    name: habit.name,
    kind,
    period,
    color: habit.color,
    created: new Date(log.created_at).getTime(),
    start,
    current,
    count: counted.reduce((n, r) => n + r.count!, 0),
    // The link stays valid, so the page can be reopened after the target changed.
    target: periodTarget(habit.habit_targets, period, start),
    previous: prev?.created_at,
    next: current ? nextFrom(newest?.created_at, habit.spacing_minutes, now) : null,
  };
}
