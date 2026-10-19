export type Kind = "goal" | "limit";
export type Tone = "progress" | "done" | "warn" | "over";

// A goal is met at count >= target; a limit holds while count <= target.
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

export function formatGap(ms: number) {
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "under a minute";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return min % 60 ? `${h} h ${min % 60} min` : `${h} h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d} d ${h % 24} h` : `${d} d`;
}
