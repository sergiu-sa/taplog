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

// A row of habit_targets: the target from that Oslo day until the next row.
export type Target = { from_day: string; target: number };

// A day before the first row takes its target, because the history only starts when it was
// first recorded, and taps can be older. Sorted here, so no query has to remember to.
export function targetOn(targets: Target[], day: string) {
  const rows = targets.toSorted((a, b) => (a.from_day < b.from_day ? -1 : 1));
  return (rows.findLast((t) => t.from_day <= day) ?? rows[0]).target;
}

export type DayState = "future" | "before" | "met" | "partial" | "missed" | "over";

// `target` is the one in force on `day` (targetOn), so a later change doesn't re-score it.
// `first` is the first logged day: days before it weren't tracked, so they're not misses.
export function dayState(kind: Kind, target: number, count: number, day: string, today: string, first?: string): DayState {
  if (day > today) return "future";
  if (!first || day < first) return "before";
  if (onTrack(kind, count, target)) return "met";
  if (kind === "limit") return "over";
  return count > 0 ? "partial" : "missed";
}

// en-CA formats as YYYY-MM-DD, the same shape as daily_counts.day.
const osloDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Oslo" });

export function osloDay(date: Date | string | number) {
  return osloDate.format(new Date(date));
}

const osloClock = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Oslo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

// "14:02", the Oslo wall time of a tap.
export function osloTime(date: Date | string | number) {
  return osloClock.format(new Date(date));
}

export function osloHour(date: Date | string | number) {
  return Number(osloTime(date).slice(0, 2));
}

// The day is already Oslo's, so it's read at noon UTC and printed in UTC to stay on it.
const dayFormats = {
  short: new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }),
  long: new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }),
};

export function formatDay(day: string, style: keyof typeof dayFormats = "short") {
  return dayFormats[style].format(new Date(`${day}T12:00:00Z`));
}

// Calendar arithmetic on YYYY-MM-DD. UTC here only avoids DST; the day is already Oslo's.
export function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// The Monday of the week holding `day`; grids run Monday to Sunday.
export function weekStart(day: string) {
  return addDays(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7));
}

// Consecutive on-track days ending yesterday, back to `first` (the first logged day).
// A day with no logs counts as 0, which fails a goal and passes a limit, so `first`
// stops a limit streak from reaching back before tracking began.
export function runBefore(kind: Kind, targets: Target[], counts: Map<string, number>, today: string, first: string | undefined) {
  let n = 0;
  if (!first) return n;
  for (let day = addDays(today, -1); day >= first && onTrack(kind, counts.get(day) ?? 0, targetOn(targets, day)); day = addDays(day, -1)) n++;
  return n;
}

export function streak(kind: Kind, targets: Target[], counts: Map<string, number>, today: string, first: string | undefined) {
  return first ? todayStreak(kind, targetOn(targets, today), counts.get(today) ?? 0, runBefore(kind, targets, counts, today, first)) : 0;
}

// The longest run, every day scored on its own target. Today joins a run the way it does
// in streak(): when on track, and an unfinished goal day doesn't end one.
export function bestStreak(kind: Kind, targets: Target[], counts: Map<string, number>, today: string, first: string | undefined) {
  let best = 0;
  if (!first) return best;
  for (let day = first, run = 0; day <= today; day = addDays(day, 1)) {
    if (onTrack(kind, counts.get(day) ?? 0, targetOn(targets, day))) run++;
    else if (day < today || kind === "limit") run = 0;
    best = Math.max(best, run);
  }
  return best;
}

// Taps a day from the first logged day through yesterday, since today isn't over yet.
// Tracking that began today has only today to go on.
export function perDay(counts: Map<string, number>, today: string, first: string | undefined) {
  if (!first) return 0;
  const last = first < today ? addDays(today, -1) : today;
  let days = 0;
  let taps = 0;
  for (let day = first; day <= last; day = addDays(day, 1), days++) taps += counts.get(day) ?? 0;
  return taps / days;
}

// Today's streak from the run that ended yesterday, so the client can recount after a tap.
// An unfinished goal day doesn't end a streak; a limit already over target today has.
export function todayStreak(kind: Kind, target: number, count: number, before: number) {
  if (onTrack(kind, count, target)) return before + 1;
  return kind === "goal" ? before : 0;
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
