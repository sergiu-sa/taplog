import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, formatGap, habitStatus, onTrack, osloDay, streak } from "./habits.ts";

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
  assert.equal(streak("goal", 8, counts, "2026-10-19", "2026-10-16"), 3);
  counts.set("2026-10-19", 8);
  assert.equal(streak("goal", 8, counts, "2026-10-19", "2026-10-16"), 4);
  counts.delete("2026-10-17");
  assert.equal(streak("goal", 8, counts, "2026-10-19", "2026-10-16"), 2);
  assert.equal(streak("goal", 8, new Map([["2026-10-17", 8]]), "2026-10-19", "2026-10-17"), 0);
});

test("limit streak: zero days pass, starts at the first log, today over ends it", () => {
  // 10-17 has no row: nothing smoked, which is on track.
  const counts = new Map([["2026-10-16", 4], ["2026-10-18", 10], ["2026-10-19", 2]]);
  assert.equal(streak("limit", 10, counts, "2026-10-19", "2026-10-16"), 4);
  counts.set("2026-10-19", 11);
  assert.equal(streak("limit", 10, counts, "2026-10-19", "2026-10-16"), 0);
  counts.set("2026-10-19", 2);
  counts.set("2026-10-16", 12);
  assert.equal(streak("limit", 10, counts, "2026-10-19", "2026-10-16"), 3);
  assert.equal(streak("limit", 10, new Map(), "2026-10-19", undefined), 0);
});

test("formatGap", () => {
  assert.equal(formatGap(59_000), "under a minute");
  assert.equal(formatGap(45 * 60_000), "45 min");
  assert.equal(formatGap(120 * 60_000), "2 h");
  assert.equal(formatGap(134 * 60_000), "2 h 14 min");
  assert.equal(formatGap(27 * 3_600_000), "1 d 3 h");
});
