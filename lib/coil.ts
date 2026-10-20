import { onTrack, type Kind } from "./habits.ts";

// The drawing of an NFC inlay in a 100 × 100 box: `target` turns of a rounded-square
// spiral wound from the chip outward, a die-cut edge just outside the last turn, and
// turns past the target wound outside that edge.

const EDGE = 12; // die-cut edge inset; the 12 around it is room for spilled turns
const EDGE_R = 16.7; // 22% of the edge's side
const OUTER = 15; // inset of the last target turn
const BAND = 23; // from the last turn in to the innermost one, which clears the chip
const JOG_Y = 54; // where each turn steps out to the next, on the left side
const BRIDGE_Y = 46;
const CHIP = 43; // chip spans 43..57

export type Turn = { d: string; lit: boolean; spill: boolean };
export type Edge = "etch" | "trace" | "ink" | "short";

function turnPath(a: number, next: number) {
  const b = 100 - a;
  const r = Math.max(EDGE_R - (a - EDGE), 1.5);
  const arc = (x: number, y: number) => `A${r} ${r} 0 0 1 ${x} ${y}`;
  // Up the left side, clockwise round, back up the left side, then jog out to `next`.
  return (
    `M${a} ${JOG_Y}V${a + r}${arc(a + r, a)}H${b - r}${arc(b, a + r)}V${b - r}` +
    `${arc(b - r, b)}H${a + r}${arc(a, b - r)}V${JOG_Y + (a - next)}L${next} ${JOG_Y}`
  );
}

export function coil(kind: Kind, target: number, count: number) {
  const pitch = target > 1 ? Math.min(BAND / (target - 1), 9) : 0;
  const spillPitch = Math.min(pitch || 3, 3);
  const room = Math.floor((EDGE - 1.5) / spillPitch);
  // One turn past the count is always drawn (unlit), so hover can preview it.
  const spilled = Math.min(Math.max(count + 1 - target, 0), room);
  const insets = [
    ...Array.from({ length: target }, (_, k) => OUTER + (target - 1 - k) * pitch),
    ...Array.from({ length: spilled }, (_, j) => EDGE - (j + 1) * spillPitch),
  ];

  // The last drawn turn ends in a short tail to the bridge: inside the edge unless it spilled.
  // The unlit preview turn past the target isn't drawn at rest, so nothing connects to it.
  const shown = Math.max(target, Math.min(count, target + room));
  const tail = (i: number) => Math.max(insets[i] - Math.min(pitch || 2, 2), i < target ? EDGE + 0.6 : 0.8);
  const ends = insets.map((_, i) => (i + 1 < shown ? insets[i + 1] : tail(i)));
  const turns: Turn[] = insets.map((a, i) => ({ d: turnPath(a, ends[i]), lit: i < count, spill: i >= target }));

  const met = onTrack(kind, count, target);
  const lastLit = Math.min(count, turns.length);
  return {
    turns,
    lit: lastLit,
    // The lit turns as one path, for the current that runs along them.
    current: turns
      .slice(0, lastLit)
      .map((t, i) => (i ? t.d.replace(/^M[^V]+/, "") : t.d))
      .join(""),
    // Traces scale with pitch: a large target still reads as separate turns, and a target
    // of one to three turns carries about the same ink as a full coil beside it.
    stroke: { lit: Math.min(2.6, (pitch || 6) * 0.45), unlit: Math.min(1, (pitch || 6) * 0.22) },
    // More taps than the spill room holds: the outermost spilled turn is drawn heavier.
    heavy: count - target > room,
    chip: kind === "goal" && met,
    edge: (kind === "goal" ? (met ? "trace" : "etch") : count > target ? "short" : count === target ? "ink" : "etch") as Edge,
    // Past the target is fine for a goal and a broken limit for a limit.
    spill: (kind === "goal" ? "trace" : "short") as Exclude<Edge, "etch" | "ink">,
    edgePath: `M${EDGE + EDGE_R} ${EDGE}H${100 - EDGE - EDGE_R}A${EDGE_R} ${EDGE_R} 0 0 1 ${100 - EDGE} ${EDGE + EDGE_R}V${100 - EDGE - EDGE_R}A${EDGE_R} ${EDGE_R} 0 0 1 ${100 - EDGE - EDGE_R} ${100 - EDGE}H${EDGE + EDGE_R}A${EDGE_R} ${EDGE_R} 0 0 1 ${EDGE} ${100 - EDGE - EDGE_R}V${EDGE + EDGE_R}A${EDGE_R} ${EDGE_R} 0 0 1 ${EDGE + EDGE_R} ${EDGE}Z`,
    // A target of 0 with nothing logged draws no turns, so nothing connects to the chip.
    lead: shown ? `M${CHIP} ${JOG_Y}H${insets[0]}` : "",
    bridge: shown ? `M${ends[shown - 1]} ${JOG_Y}V${BRIDGE_Y}H${CHIP}` : "",
  };
}
