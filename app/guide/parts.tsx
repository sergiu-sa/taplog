import type { CSSProperties, ReactNode } from "react";
import { coil } from "@/lib/coil";
import type { Kind } from "@/lib/habits";
import { PALETTE } from "@/lib/palette";

// The guide's line art: a few strokes and fills by role (g-e etch, g-i ink, g-m muted, g-t the
// habit's trace; g-f* fills), so both themes and every theme pick come from the app's tokens.
export const hue = (name: (typeof PALETTE)[number]["name"]) => PALETTE.find((c) => c.name === name)!.hex;
export const BLUE = hue("Blue");

const r22 = (w: number, h: number) => +(Math.min(w, h) * 0.22).toFixed(1);

export function Bar({ x, y, l, c = "e", w = 3 }: { x: number; y: number; l: number; c?: string; w?: number }) {
  return <path className={`g-${c}`} strokeWidth={w} d={`M${x} ${y}h${l}`} />;
}
export function Btn({ x, y, w, h = 12 }: { x: number; y: number; w: number; h?: number }) {
  return <rect className="g-fi" x={x} y={y} width={w} height={h} rx={r22(w, h)} />;
}
export function Box({ x, y, w, h, c = "e", sw = 1.4 }: { x: number; y: number; w: number; h: number; c?: string; sw?: number }) {
  return <rect className={`g-${c}`} x={x} y={y} width={w} height={h} rx={r22(w, h)} strokeWidth={sw} />;
}
export function Hair({ x = 0, y, l = 116 }: { x?: number; y: number; l?: number }) {
  return <path className="g-e" strokeWidth={1} d={`M${x} ${y}h${l}`} />;
}

// Where a finger presses: a dot in the habit's colour, and the ink ring the control's focus has.
export function Touch({ cx, cy }: { cx: number; cy: number }) {
  return <circle className="guide__touch" cx={cx} cy={cy} r={5.5} />;
}
export function Tap({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <>
      <rect className="g-i" x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx={r22(w, h) + 3} strokeWidth={1.6} />
      <Touch cx={x + w * 0.62} cy={y + h * 0.62} />
    </>
  );
}

// A sticker's field: two die-cut rings around it, as the coil's own field ring.
export function Fields({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g>
      {[1.25, 1.55].map((f, i) => {
        const d = (s * (f - 1)) / 2;
        const S = s * f;
        return <rect key={f} className="g-t" x={x - d} y={y - d} width={S} height={S} rx={+(S * 0.76 * 0.22).toFixed(1)} strokeWidth={1.4} opacity={0.75 - i * 0.35} />;
      })}
    </g>
  );
}

// A coil drawn from the app's own geometry and classes, as a group placed in a larger drawing.
// Marks under 70 units draw their turns heavier, or the turns would read as hairlines.
export function Mark({
  x,
  y,
  size,
  kind = "goal",
  target,
  count,
  color = BLUE,
  broken,
  only,
  f,
}: {
  x: number;
  y: number;
  size: number;
  kind?: Kind;
  target: number;
  count: number;
  color?: string;
  broken?: boolean;
  only?: number; // draw this turn alone, laid over the coil's previous state so it can wind in
  f?: string; // a handle for the film
}) {
  const c = coil(kind, target, count);
  const k = size < 70 ? 1.7 : 1;
  const style = { "--habit": color, "--w": c.stroke.lit * k, "--w0": c.stroke.unlit * k } as CSSProperties;
  const whole = only === undefined;
  return (
    <g className="coil__svg guide__mark" data-f={f} transform={`translate(${x} ${y}) scale(${size / 100})`} data-edge={c.edge} data-spill={c.spill} style={style}>
      {whole && <path className="coil__edge" d={c.edgePath} />}
      {c.turns.map(
        (t, i) =>
          (whole || i === only) && (
            <path key={i} className="coil__turn" d={t.d} pathLength={1} data-lit={t.lit || undefined} data-spill={t.spill || undefined} data-gap={(broken && i === target - 1) || undefined} />
          ),
      )}
      {whole && c.bridge && (
        <>
          <path className="coil__lead" d={c.lead} data-lit={c.chip || undefined} />
          <path className="coil__insulation" d={c.bridge} />
          <path className="coil__bridge" d={c.bridge} data-lit={c.chip || undefined} />
        </>
      )}
      {whole && <rect className="coil__chip" x="43" y="43" width="14" height="14" rx="2.5" data-lit={c.chip || undefined} />}
      {whole && c.current && <path className="coil__pulse" d={c.current} pathLength={1} />}
    </g>
  );
}

// A phone drawn in outline. Its screen starts at (7, 18) and is 14 narrower than the phone.
export function Phone({ children, x = 45, y = 12, w = 70, h = 136, browser }: { children: ReactNode; x?: number; y?: number; w?: number; h?: number; browser?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect className="g-i g-fg" width={w} height={h} rx={13} strokeWidth={2.2} />
      <rect className="g-fe" x={w / 2 - 9} y={6} width={18} height={5} rx={2.5} />
      <g transform="translate(7 18)">{children}</g>
      {browser && (
        <>
          <rect className="g-e" x={7} y={h - 22} width={w - 14} height={10} rx={5} strokeWidth={1.2} />
          <Bar x={13} y={h - 17} l={w - 30} w={2} />
        </>
      )}
    </g>
  );
}
