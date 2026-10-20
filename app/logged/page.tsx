import { refresh } from "next/cache";
import { notFound } from "next/navigation";
import { formatGap, habitStatus, osloDay, toneClass, type Kind } from "@/lib/habits";
import { verifyId } from "@/lib/sig";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { UndoButton } from "./undo-button";

const UNDO_MS = 2 * 60_000;

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
    .select("created_at, habit_slug, habits(name, kind, daily_target, color)")
    .eq("id", Number(id))
    .maybeSingle()
    .throwOnError();

  // A valid signature means /log created this row, so if it's gone it was deleted.
  if (!log) {
    return (
      <main id="main" className="mx-auto flex min-h-dvh max-w-sm flex-col px-6 pt-16">
        <p className="text-sm font-medium text-neutral-500">Undone</p>
        <h1 className="mt-2 text-2xl font-semibold">That tap was removed</h1>
        <p className="mt-2 text-neutral-500">It no longer counts.</p>
      </main>
    );
  }

  const habit = log.habits;
  const kind = habit.kind as Kind;
  const day = osloDay(log.created_at);

  const [{ data: counted }, { data: prev }] = await Promise.all([
    supabaseAdmin
      .from("daily_counts")
      .select("count")
      .eq("habit_slug", log.habit_slug)
      .eq("day", day)
      .maybeSingle()
      .throwOnError(),
    kind === "limit"
      ? supabaseAdmin
          .from("logs")
          .select("created_at")
          .eq("habit_slug", log.habit_slug)
          .lt("created_at", log.created_at)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .throwOnError()
      : { data: null },
  ]);

  const count = counted?.count ?? 0;
  const status = habitStatus(kind, count, habit.daily_target);
  const created = new Date(log.created_at).getTime();
  // Server Components render once per request, so this is just the request time.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-sm flex-col px-6 pt-16 pb-8">
      <p className="text-sm font-medium text-neutral-500">
        {dup ? "Already counted" : "✓ Logged"}
      </p>
      <h1 className="mt-2 flex items-center gap-2.5 text-2xl font-semibold">
        <span className="size-3 rounded-full" style={{ backgroundColor: habit.color }} />
        {habit.name}
      </h1>

      <p className="mt-12 text-sm text-neutral-500">
        {day === osloDay(now) ? "Today" : day}
      </p>
      <p className={`text-7xl font-bold tabular-nums ${toneClass[status.tone]}`}>
        {count}
        <span className="text-4xl font-semibold text-neutral-400"> / {habit.daily_target}</span>
      </p>
      <p className={`mt-1 text-lg font-medium ${toneClass[status.tone]}`}>{status.label}</p>

      {kind === "limit" && (
        <p className="mt-6 text-neutral-500">
          {prev
            ? `${formatGap(created - new Date(prev.created_at).getTime())} since the previous one`
            : "First one logged"}
        </p>
      )}

      {now - created < UNDO_MS && (
        <div className="mt-auto pt-10">
          <UndoButton id={id} sig={sig} action={undo} />
        </div>
      )}
    </main>
  );
}
