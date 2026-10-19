import assert from "node:assert/strict";
import { test } from "node:test";
import { formatGap, habitStatus, osloDay } from "./habits.ts";

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

test("formatGap", () => {
  assert.equal(formatGap(59_000), "under a minute");
  assert.equal(formatGap(45 * 60_000), "45 min");
  assert.equal(formatGap(120 * 60_000), "2 h");
  assert.equal(formatGap(134 * 60_000), "2 h 14 min");
  assert.equal(formatGap(27 * 3_600_000), "1 d 3 h");
});
