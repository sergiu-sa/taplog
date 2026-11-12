import { refresh } from "next/cache";
import { notFound } from "next/navigation";
import { formatDay, habitStatus, pastStatus } from "@/lib/habits";
import { verifyId } from "@/lib/sig";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadLog } from "./load";
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

  // Server Components render once per request, so this is just the request time.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const log = await loadLog(Number(id), now);

  // A valid signature means /t created this row, so if it's gone it was deleted.
  if (!log) return <LoggedUndone />;

  const { kind, period, start, current, count, target } = log;
  const age = now - log.created;

  return (
    <LoggedView
      dup={Boolean(dup)}
      fresh={age < FRESH_MS}
      name={log.name}
      kind={kind}
      color={log.color}
      when={period === "week" ? (current ? "This week" : `Week of ${formatDay(start, "date")}`) : current ? "Today" : formatDay(start)}
      count={count}
      target={target}
      status={current ? habitStatus(kind, count, target) : pastStatus(kind, count, target)}
      since={kind === "limit" ? sinceLine(log.created, log.previous) : null}
      next={log.next}
      undo={age < UNDO_MS && <UndoButton id={id} sig={sig} action={undo} />}
    />
  );
}
