export type Kind = "goal" | "limit";
export type Tone = "progress" | "done" | "warn" | "over";

export const toneClass: Record<Tone, string> = {
  progress: "",
  done: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  over: "text-red-600 dark:text-red-400",
};

// A goal is met at count >= target; a limit holds while count <= target.
export function onTrack(kind: Kind, count: number, target: number) {
  return kind === "goal" ? count >= target : count <= target;
}

export function habitStatus(kind: Kind, count: number, target: number): { tone: Tone; label: string } {
  if (kind === "goal") {
    return count >= target
      ? { tone: "done", label: "Goal reached" }
      : { tone: "progress", label: `${target - count} to go` };
  }
  if (count < target) return { tone: "progress", label: `${target - count} left` };
  if (count === target) return { tone: "warn", label: "At your limit" };
  return { tone: "over", label: `${count - target} over your limit` };
}

// en-CA formats as YYYY-MM-DD, the same shape as daily_counts.day.
const osloDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Oslo" });

export function osloDay(date: Date | string | number) {
  return osloDate.format(new Date(date));
}

// Calendar arithmetic on YYYY-MM-DD. UTC here only avoids DST; the day is already Oslo's.
export function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Consecutive on-track days ending today. A day with no logs counts as 0, which
// fails a goal and passes a limit, so `first` (the first logged day) stops a limit
// streak from reaching back before tracking began. An unfinished goal day doesn't
// end a streak; a limit already over target today has.
export function streak(
  kind: Kind,
  target: number,
  counts: Map<string, number>,
  today: string,
  first: string | undefined,
) {
  if (!first) return 0;
  let day = today;
  if (!onTrack(kind, counts.get(day) ?? 0, target)) {
    if (kind === "limit") return 0;
    day = addDays(day, -1);
  }
  let n = 0;
  while (day >= first && onTrack(kind, counts.get(day) ?? 0, target)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export function formatGap(ms: number) {
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "under a minute";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return min % 60 ? `${h} h ${min % 60} min` : `${h} h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d} d ${h % 24} h` : `${d} d`;
}
