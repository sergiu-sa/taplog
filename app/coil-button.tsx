"use client";

import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import type { Kind } from "@/lib/habits";
import { ease, gsap, reducedMotion, useMotion, whileVisible } from "@/lib/motion";
import { Coil } from "./coil";

const HOLD = 0.45;
const GLINT_SPEED = 45; // viewBox units per second, so every coil's current moves alike

// The +1 button. A pointer has to hold it, so a thumb brushing past while scrolling logs
// nothing; Enter and Space are deliberate already and log at once.
export function CoilButton({
  label,
  kind,
  target,
  count,
  busy,
  failed,
  delay,
  describedBy,
  onFire,
}: {
  label: string;
  kind: Kind;
  target: number;
  count: number;
  busy: boolean;
  failed: boolean;
  delay: number;
  describedBy: string;
  onFire: () => void;
}) {
  const root = useRef<HTMLButtonElement>(null);
  const timer = useRef<gsap.core.Tween | null>(null);
  const [charging, setCharging] = useState(false);
  const hintId = useId();

  function start(e: PointerEvent) {
    if (!e.isPrimary || e.button !== 0 || busy) return;
    setCharging(true);
    timer.current = gsap.delayedCall(HOLD, () => {
      timer.current = null;
      setCharging(false);
      onFire();
    });
  }

  // A hold still running when the row goes away must not log.
  useEffect(() => () => void timer.current?.kill(), []);

  function stop() {
    if (!timer.current) return;
    timer.current.kill();
    timer.current = null;
    setCharging(false);
  }

  // Intro: one pulse of current along the lit turns, once per page load.
  useMotion(
    root,
    () => {
      gsap.fromTo(
        ".coil__pulse",
        { strokeDasharray: "0.2 1.2", strokeDashoffset: 0.2 },
        { strokeDashoffset: -1, duration: 0.9, delay: 0.1 + delay, ease: ease.inOut, autoRound: false },
      );
    },
    [],
  );

  // A log: the new turn draws, a field pulse leaves the edge, and a goal reached by this
  // tap sends current through every turn before the chip lights.
  const prev = useRef(count);
  useMotion(
    root,
    () => {
      const was = prev.current;
      prev.current = count;
      if (count <= was) return;
      const turn = root.current!.querySelectorAll(".coil__turn")[count - 1];
      const tl = gsap.timeline();
      if (turn) tl.fromTo(turn, { strokeDasharray: "1 1", strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7, ease: ease.out, autoRound: false });
      tl.fromTo(".coil__ring", { scale: 1, opacity: 0.9 }, { scale: 1.3, opacity: 0, duration: 0.8, ease: ease.out }, 0);
      if (kind === "goal" && was < target && count >= target) {
        tl.fromTo(
          ".coil__pulse",
          { strokeDasharray: "0.3 1.4", strokeDashoffset: 0.3 },
          { strokeDashoffset: -1, duration: 0.9, ease: ease.inOut, autoRound: false },
          0.35,
        );
        tl.from(".coil__chip", { fillOpacity: 0, duration: 0.5, ease: ease.soft }, 1);
      }
    },
    [count],
  );

  // Idle: a glint of current keeps running along the lit turns. Nothing lit, nothing runs.
  useEffect(() => {
    const glint = root.current?.querySelector<SVGPathElement>(".coil__glint");
    if (!glint || reducedMotion()) return;
    const length = glint.getTotalLength();
    gsap.set(glint, { strokeDasharray: `${Math.min(36 / length, 0.3)} 2` });
    // Written directly: dash offsets here are fractions of the path, and GSAP's CSS
    // tweens round px values unless told not to.
    return whileVisible(root.current!, (t) => {
      glint.style.strokeDashoffset = String(-(((t * GLINT_SPEED) / length + delay) % 1));
    });
  }, [count, delay]);

  return (
    <div className="habit__coil">
      <button
        ref={root}
        type="button"
        className={charging ? "coil is-charging" : "coil"}
        aria-label={label}
        // The hint too, so a screen reader says to hold (VoiceOver: double-tap and hold).
        aria-describedby={`${describedBy} ${hintId}`}
        aria-disabled={busy || undefined}
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onClick={(e) => {
          // detail 0: keyboard or assistive tech. A pointer's click comes after the hold.
          if (e.detail === 0 && !busy) onFire();
        }}
        // A held Enter repeats its click; only the first press counts.
        onKeyDown={(e) => {
          if (e.repeat) e.preventDefault();
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="coil__field" aria-hidden="true" />
        <span className="coil__ring" aria-hidden="true" />
        <Coil kind={kind} target={target} count={count} />
      </button>
      <p id={hintId} className="coil__hint" data-failed={failed || undefined}>
        {failed ? "Didn't save. Try again." : charging ? "Keep holding" : "Hold to add"}
      </p>
    </div>
  );
}
