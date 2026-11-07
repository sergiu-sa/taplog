import assert from "node:assert/strict";
import { test } from "node:test";
import { coil } from "./coil.ts";

const xs = (d) => [...d.matchAll(/[MHL](-?[\d.]+)/g)].map((m) => Number(m[1]));

test("one turn per unit of target, the next one unlit for the hover preview", () => {
  const c = coil("goal", 8, 5);
  assert.equal(c.turns.length, 8);
  assert.deepEqual(c.turns.map((t) => t.lit), [true, true, true, true, true, false, false, false]);
  assert.equal(c.lit, 5);
  assert.equal(c.chip, false);
  assert.equal(c.edge, "etch");
});

test("a met goal lights the chip and edge and previews one turn outside", () => {
  const c = coil("goal", 1, 1);
  assert.equal(c.chip, true);
  assert.equal(c.edge, "trace");
  assert.equal(c.turns.length, 2);
  assert.deepEqual(c.turns.map((t) => [t.lit, t.spill]), [[true, false], [false, true]]);
});

test("limit edge: etch under, ink at, short over; spill follows onTrack", () => {
  assert.equal(coil("limit", 10, 9).edge, "etch");
  assert.equal(coil("limit", 10, 10).edge, "ink");
  const over = coil("limit", 10, 12);
  assert.equal(over.edge, "short");
  assert.equal(over.spill, "short");
  assert.equal(over.turns.filter((t) => t.spill && t.lit).length, 2);
  assert.equal(coil("goal", 8, 10).spill, "trace");
});

test("spill stops at the room outside the edge and marks the overflow", () => {
  const c = coil("limit", 10, 40);
  assert.ok(c.heavy);
  assert.ok(c.turns.length < 40);
  assert.equal(c.lit, c.turns.length);
  assert.equal(coil("limit", 10, 11).heavy, false);
});

test("a limit's spill winds 2 further out than a goal's, so its red stands apart from the last turn", () => {
  const first = (c) => xs(c.turns.find((t) => t.spill).d)[0];
  assert.equal(first(coil("goal", 10, 12)) - first(coil("limit", 10, 12)), 2);
  // The gap costs a limit one or two spilled turns of room before the outermost goes heavy.
  assert.equal(coil("limit", 10, 14).heavy, true);
  assert.equal(coil("goal", 10, 14).heavy, false);
});

test("nothing spilled: every coordinate stays inside the die-cut edge", () => {
  for (const [kind, target, count] of [["goal", 8, 8], ["goal", 1, 1], ["limit", 10, 10], ["goal", 8, 0]]) {
    const c = coil(kind, target, count);
    const drawn = c.turns.filter((t) => !t.spill);
    for (const x of [...drawn.flatMap((t) => xs(t.d)), ...xs(c.bridge)]) assert.ok(x > 12, `${kind} ${count}: ${x}`);
  }
});

test("the current path runs through the lit turns without a break", () => {
  const c = coil("goal", 8, 3);
  assert.equal(c.current.match(/M/g).length, 1);
  assert.ok(!/NaN|undefined/.test(c.current + c.bridge + c.lead));
  assert.equal(coil("goal", 8, 0).current, "");
});

test("a limit of 0: nothing drawn but the edge until a tap spills outside it", () => {
  const empty = coil("limit", 0, 0);
  assert.equal(empty.edge, "ink");
  assert.equal(empty.lead + empty.bridge + empty.current, "");
  const over = coil("limit", 0, 2);
  assert.equal(over.edge, "short");
  assert.equal(over.turns.filter((t) => t.lit && t.spill).length, 2);
  assert.ok(!/NaN|undefined/.test(over.turns.map((t) => t.d).join("") + over.bridge + over.lead + over.current));
});
