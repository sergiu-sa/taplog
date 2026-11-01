import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, bestStreak, dayState, formatGap, habitStatus, onTrack, osloDay, osloHour, osloTime, periodCounts, periodOf, periodTarget, perPeriod, runBefore, streak, targetOn, targetText, todayStreak, weekStart } from "./habits.ts";

// A target that never changed.
const always = (target) => [{ from_day: "2026-01-01", target }];
const daily = (kind, targets, counts) => ({ kind, period: "day", targets, counts });

test("habitStatus follows kind", () => {
  assert.deepEqual(habitStatus("goal", 7, 8), { tone: "progress", label: "1 to go" });
  assert.equal(habitStatus("goal", 8, 8).tone, "done");
  assert.equal(habitStatus("goal", 9, 8).tone, "done");
  assert.deepEqual(habitStatus("limit", 7, 10), { tone: "progress", label: "3 left" });
  assert.equal(habitStatus("limit", 10, 10).tone, "warn");
  assert.deepEqual(habitStatus("limit", 12, 10), { tone: "over", label: "2 over your limit" });
});

test("osloDay switches at Oslo midnight, across DST", () => {
  assert.equal(osloDay("2026-10-19T21:59:59Z"), "2026-10-19");
  assert.equal(osloDay("2026-10-19T22:00:00Z"), "2026-10-20");
  assert.equal(osloDay("2026-12-01T22:59:59Z"), "2026-12-01");
  assert.equal(osloDay("2026-12-01T23:00:00Z"), "2026-12-02");
});

test("onTrack follows kind", () => {
  assert.equal(onTrack("goal", 8, 8), true);
  assert.equal(onTrack("goal", 0, 1), false);
  assert.equal(onTrack("limit", 10, 10), true);
  assert.equal(onTrack("limit", 0, 10), true);
  assert.equal(onTrack("limit", 11, 10), false);
});

test("addDays crosses months and DST", () => {
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(addDays("2026-03-28", 2), "2026-03-30");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});

test("goal streak: zero days break it, an unfinished today doesn't", () => {
  const counts = new Map([["2026-10-16", 8], ["2026-10-17", 8], ["2026-10-18", 8], ["2026-10-19", 3]]);
  assert.equal(streak(daily("goal", always(8), counts), "2026-10-19", "2026-10-16"), 3);
  counts.set("2026-10-19", 8);
  assert.equal(streak(daily("goal", always(8), counts), "2026-10-19", "2026-10-16"), 4);
  counts.delete("2026-10-17");
  assert.equal(streak(daily("goal", always(8), counts), "2026-10-19", "2026-10-16"), 2);
  assert.equal(streak(daily("goal", always(8), new Map([["2026-10-17", 8]])), "2026-10-19", "2026-10-17"), 0);
});

test("limit streak: zero days pass, starts at the first log, today over ends it", () => {
  // 10-17 has no row: nothing smoked, which is on track.
  const counts = new Map([["2026-10-16", 4], ["2026-10-18", 10], ["2026-10-19", 2]]);
  assert.equal(streak(daily("limit", always(10), counts), "2026-10-19", "2026-10-16"), 4);
  counts.set("2026-10-19", 11);
  assert.equal(streak(daily("limit", always(10), counts), "2026-10-19", "2026-10-16"), 0);
  counts.set("2026-10-19", 2);
  counts.set("2026-10-16", 12);
  assert.equal(streak(daily("limit", always(10), counts), "2026-10-19", "2026-10-16"), 3);
  assert.equal(streak(daily("limit", always(10), new Map()), "2026-10-19", undefined), 0);
});

test("formatGap", () => {
  assert.equal(formatGap(59_000), "under a minute");
  assert.equal(formatGap(45 * 60_000), "45 min");
  assert.equal(formatGap(120 * 60_000), "2 h");
  assert.equal(formatGap(134 * 60_000), "2 h 14 min");
  assert.equal(formatGap(27 * 3_600_000), "1 d 3 h");
});

test("dayState follows kind and starts at the first log", () => {
  const t = "2026-10-19";
  assert.equal(dayState("goal", 8, 0, "2026-10-20", t, "2026-10-01"), "future");
  assert.equal(dayState("goal", 8, 0, "2026-09-30", t, "2026-10-01"), "before");
  assert.equal(dayState("goal", 8, 3, t, t, undefined), "before");
  assert.equal(dayState("goal", 8, 8, t, t, "2026-10-01"), "met");
  assert.equal(dayState("goal", 8, 3, t, t, "2026-10-01"), "partial");
  assert.equal(dayState("goal", 8, 0, t, t, "2026-10-01"), "missed");
  assert.equal(dayState("limit", 10, 0, t, t, "2026-10-01"), "met");
  assert.equal(dayState("limit", 10, 11, t, t, "2026-10-01"), "over");
});

test("todayStreak recounts today on top of the run that ended yesterday", () => {
  assert.equal(todayStreak("goal", 8, 5, 3), 3);
  assert.equal(todayStreak("goal", 8, 8, 3), 4);
  assert.equal(todayStreak("goal", 1, 1, 0), 1);
  assert.equal(todayStreak("limit", 10, 4, 43), 44);
  assert.equal(todayStreak("limit", 10, 11, 43), 0);
});

test("targetOn takes the latest row on or before the day, and the first row before that", () => {
  const targets = [{ from_day: "2026-10-10", target: 10 }, { from_day: "2026-10-19", target: 6 }];
  assert.equal(targetOn(targets, "2026-10-01"), 10);
  assert.equal(targetOn(targets, "2026-10-10"), 10);
  assert.equal(targetOn(targets, "2026-10-18"), 10);
  assert.equal(targetOn(targets, "2026-10-19"), 6);
  assert.equal(targetOn(targets, "2026-10-30"), 6);
  assert.equal(targetOn(targets.toReversed(), "2026-10-18"), 10);
  assert.equal(targetOn(targets.toReversed(), "2026-10-01"), 10);
});

test("changing a target leaves past days and the streak as they were", () => {
  const t = "2026-10-19";
  // A limit lowered from 10 to 6 today. Each past day used 7 to 10, so on 6 they'd all be over.
  const smokes = new Map([["2026-10-16", 9], ["2026-10-17", 7], ["2026-10-18", 10], [t, 4]]);
  const lowered = [{ from_day: "2026-10-14", target: 10 }, { from_day: t, target: 6 }];
  for (const day of ["2026-10-16", "2026-10-17", "2026-10-18"]) {
    assert.equal(dayState("limit", targetOn(lowered, day), smokes.get(day), day, t, "2026-10-16"), "met");
  }
  assert.equal(runBefore(daily("limit", lowered, smokes), t, "2026-10-16"), 3);
  assert.equal(streak(daily("limit", lowered, smokes), t, "2026-10-16"), 4);
  // Today is scored on the new limit.
  smokes.set(t, 7);
  assert.equal(streak(daily("limit", lowered, smokes), t, "2026-10-16"), 0);

  // A goal raised from 8 to 10 today: past days at 8 stay met.
  const water = new Map([["2026-10-17", 8], ["2026-10-18", 8], [t, 3]]);
  const raised = [{ from_day: "2026-10-17", target: 8 }, { from_day: t, target: 10 }];
  assert.equal(dayState("goal", targetOn(raised, "2026-10-18"), 8, "2026-10-18", t, "2026-10-17"), "met");
  assert.equal(streak(daily("goal", raised, water), t, "2026-10-17"), 2);
});

test("best streak scores each day on its own target and includes today like streak()", () => {
  const t = "2026-10-19";
  // Six days within 10 (10-08 to 10-13), one over, then five more to today: 10-17 and
  // 10-18 have no rows, which passes a limit.
  const smokes = new Map([["2026-10-08", 9], ["2026-10-09", 9], ["2026-10-10", 9], ["2026-10-11", 9], ["2026-10-12", 9], ["2026-10-13", 9], ["2026-10-14", 12], ["2026-10-15", 3], ["2026-10-16", 2], [t, 4]]);
  const always10 = always(10);
  assert.equal(bestStreak(daily("limit", always10, smokes), t, "2026-10-08"), 6);
  assert.equal(streak(daily("limit", always10, smokes), t, "2026-10-08"), 5);
  // Lowered to 6 from 10-12: the 9s from then on are over, so the early run is 4.
  const lowered = [{ from_day: "2026-10-01", target: 10 }, { from_day: "2026-10-12", target: 6 }];
  assert.equal(bestStreak(daily("limit", lowered, smokes), t, "2026-10-08"), 5);
  // Today over a limit ends the run, as in streak().
  smokes.set(t, 11);
  assert.equal(bestStreak(daily("limit", lowered, smokes), t, "2026-10-08"), 4);
  assert.equal(bestStreak(daily("limit", always10, new Map()), t, undefined), 0);

  // An unfinished goal day keeps the run it extends; a met one adds to it.
  const water = new Map([["2026-10-16", 8], ["2026-10-17", 8], ["2026-10-18", 8], [t, 3]]);
  assert.equal(bestStreak(daily("goal", always(8), water), t, "2026-10-16"), 3);
  water.set(t, 8);
  assert.equal(bestStreak(daily("goal", always(8), water), t, "2026-10-16"), 4);
  assert.equal(bestStreak(daily("goal", always(8), water), t, "2026-10-16"), streak(daily("goal", always(8), water), t, "2026-10-16"));
});

test("perDay averages the days through yesterday, or today when tracking began today", () => {
  const t = "2026-10-19";
  assert.equal(perPeriod(new Map([["2026-10-16", 6], ["2026-10-18", 3], [t, 9]]), "day", t, "2026-10-16"), 3);
  assert.equal(perPeriod(new Map([[t, 4]]), "day", t, t), 4);
  assert.equal(perPeriod(new Map(), "day", t, undefined), 0);
});

test("osloTime and osloHour read the Oslo clock, across DST", () => {
  assert.equal(osloTime("2026-10-22T07:15:00Z"), "09:15");
  assert.equal(osloTime("2026-01-15T08:15:00Z"), "09:15");
  assert.equal(osloTime("2026-09-30T22:30:00Z"), "00:30");
  assert.equal(osloHour("2026-09-30T22:30:00Z"), 0);
  assert.equal(osloHour("2026-10-22T21:59:00Z"), 23);
});

// Weeks run Monday to Sunday, Oslo time. Today is Wednesday 28 October; the weeks before it
// start on 5, 12 and 19 October.
const weekly = (kind, targets, counts) => ({ kind, period: "week", targets, counts });
const W = "2026-10-28";

test("an Oslo week starts at Monday 00:00, across DST and the year end", () => {
  // Sunday 23:59:59 and Monday 00:00 in Oslo (winter time, UTC+1).
  assert.equal(weekStart(osloDay("2026-11-01T22:59:59Z")), "2026-10-26");
  assert.equal(weekStart(osloDay("2026-11-01T23:00:00Z")), "2026-11-02");
  // The week the clocks went back on its Sunday, and Monday 00:30 Oslo while UTC is still Sunday.
  assert.equal(weekStart("2026-10-25"), "2026-10-19");
  assert.equal(weekStart(osloDay("2026-10-25T23:30:00Z")), "2026-10-26");
  assert.equal(weekStart("2027-01-01"), "2026-12-28");
  assert.equal(periodOf("day", W), W);
  assert.deepEqual(periodCounts(new Map([["2026-10-25", 2], ["2026-10-26", 1], ["2026-10-28", 1]]), "week"), new Map([["2026-10-19", 2], ["2026-10-26", 2]]));
});

test("weekly goal: a short week breaks the streak, an unfinished current week doesn't", () => {
  // From Thursday 8 October: 3 that week, 2 the next, 3 the week after, 1 so far this week.
  const gym = new Map([["2026-10-08", 1], ["2026-10-09", 1], ["2026-10-10", 1], ["2026-10-13", 1], ["2026-10-15", 1], ["2026-10-19", 1], ["2026-10-21", 1], ["2026-10-25", 1], ["2026-10-27", 1]]);
  const h = weekly("goal", always(3), gym);
  assert.equal(runBefore(h, W, "2026-10-08"), 1);
  assert.equal(streak(h, W, "2026-10-08"), 1);
  assert.equal(bestStreak(h, W, "2026-10-08"), 1);
  gym.set("2026-10-28", 2);
  assert.equal(streak(h, W, "2026-10-08"), 2);
  assert.equal(bestStreak(h, W, "2026-10-08"), 2);
  assert.equal(habitStatus("goal", 1, 3, "week").label, "2 to go this week");
  assert.equal(habitStatus("goal", 3, 3, "week").label, "Goal reached this week");
  assert.equal(targetText("goal", 3, "week"), "3 a week");
});

test("weekly limit: a week with no taps holds, the current week over ends the streak", () => {
  const takeaway = new Map([["2026-10-14", 1], ["2026-10-26", 1], ["2026-10-27", 1]]);
  const h = weekly("limit", always(2), takeaway);
  // 12 Oct (1), 19 Oct (none), this week (2, at the limit).
  assert.equal(streak(h, W, "2026-10-14"), 3);
  takeaway.set(W, 1);
  assert.equal(streak(h, W, "2026-10-14"), 0);
  assert.equal(bestStreak(h, W, "2026-10-14"), 2);
  assert.equal(habitStatus("limit", 3, 2, "week").label, "1 over your limit this week");
  assert.equal(targetText("limit", 2, "week"), "at most 2 a week");
});

test("a target changed midweek counts for that whole week; earlier weeks keep theirs", () => {
  // Lowered from 3 to 2 on Wednesday 21 October.
  const lowered = [{ from_day: "2026-10-01", target: 3 }, { from_day: "2026-10-21", target: 2 }];
  assert.equal(periodTarget(lowered, "week", "2026-10-12"), 3);
  assert.equal(periodTarget(lowered, "week", "2026-10-19"), 2);
  assert.equal(periodTarget(lowered, "week", "2026-10-26"), 2);
  // Two a week: short on 3 the week of 12 Oct, enough on 2 the week of 19 Oct.
  const gym = new Map([["2026-10-12", 1], ["2026-10-14", 1], ["2026-10-19", 1], ["2026-10-20", 1]]);
  assert.equal(runBefore(weekly("goal", lowered, gym), W, "2026-10-12"), 1);
  assert.equal(dayState("goal", periodTarget(lowered, "week", "2026-10-12"), 2, "2026-10-12", "2026-10-26", "2026-10-12"), "partial");
});

test("a first week that began midweek scores on the full target", () => {
  // Tracking began on Saturday 17 October with two taps by Sunday: short of 3, not untracked.
  const gym = new Map([["2026-10-17", 1], ["2026-10-18", 1], ["2026-10-20", 1], ["2026-10-22", 1], ["2026-10-24", 1]]);
  const first = periodOf("week", "2026-10-17");
  assert.equal(first, "2026-10-12");
  assert.equal(dayState("goal", 3, 2, "2026-10-12", "2026-10-26", first), "partial");
  assert.equal(dayState("goal", 3, 0, "2026-10-05", "2026-10-26", first), "before");
  assert.equal(streak(weekly("goal", always(3), gym), W, "2026-10-17"), 1);
});

test("perPeriod averages the weeks that are over, or the current week when tracking began in it", () => {
  const gym = new Map([["2026-10-06", 3], ["2026-10-13", 2], ["2026-10-20", 4], [W, 1]]);
  assert.equal(perPeriod(gym, "week", W, "2026-10-06"), 3);
  assert.equal(perPeriod(new Map([["2026-10-27", 2], [W, 1]]), "week", W, "2026-10-27"), 3);
});
