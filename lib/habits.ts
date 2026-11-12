export type Kind = "goal" | "limit";
export type Period = "day" | "week";
export type Tone = "progress" | "done" | "warn" | "over";

// Past 20 turns the coil blurs; a limit of 0 means none at all, a goal of 0 would always be met.
// habits_daily_target_check in the database holds the same range.
export const MAX_TARGET = 20;
export const minTarget = (kind: Kind) => (kind === "goal" ? 1 : 0);
export const targetText = (kind: Kind, target: number, period: Period) => (kind === "goal" ? `${target} a ${period}` : `at most ${target} a ${period}`);

// A goal is met at count >= target; a limit holds while count <= target.
export function onTrack(kind: Kind, count: number, target: number) {
  return kind === "goal" ? count >= target : count <= target;
}

// A limit's last fifth, at least its last one: at 15 from 12, at 5 from 4. It needs a tap, or a
// limit of 1 would say so from midnight; a limit of 0 is at its limit from the start.
export function closeToLimit(kind: Kind, count: number, target: number) {
  return kind === "limit" && count > 0 && count < target && target - count <= Math.max(1, Math.floor(target / 5));
}

// Today's page says "today" already; a week's count needs saying.
export function habitStatus(kind: Kind, count: number, target: number, period: Period = "day"): { tone: Tone; label: string } {
  const s = status(kind, count, target);
  return period === "week" ? { ...s, label: `${s.label} this week` } : s;
}

function status(kind: Kind, count: number, target: number): { tone: Tone; label: string } {
  if (kind === "goal") {
    return count >= target
      ? { tone: "done", label: "Goal reached" }
      : { tone: "progress", label: `${target - count} to go` };
  }
  if (closeToLimit(kind, count, target)) return { tone: "warn", label: "Close to your limit" };
  if (count < target) return { tone: "progress", label: `${target - count} left` };
  if (count === target) return { tone: "warn", label: "At your limit" };
  return { tone: "over", label: `${count - target} over your limit` };
}

// A finished day or week: a goal's is over, so it's short rather than still to go. `warn` is a
// caution about taps to come, so a finished limit never wears it: muted within, ink right at it.
export function pastStatus(kind: Kind, count: number, target: number): { tone: Tone; label: string } {
  if (kind === "goal") return count >= target ? { tone: "done", label: "Goal reached" } : { tone: "progress", label: `${target - count} short` };
  if (count > target) return { tone: "over", label: `${count - target} over your limit` };
  return { tone: count < target ? "progress" : "done", label: "Within your limit" };
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
// A week scores the same way, each day here being a week's Monday (periodOf).
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
  date: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
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

// A period is named by its first day: the day itself, or the Monday of its Oslo week.
export const periodOf = (period: Period, day: string) => (period === "week" ? weekStart(day) : day);
const length = (period: Period) => (period === "week" ? 7 : 1);
export const periodEnd = (period: Period, start: string) => addDays(start, length(period) - 1);

// A week takes the target in force on its Sunday, so a change midweek counts for that whole
// week and earlier weeks keep theirs. The current week's Sunday is ahead: the latest row.
export const periodTarget = (targets: Target[], period: Period, start: string) => targetOn(targets, periodEnd(period, start));

// Taps per period, keyed by its first day. Days come from daily_counts, already Oslo's.
export function periodCounts(counts: Map<string, number>, period: Period) {
  if (period === "day") return counts;
  const weeks = new Map<string, number>();
  for (const [day, n] of counts) weeks.set(weekStart(day), (weeks.get(weekStart(day)) ?? 0) + n);
  return weeks;
}

// Every function below steps through periods: `today` stands for the period holding it, and
// `first` (the first logged day) for the period holding that.
export type Scored = { kind: Kind; period: Period; targets: Target[]; counts: Map<string, number> };

// Consecutive on-track periods ending with the one before today's, back to the first logged
// one. A period with no logs counts as 0, which fails a goal and passes a limit, so `first`
// stops a limit streak from reaching back before tracking began.
export function runBefore({ kind, period, targets, counts }: Scored, today: string, first: string | undefined) {
  let n = 0;
  if (!first) return n;
  const sums = periodCounts(counts, period);
  const step = length(period);
  const start = periodOf(period, first);
  for (let p = addDays(periodOf(period, today), -step); p >= start && onTrack(kind, sums.get(p) ?? 0, periodTarget(targets, period, p)); p = addDays(p, -step)) n++;
  return n;
}

export function streak(h: Scored, today: string, first: string | undefined) {
  const now = periodOf(h.period, today);
  return first ? todayStreak(h.kind, periodTarget(h.targets, h.period, now), periodCounts(h.counts, h.period).get(now) ?? 0, runBefore(h, today, first)) : 0;
}

// The longest run, every period scored on its own target. The current one joins a run the
// way it does in streak(): when on track, and an unfinished goal doesn't end one.
export function bestStreak({ kind, period, targets, counts }: Scored, today: string, first: string | undefined) {
  let best = 0;
  if (!first) return best;
  const sums = periodCounts(counts, period);
  const now = periodOf(period, today);
  for (let p = periodOf(period, first), run = 0; p <= now; p = addDays(p, length(period))) {
    if (onTrack(kind, sums.get(p) ?? 0, periodTarget(targets, period, p))) run++;
    else if (p < now || kind === "limit") run = 0;
    best = Math.max(best, run);
  }
  return best;
}

// Taps a period from the first logged one through the last that's over, since the current
// one isn't. Tracking that began in the current period has only that to go on.
export function perPeriod(counts: Map<string, number>, period: Period, today: string, first: string | undefined) {
  if (!first) return 0;
  const sums = periodCounts(counts, period);
  const step = length(period);
  const start = periodOf(period, first);
  const now = periodOf(period, today);
  const last = start < now ? addDays(now, -step) : now;
  let periods = 0;
  let taps = 0;
  for (let p = start; p <= last; p = addDays(p, step), periods++) taps += sums.get(p) ?? 0;
  return taps / periods;
}

// The current period's streak from the run that ended before it, so the client can recount
// after a tap. An unfinished goal doesn't end a streak; a limit already over target has.
export function todayStreak(kind: Kind, target: number, count: number, before: number) {
  if (onTrack(kind, count, target)) return before + 1;
  return kind === "goal" ? before : 0;
}

// The spacings a limit can ask for, in minutes; habits_spacing_check holds the same list.
export const SPACINGS = [30, 45, 60, 90, 120, 180, 240];

// When a spaced limit's next tap is due: its newest tap plus the spacing, while that's ahead.
// It paces and never scores, so no status or streak reads it.
export function nextFrom(last: string | null | undefined, minutes: number | null, now: number) {
  if (!last || !minutes) return null;
  const at = Date.parse(last) + minutes * 60_000;
  return at > now ? new Date(at).toISOString() : null;
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

// Reminders run inside these Oslo hours; the same habit nudges at most once per gap.
export const WAKE = { from: 8, to: 22 };
export const NUDGE_GAP_MIN = 180;

export type Paced = { kind: Kind; period: Period; target: number; count: number; reminded?: string | null };

// How many taps a goal is behind right now; 0 means stay silent (night, a met goal, any limit,
// a nudge inside the gap). `target` and `count` are the current period's.
export function behindPace({ kind, period, target, count, reminded }: Paced, now: number) {
  if (kind !== "goal") return 0;
  const [h, m] = osloTime(now).split(":").map(Number);
  const into = (h - WAKE.from) * 60 + m;
  const span = (WAKE.to - WAKE.from) * 60;
  if (into < 0 || into >= span) return 0;
  // Whole minutes: the check runs a few seconds into its minute, and so did the last one.
  if (reminded && Math.floor(now / 60_000) - Math.floor(Date.parse(reminded) / 60_000) < NUDGE_GAP_MIN) return 0;
  // The waking day in `n` equal slots, each tap due at the middle of its own.
  const due = (n: number) => Math.floor((n * into) / span + 0.5);
  if (period === "day") return Math.max(0, due(target) - count);
  // A week: silent while the rest fits in the days after today, at an even share a day (1 up
  // to 7 a week, 2 up to 14); what doesn't fit is due today, from the middle of the day.
  const day = osloDay(now);
  const after = 6 - (Date.parse(day) - Date.parse(weekStart(day))) / 86_400_000;
  return due(1) ? Math.max(0, target - count - after * Math.ceil(target / 7)) : 0;
}

// A nudge's words: the habit, then its count and the status line Today shows for it.
export function nudgeText(name: string, count: number, target: number, period: Period) {
  return { title: name, body: `${count} of ${target}. ${habitStatus("goal", count, target, period).label}.` };
}
