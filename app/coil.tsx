import type { CSSProperties, Ref } from "react";
import { coil } from "@/lib/coil";
import type { Kind } from "@/lib/habits";

// Static SVG of a habit's coil. No hooks, so a Server Component can render it too.
// `fresh` marks the newest lit turn for a CSS entrance; `broken` opens a gap in the outer turn.
export function Coil({
  kind,
  target,
  count,
  fresh,
  broken,
  ref,
}: {
  kind: Kind;
  target: number;
  count: number;
  fresh?: boolean;
  broken?: boolean;
  ref?: Ref<SVGSVGElement>;
}) {
  const c = coil(kind, target, count);
  return (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      className="coil__svg"
      data-edge={c.edge}
      data-spill={c.spill}
      style={{ "--w": c.stroke.lit, "--w0": c.stroke.unlit } as CSSProperties}
      aria-hidden="true"
      focusable="false"
    >
      <path className="coil__edge" d={c.edgePath} />
      {c.turns.map((t, i) => (
        <path
          key={i}
          className="coil__turn"
          d={t.d}
          pathLength={1}
          data-lit={t.lit || undefined}
          data-spill={t.spill || undefined}
          data-next={i === count || undefined}
          // Past the spill room the newest tap has no turn of its own; the outermost drawn one stands in.
          data-fresh={(fresh && i === Math.min(count, c.turns.length) - 1) || undefined}
          data-gap={(broken && i === target - 1) || undefined}
          data-heavy={(c.heavy && i === c.turns.length - 1) || undefined}
        />
      ))}
      {c.bridge && (
        <>
          <path className="coil__lead" d={c.lead} data-lit={c.chip || undefined} />
          <path className="coil__insulation" d={c.bridge} />
          <path className="coil__bridge" d={c.bridge} data-lit={c.chip || undefined} />
        </>
      )}
      <rect className="coil__chip" x="43" y="43" width="14" height="14" rx="2.5" data-lit={c.chip || undefined} />
      {c.current && (
        <>
          <path className="coil__glint" d={c.current} pathLength={1} />
          <path className="coil__pulse" d={c.current} pathLength={1} />
        </>
      )}
    </svg>
  );
}
