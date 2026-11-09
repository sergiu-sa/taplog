import { refresh } from "next/cache";
import { notFound } from "next/navigation";
import { formatDay, habitStatus, nextFrom, osloDay, pastStatus, periodEnd, periodOf, periodTarget, type Kind, type Period } from "@/lib/habits";
import { verifyId } from "@/lib/sig";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { LoggedUndone, LoggedView, sinceLine } from "./logged-view";
import { UndoButton } from "./undo-button";

const UNDO_MS = 2 * 60_000;
// The newest turn draws in on the tap's own load, not again when the tab reloads later.
const FRESH_MS = 15_000;

// Reachable by any POST, not just this page's button, so it re-verifies everything.
async function undo(_prev: string | null, formData: FormData) {
  "use server";
  const id = formData.get("id");
  const sig = formData.get("sig");
  if (typeof id !== "string" || typeof sig !== "string" || !verifyId(id, sig)) {
    return "Can't undo this tap.";
  }

  const { data } = await supabaseAdmin
    .from("logs")
    .delete()
    .eq("id", Number(id))
    .gt("created_at", new Date(Date.now() - UNDO_MS).toISOString())
    .select("id")
    .throwOnError();
  if (data.length === 0) return "Too late to undo.";

  refresh();
  return null;
}

export default async function LoggedPage({ searchParams }: PageProps<"/logged">) {
  const { id, sig, dup } = await searchParams;
  if (typeof id !== "string" || typeof sig !== "string" || !verifyId(id, sig)) notFound();

  const { data: log } = await supabaseAdmin
    .from("logs")
    .select("created_at, habit_id, habits(name, kind, period, color, spacing_minutes, habit_targets(from_day, target))")
    .eq("id", Number(id))
    .maybeSingle()
    .throwOnError();

  // A valid signature means /t created this row, so if it's gone it was deleted.
  if (!log) return <LoggedUndone />;

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

  const count = counted.reduce((n, r) => n + r.count!, 0);
  // The link stays valid, so the page can be reopened after the target changed.
  const target = periodTarget(habit.habit_targets, period, start);
  const created = new Date(log.created_at).getTime();
  // Server Components render once per request, so this is just the request time.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const age = now - created;
  const current = start === periodOf(period, osloDay(now));
  const next = current ? nextFrom(newest?.created_at, habit.spacing_minutes, now) : null;

  return (
    <LoggedView
      dup={Boolean(dup)}
      fresh={age < FRESH_MS}
      name={habit.name}
      kind={kind}
      color={habit.color}
      when={period === "week" ? (current ? "This week" : `Week of ${formatDay(start, "date")}`) : current ? "Today" : formatDay(start)}
      count={count}
      target={target}
      status={current ? habitStatus(kind, count, target) : pastStatus(kind, count, target)}
      since={kind === "limit" ? sinceLine(created, prev?.created_at) : null}
      next={next}
      undo={age < UNDO_MS && <UndoButton id={id} sig={sig} action={undo} />}
    />
  );
}
