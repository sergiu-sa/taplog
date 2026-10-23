import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, dayState, formatGap, habitStatus, onTrack, osloDay, runBefore, streak, targetOn, todayStreak } from "./habits.ts";

// A target that never changed.
const always = (target) => [{ from_day: "2026-01-01", target }];

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
  assert.equal(streak("goal", always(8), counts, "2026-10-19", "2026-10-16"), 3);
  counts.set("2026-10-19", 8);
  assert.equal(streak("goal", always(8), counts, "2026-10-19", "2026-10-16"), 4);
  counts.delete("2026-10-17");
  assert.equal(streak("goal", always(8), counts, "2026-10-19", "2026-10-16"), 2);
  assert.equal(streak("goal", always(8), new Map([["2026-10-17", 8]]), "2026-10-19", "2026-10-17"), 0);
});

test("limit streak: zero days pass, starts at the first log, today over ends it", () => {
  // 10-17 has no row: nothing smoked, which is on track.
  const counts = new Map([["2026-10-16", 4], ["2026-10-18", 10], ["2026-10-19", 2]]);
  assert.equal(streak("limit", always(10), counts, "2026-10-19", "2026-10-16"), 4);
  counts.set("2026-10-19", 11);
  assert.equal(streak("limit", always(10), counts, "2026-10-19", "2026-10-16"), 0);
  counts.set("2026-10-19", 2);
  counts.set("2026-10-16", 12);
  assert.equal(streak("limit", always(10), counts, "2026-10-19", "2026-10-16"), 3);
  assert.equal(streak("limit", always(10), new Map(), "2026-10-19", undefined), 0);
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
});

test("changing a target leaves past days and the streak as they were", () => {
  const t = "2026-10-19";
  // A limit lowered from 10 to 6 today. Each past day used 7 to 10, so on 6 they'd all be over.
  const smokes = new Map([["2026-10-16", 9], ["2026-10-17", 7], ["2026-10-18", 10], [t, 4]]);
  const lowered = [{ from_day: "2026-10-14", target: 10 }, { from_day: t, target: 6 }];
  for (const day of ["2026-10-16", "2026-10-17", "2026-10-18"]) {
    assert.equal(dayState("limit", targetOn(lowered, day), smokes.get(day), day, t, "2026-10-16"), "met");
  }
  assert.equal(runBefore("limit", lowered, smokes, t, "2026-10-16"), 3);
  assert.equal(streak("limit", lowered, smokes, t, "2026-10-16"), 4);
  // Today is scored on the new limit.
  smokes.set(t, 7);
  assert.equal(streak("limit", lowered, smokes, t, "2026-10-16"), 0);

  // A goal raised from 8 to 10 today: past days at 8 stay met.
  const water = new Map([["2026-10-17", 8], ["2026-10-18", 8], [t, 3]]);
  const raised = [{ from_day: "2026-10-17", target: 8 }, { from_day: t, target: 10 }];
  assert.equal(dayState("goal", targetOn(raised, "2026-10-18"), 8, "2026-10-18", t, "2026-10-17"), "met");
  assert.equal(streak("goal", raised, water, t, "2026-10-17"), 2);
});
